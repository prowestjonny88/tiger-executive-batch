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
    KnownCaseHit,
    ResolverTier,
    RetrievalMetadata,
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


def _hazard_flags(
    hazard_level: HazardLevel,
    incident: IncidentInput,
    known_case_fault: str | None,
    known_case_abnormalities: list[str] | None = None,
) -> list[str]:
    flags: list[str] = []
    if hazard_level == "high":
        flags.append("high_hazard")
    text = build_incident_text(incident).lower()
    if any(token in text for token in ["burn", "melt", "exposed", "illegal wiring", "shock", "smell"]):
        flags.append("visible_hazard")
    if known_case_fault and "ground" in known_case_fault:
        flags.append("grounding_risk")
    if known_case_abnormalities:
        flags.extend(item.strip() for item in known_case_abnormalities if item.strip())
    return sorted(set(flags))


def _has_explicit_visual_hazard(incident: IncidentInput) -> bool:
    text = build_incident_text(incident).lower()
    return any(token in text for token in ["burn", "melt", "exposed", "illegal wiring", "shock", "smell"])


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


_HAZARD_RANK: dict[HazardLevel, int] = {"low": 0, "medium": 1, "high": 2}


def _max_hazard_level(*levels: str | None) -> HazardLevel:
    best: HazardLevel = "low"
    for level in levels:
        normalized = str(level or "").strip().lower()
        if normalized in _HAZARD_RANK and _HAZARD_RANK[normalized] > _HAZARD_RANK[best]:
            best = normalized  # type: ignore[assignment]
    return best


def _retrieval_is_strong(known_case_hit: KnownCaseHit | None, retrieval_metadata: RetrievalMetadata | None) -> bool:
    if known_case_hit is None or retrieval_metadata is None:
        return False
    return retrieval_metadata.match_state in {"exact_filename", "accepted"} and known_case_hit.match_score >= 0.75


def _build_confidence_reasoning(
    diagnosis_source: str,
    retrieval_metadata: RetrievalMetadata | None,
    known_case_hit: KnownCaseHit | None,
    used_gemini: bool,
) -> str:
    parts: list[str] = []
    if known_case_hit is not None:
        parts.append(
            f"Accepted known-case match {known_case_hit.canonical_file_name} "
            f"at {known_case_hit.match_score:.2f} via {known_case_hit.match_reason}."
        )
    elif retrieval_metadata and retrieval_metadata.selected_score is not None:
        threshold = f"{retrieval_metadata.rejection_threshold:.2f}" if retrieval_metadata.rejection_threshold is not None else "n/a"
        parts.append(
            "No known case was accepted; "
            f"best retrieval score was {retrieval_metadata.selected_score:.2f} "
            f"with state {retrieval_metadata.match_state} against threshold {threshold}."
        )
    else:
        parts.append("No known-case retrieval signal was available.")

    if used_gemini:
        if diagnosis_source == "gemini_vlm_primary":
            parts.append("Gemini provided the primary structured diagnosis.")
        else:
            parts.append("Gemini was used to enrich the accepted retrieval result.")
    else:
        parts.append("Deterministic retrieval and fallback policy determined the diagnosis.")
    return " ".join(parts)


class GeminiDiagnosisProvider:
    def analyze(self, incident: IncidentInput) -> dict[str, Any]:
        client = get_gemini_client()
        if client is None:
            raise RuntimeError("Gemini client unavailable")

        try:
            from google.genai import types as genai_types  # type: ignore[import-untyped]
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("google-genai not installed") from exc

        prompt = (
            "You are an EV charger diagnostic engine. Analyse the incident and return a JSON object.\n"
            "The JSON must have exactly these keys:\n"
            '  issue_family: one of no_power, tripping, charging_slow, not_responding, unknown_mixed\n'
            '  fault_type: short phrase (under 10 words)\n'
            '  evidence_summary: one sentence describing what the evidence shows\n'
            '  hazard_level: one of low, medium, high\n'
            '  required_proof_next: one sentence describing the next piece of evidence needed\n'
            '  resolver_tier_hint: one of driver, local_site, remote_ops, technician\n\n'
            f"site_id: {incident.site_id}\n"
            f"charger_id: {incident.charger_id or ''}\n"
            f"photo_hint: {incident.photo_hint or ''}\n"
            f"symptom_text: {incident.symptom_text or ''}\n"
            f"error_code: {incident.error_code or ''}\n"
            f"follow_up_answers: {json.dumps(incident.follow_up_answers)}\n"
        )

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
                max_output_tokens=2048,
                response_mime_type="application/json",
            ),
        )
        raw = (response.text or "").strip()
        # Strip markdown fences if the model adds them despite response_mime_type
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw.strip())
        return json.loads(raw)


