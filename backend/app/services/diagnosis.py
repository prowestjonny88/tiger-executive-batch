from __future__ import annotations

import json
import logging
import re
import time
from pathlib import Path
from typing import Any

from app.core.models import (
    ConfidenceBand,
    DiagnosisResult,
    EvidenceType,
    HazardLevel,
    IncidentInput,
    ResolverTier,
)
from app.services.gemini_client import GEMINI_MODEL, get_gemini_client
from app.services.known_case_retrieval import RetrievalQuery, retrieve_known_case

logger = logging.getLogger(__name__)


def build_incident_text(incident: IncidentInput) -> str:
    parts = [
        incident.photo_hint or "",
        incident.symptom_text or "",
        incident.error_code or "",
        " ".join(f"{key} {value}" for key, value in incident.follow_up_answers.items()),
    ]
    return " ".join(part for part in parts if part).strip()


def infer_evidence_type(incident: IncidentInput) -> EvidenceType:
    text = build_incident_text(incident).lower()
    screenshot_tokens = [
        "wc apps",
        "screenshot",
        "screen capture",
        "error logs",
        "faulted",
        "over-voltage",
        "app screen",
    ]
    symptom_tokens = ["no pulse", "not charging", "no display", "screen off", "not responding", "frozen"]

    if any(token in text for token in screenshot_tokens):
        return "screenshot"
    if incident.photo_evidence and any(token in text for token in symptom_tokens):
        return "symptom_heavy_photo"
    if incident.photo_evidence:
        return "hardware_photo"
    if incident.symptom_text or incident.error_code:
        return "symptom_report"
    return "unknown"


def infer_issue_family(incident: IncidentInput) -> str:
    text = build_incident_text(incident).lower()
    if any(token in text for token in ["mcb", "rccb", "trip", "breaker"]):
        return "tripping"
    if any(token in text for token in ["slow", "reduced output", "vehicle limitation", "voltage drop"]):
        return "charging_slow"
    if any(token in text for token in ["no power", "no pulse", "lights off", "display off", "dead"]):
        return "no_power"
    if any(token in text for token in ["faulted", "frozen", "not responding", "error log", "app"]):
        return "not_responding"
    return "unknown_mixed"


def _looks_ambiguous(text: str) -> bool:
    ambiguous_tokens = ["unclear", "not sure", "no clear", "unknown", "details are limited", "cannot confirm", "insufficient evidence"]
    return any(token in text for token in ambiguous_tokens)


def extract_raw_ocr_text(incident: IncidentInput) -> str | None:
    if incident.error_code:
        return incident.error_code
    text = " ".join([incident.photo_hint or "", incident.symptom_text or ""])
    match = re.search(r"(faulted|over-?voltage fault|ui-\d+|trip-\d+|slow-\d+)", text, flags=re.IGNORECASE)
    return match.group(1) if match else None


def _follow_up_prompts(issue_family: str, evidence_type: EvidenceType, known_case_required_proof: str | None) -> list[dict[str, str]]:
    prompts: list[dict[str, str]] = []
    if evidence_type in {"symptom_report", "unknown"}:
        prompts.append({"question_id": "photo_request", "prompt": "Capture a wider photo of the charger and upstream power path."})
    if issue_family == "unknown_mixed":
        prompts.append({"question_id": "power_context", "prompt": "Confirm whether upstream power and isolator state have been checked."})
    if known_case_required_proof:
        prompts.append({"question_id": "required_proof_next", "prompt": known_case_required_proof})
    return prompts[:3]


def _hazard_flags(hazard_level: HazardLevel, incident: IncidentInput, known_case_fault: str | None) -> list[str]:
    flags: list[str] = []
    if hazard_level == "high":
        flags.append("high_hazard")
    text = build_incident_text(incident).lower()
    if any(token in text for token in ["burn", "melt", "exposed", "illegal wiring", "shock", "smell"]):
        flags.append("visible_hazard")
    if known_case_fault and "ground" in known_case_fault:
        flags.append("grounding_risk")
    return sorted(set(flags))


def _confidence_band(score: float) -> ConfidenceBand:
    if score >= 0.8:
        return ConfidenceBand.HIGH
    if score >= 0.55:
        return ConfidenceBand.MEDIUM
    return ConfidenceBand.LOW


def _fallback_resolver(issue_family: str, hazard_level: HazardLevel) -> ResolverTier:
    if hazard_level == "high":
        return "technician"
    if issue_family == "unknown_mixed":
        return "remote_ops"
    if issue_family == "tripping":
        return "local_site"
    if issue_family == "no_power":
        return "driver"
    return "remote_ops"


class GeminiDiagnosisProvider:
    def analyze(self, incident: IncidentInput) -> dict[str, Any]:
        client = get_gemini_client()
        if client is None:
            raise RuntimeError("Gemini client unavailable")

        try:
            from google.genai import types as genai_types  # type: ignore[import-untyped]
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("google-genai not installed") from exc

        prompt = f"""Return JSON only.
Schema:
{{
  "issue_family": "no_power|tripping|charging_slow|not_responding|unknown_mixed",
  "fault_type": "short phrase",
  "evidence_summary": "short summary",
  "hazard_level": "low|medium|high",
  "required_proof_next": "short instruction",
  "resolver_tier_hint": "driver|local_site|remote_ops|technician"
}}

Incident:
- site_id: {incident.site_id}
- charger_id: {incident.charger_id or ""}
- photo_hint: {incident.photo_hint or ""}
- symptom_text: {incident.symptom_text or ""}
- error_code: {incident.error_code or ""}
- follow_up_answers: {json.dumps(incident.follow_up_answers)}
"""

        contents: list[object] = [prompt]
        if incident.photo_evidence:
            candidate = Path(__file__).resolve().parents[2] / incident.photo_evidence.storage_path
            if candidate.exists():
                contents.insert(
                    0,
                    genai_types.Part.from_bytes(
                        data=candidate.read_bytes(),
                        mime_type=incident.photo_evidence.media_type,
                    ),
                )

        response = client.models.generate_content(  # type: ignore[attr-defined]
            model=GEMINI_MODEL,
            contents=contents,
            config=genai_types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=512,
            ),
        )
        raw = (response.text or "").strip()
        raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.MULTILINE)
        raw = re.sub(r"```$", "", raw.strip())
        return json.loads(raw)