def run_diagnosis_with_debug(
    incident: IncidentInput,
    provider: GeminiDiagnosisProvider | None = None,
) -> tuple[DiagnosisResult, dict[str, Any]]:
    evidence_type = infer_evidence_type(incident)
    query_text = build_incident_text(incident)
    image_filename = incident.photo_evidence.filename if incident.photo_evidence else None
    known_case_hit, retrieval_metadata = retrieve_known_case(
        RetrievalQuery(
            text=query_text or incident.site_id,
            evidence_type=evidence_type,
            image_filename=image_filename,
            image_storage_path=incident.photo_evidence.storage_path if incident.photo_evidence else None,
        )
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

    strong_retrieval = _retrieval_is_strong(known_case_hit, retrieval_metadata)
    default_summary = incident.symptom_text or incident.photo_hint or "Limited evidence provided."

    if strong_retrieval and known_case_hit is not None:
        issue_family = known_case_hit.issue_family
        fault_type = known_case_hit.fault_type
        evidence_summary = known_case_hit.visual_observation or default_summary
        hazard_level = known_case_hit.hazard_level
        resolver_tier = known_case_hit.resolver_tier
        required_proof_next = known_case_hit.required_proof_next
        diagnosis_source = "round1_package_retrieval"
        branch_name = "round1_package_retrieval"

        if vlm_payload:
            vlm_issue_family = str(vlm_payload.get("issue_family") or "").strip()
            if vlm_issue_family == issue_family:
                if fault_type == "unknown_fault" and vlm_payload.get("fault_type"):
                    fault_type = str(vlm_payload["fault_type"])
                evidence_summary = str(vlm_payload.get("evidence_summary") or evidence_summary)
                hazard_level = _max_hazard_level(hazard_level, str(vlm_payload.get("hazard_level") or ""))
                if not required_proof_next:
                    required_proof_next = vlm_payload.get("required_proof_next") or required_proof_next
                branch_name = "retrieval_enriched_by_gemini"
    elif vlm_payload:
        issue_family = str(vlm_payload.get("issue_family") or inferred_issue_family)
        fault_type = str(vlm_payload.get("fault_type") or (known_case_hit.fault_type if known_case_hit else "unknown_fault"))
        evidence_summary = str(vlm_payload.get("evidence_summary") or (known_case_hit.visual_observation if known_case_hit else default_summary))
        hazard_level = _max_hazard_level(
            str(vlm_payload.get("hazard_level") or ""),
            known_case_hit.hazard_level if known_case_hit else None,
        )
        resolver_tier = str(vlm_payload.get("resolver_tier_hint") or _fallback_resolver(issue_family, hazard_level))
        required_proof_next = vlm_payload.get("required_proof_next") or (known_case_hit.required_proof_next if known_case_hit else None)
        diagnosis_source = "gemini_vlm_primary"
        branch_name = "gemini_vlm_primary"
    elif known_case_hit is not None:
        issue_family = known_case_hit.issue_family
        fault_type = known_case_hit.fault_type
        evidence_summary = known_case_hit.visual_observation or default_summary
        hazard_level = known_case_hit.hazard_level
        resolver_tier = known_case_hit.resolver_tier
        required_proof_next = known_case_hit.required_proof_next
        diagnosis_source = "round1_package_retrieval"
        branch_name = "round1_package_retrieval"
    else:
        issue_family = inferred_issue_family
        fault_type = "unknown_fault"
        evidence_summary = default_summary
        hazard_level = "medium"
        resolver_tier = _fallback_resolver(issue_family, hazard_level)
        required_proof_next = None
        diagnosis_source = "heuristic_policy_fallback"
        branch_name = "heuristic_policy_fallback"

    match_score = known_case_hit.match_score if known_case_hit else 0.35
    score = max(match_score, 0.42 if vlm_payload else 0.32)
    if _looks_ambiguous(query_text.lower()) and evidence_type in {"symptom_report", "unknown"}:
        issue_family = "unknown_mixed"
        known_case_hit = None
        hazard_level = "medium"
        score = min(score, 0.48)
        diagnosis_source = "heuristic_policy_fallback"
        branch_name = "heuristic_policy_fallback"
    elif diagnosis_source == "heuristic_policy_fallback" and inferred_issue_family != "unknown_mixed":
        score = max(score, 0.56)
    if _has_explicit_visual_hazard(incident):
        hazard_level = "high"
        score = max(score, 0.78)
    if issue_family == "unknown_mixed":
        score = min(score, 0.58)
    if evidence_type == "screenshot" and extract_raw_ocr_text(incident):
        score = max(score, 0.76)
    band = _confidence_band(score)
    unknown_flag = issue_family == "unknown_mixed" or score < 0.55
    requires_follow_up = unknown_flag or not required_proof_next

    hazard_flags = _hazard_flags(
        hazard_level,
        incident,
        known_case_hit.fault_type if known_case_hit else fault_type,
        known_case_hit.visible_abnormalities if known_case_hit else None,
    )

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
        branch_name=branch_name,
        hazard_flags=hazard_flags,
        known_case_hit=known_case_hit,
        retrieval_metadata=retrieval_metadata,
        confidence_reasoning=_build_confidence_reasoning(diagnosis_source, retrieval_metadata, known_case_hit, vlm_payload is not None),
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