def run_diagnosis_with_debug(
    incident: IncidentInput,
    provider: GeminiDiagnosisProvider | None = None,
) -> tuple[DiagnosisResult, dict[str, Any]]:
    evidence_type = infer_evidence_type(incident)
    query_text = build_incident_text(incident)
    image_filename = incident.photo_evidence.filename if incident.photo_evidence else None
    known_case_hit, retrieval_metadata = retrieve_known_case(
        RetrievalQuery(text=query_text or incident.site_id, evidence_type=evidence_type, image_filename=image_filename)
    )
    inferred_issue_family = infer_issue_family(incident)

    vlm_payload: dict[str, Any] | None = None
    raw_provider_output = "Round 1 retrieval fallback"
    diagnosis_source = "round1_package_retrieval"
    gemini_started_at = time.perf_counter()
    gemini_attempted = True
    gemini_succeeded = False
    gemini_error: str | None = None
    if provider is None:
        provider = GeminiDiagnosisProvider()
    try:
        vlm_payload = provider.analyze(incident)
        raw_provider_output = json.dumps(vlm_payload)
        diagnosis_source = "gemini_vlm_retrieval"
        gemini_succeeded = True
    except Exception as exc:
        gemini_error = str(exc)
        raw_provider_output = f"Gemini unavailable or failed; using Round 1 retrieval fallback. Error: {exc}"

    issue_family = (vlm_payload or {}).get("issue_family") or (known_case_hit.issue_family if known_case_hit else inferred_issue_family)
    fault_type = (vlm_payload or {}).get("fault_type") or (known_case_hit.fault_type if known_case_hit else "unknown_fault")
    evidence_summary = (vlm_payload or {}).get("evidence_summary") or (
        known_case_hit.visual_observation if known_case_hit else (incident.symptom_text or incident.photo_hint or "Limited evidence provided.")
    )
    hazard_level = (vlm_payload or {}).get("hazard_level") or (known_case_hit.hazard_level if known_case_hit else "medium")
    resolver_tier = (vlm_payload or {}).get("resolver_tier_hint") or (known_case_hit.resolver_tier if known_case_hit else _fallback_resolver(issue_family, hazard_level))
    required_proof_next = (vlm_payload or {}).get("required_proof_next") or (known_case_hit.required_proof_next if known_case_hit else None)

    match_score = known_case_hit.match_score if known_case_hit else 0.35
    if known_case_hit and known_case_hit.issue_family == "unknown_mixed" and inferred_issue_family != "unknown_mixed" and match_score < 0.75:
        issue_family = inferred_issue_family
    if (
        known_case_hit
        and evidence_type == "symptom_report"
        and known_case_hit.evidence_type not in {"symptom_report", "screenshot"}
        and inferred_issue_family != "unknown_mixed"
        and match_score < 0.9
    ):
        issue_family = inferred_issue_family
        fault_type = "unknown_fault" if fault_type == known_case_hit.fault_type else fault_type
        resolver_tier = _fallback_resolver(issue_family, hazard_level)
    score = max(match_score, 0.42 if vlm_payload else 0.32)
    if _looks_ambiguous(query_text.lower()) and evidence_type in {"symptom_report", "unknown"}:
        issue_family = "unknown_mixed"
        known_case_hit = None
        hazard_level = "medium"
        score = min(score, 0.48)
    if issue_family == "unknown_mixed":
        score = min(score, 0.58)
    if evidence_type == "screenshot" and extract_raw_ocr_text(incident):
        score = max(score, 0.76)
    band = _confidence_band(score)
    unknown_flag = issue_family == "unknown_mixed" or score < 0.55
    requires_follow_up = unknown_flag or not required_proof_next

    hazard_flags = _hazard_flags(hazard_level, incident, known_case_hit.fault_type if known_case_hit else fault_type)

    if issue_family == "unknown_mixed" and hazard_level != "high":
        resolver_tier = "remote_ops"
    elif hazard_level == "high":
        resolver_tier = "technician"

    diagnosis = DiagnosisResult(
        raw_provider_output=raw_provider_output,
        issue_family=issue_family,  # type: ignore[arg-type]
        fault_type=fault_type,
        evidence_type=evidence_type,
        hazard_level=hazard_level,  # type: ignore[arg-type]
        resolver_tier=resolver_tier,  # type: ignore[arg-type]
        likely_fault=fault_type.replace("_", " ").strip() or "Unknown fault",
        evidence_summary=evidence_summary,
        required_proof_next=required_proof_next,
        raw_ocr_text=extract_raw_ocr_text(incident),
        confidence_score=score,
        confidence_band=band,
        unknown_flag=unknown_flag,
        requires_follow_up=requires_follow_up,
        follow_up_prompts=_follow_up_prompts(issue_family, evidence_type, required_proof_next),
        diagnosis_source=diagnosis_source,
        branch_name="round1_vlm_retrieval",
        hazard_flags=hazard_flags,
        known_case_hit=known_case_hit,
        retrieval_metadata=retrieval_metadata,
        confidence_reasoning=(
            "Known-case retrieval and VLM context aligned."
            if vlm_payload and known_case_hit
            else "Known-case retrieval provided the primary diagnosis signal."
            if known_case_hit
            else "Evidence did not strongly match a known case; using taxonomy-safe fallback."
        ),
    )

    gemini_attempt = {
        "attempted": gemini_attempted,
        "succeeded": gemini_succeeded,
        "model": GEMINI_MODEL,
        "latency_ms": round((time.perf_counter() - gemini_started_at) * 1000, 2),
        "error": gemini_error,
        "incident_id": incident.incident_id,
        "site_id": incident.site_id,
        "charger_id": incident.charger_id,
        "diagnosis_source": diagnosis.diagnosis_source,
        "issue_family": diagnosis.issue_family,
        "resolver_tier": diagnosis.resolver_tier,
        "evidence_type": diagnosis.evidence_type,
        "has_photo_evidence": incident.photo_evidence is not None,
        "known_case_selected": retrieval_metadata.selected_case if retrieval_metadata else None,
        "retrieval_provider": retrieval_metadata.provider_name if retrieval_metadata else None,
        "retrieval_mode": retrieval_metadata.provider_mode if retrieval_metadata else None,
    }
    logger.info(json.dumps({"event": "triage_gemini_attempt", **gemini_attempt}))
    return diagnosis, gemini_attempt


def run_diagnosis(incident: IncidentInput, provider: GeminiDiagnosisProvider | None = None) -> DiagnosisResult:
    diagnosis, _ = run_diagnosis_with_debug(incident, provider=provider)
    return diagnosis


__all__ = [
    "GeminiDiagnosisProvider",
    "build_incident_text",
    "extract_raw_ocr_text",
    "infer_evidence_type",
    "infer_issue_family",
    "run_diagnosis",
    "run_diagnosis_with_debug",
]
