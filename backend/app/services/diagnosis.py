from __future__ import annotations

import json
import re
from typing import Callable

from app.core.models import (
    ClassifierMetadata,
    ConfidenceBand,
    DiagnosisResult,
    IncidentInput,
    OcrMetadata,
    SeverityLevel,
)
from app.services.diagnosis_classifier import analyze_hardware_visual_branch
from app.services.diagnosis_contracts import DiagnosisProviderResponse
from app.services.diagnosis_ocr import analyze_ocr_branch
from app.services.diagnosis_support import (
    VALID_ISSUE_TYPES,
    VALID_SEVERITIES,
    clamp_score,
    confidence_band,
    extract_visible_hazard_flags,
    infer_basic_conditions,
    infer_issue_type,
    is_probably_screenshot_evidence,
    is_probably_symptom_heavy,
    likely_fault_for,
    make_basic_conditions,
    normalize_status,
    severity_for,
    text_blob,
)
from app.services.diagnosis_symptom import analyze_symptom_branch
from app.services.gemini_client import GEMINI_MODEL, get_gemini_client


class DiagnosisProvider:
    def analyze(self, incident: IncidentInput) -> DiagnosisProviderResponse:
        raise NotImplementedError


_DIAGNOSIS_SYSTEM_PROMPT = """\
You are OmniTriage, an expert EV charger field-diagnostics engine.
You receive a structured incident observation and must respond with a JSON object.

Rules:
- issue_type must be ONE of: "no_power", "tripping_mcb_rccb", "charging_slow", "not_responding"
- confidence_score must be a float 0.0-1.0
- severity must be ONE of: "low", "moderate", "high", "critical"
- basic_conditions.main_power_supply must be ONE of: "ok", "problem", "unknown"
- basic_conditions.cable_condition must be ONE of: "ok", "problem", "unknown"
- basic_conditions.indicator_or_error_code must be ONE of: "ok", "problem", "unknown"
- hazard_flags is a list of strings; use "visible_hazard" if there is evidence of burning, exposed wiring, water ingress, or severe damage
- likely_fault should be a short, human-readable English phrase (max 12 words)
- raw_ocr_text is any error code or display text you can read from the photo (empty string if none)
- provider_summary is a 1-2 sentence narrative of your reasoning

Respond with ONLY a JSON object - no markdown, no commentary.
Schema:
{
  "provider_summary": "...",
  "issue_type": "...",
  "likely_fault": "...",
  "confidence_score": 0.0,
  "raw_ocr_text": "...",
  "severity": "...",
  "basic_conditions": {
    "main_power_supply": "unknown",
    "cable_condition": "unknown",
    "indicator_or_error_code": "unknown",
    "indicator_detail": ""
  },
  "hazard_flags": []
}
"""


def _build_diagnosis_prompt(incident: IncidentInput) -> str:
    parts: list[str] = ["## Incident observation"]
    parts.append(f"- Site: {incident.site_id}")
    if incident.charger_id:
        parts.append(f"- Charger: {incident.charger_id}")
    if incident.error_code:
        parts.append(f"- Error code / display text: {incident.error_code}")
    if incident.symptom_text:
        parts.append(f"- Symptom description: {incident.symptom_text}")
    if incident.photo_hint:
        parts.append(f"- Photo observation: {incident.photo_hint}")
    if incident.follow_up_answers:
        parts.append("- Follow-up answers:")
        for key, value in incident.follow_up_answers.items():
            parts.append(f"    {key}: {value}")
    if incident.demo_scenario_id:
        parts.append(f"- Demo scenario: {incident.demo_scenario_id}")
    return "\n".join(parts)


def heuristic_provider_response(incident: IncidentInput) -> DiagnosisProviderResponse:
    text = text_blob(incident)
    basic_conditions = infer_basic_conditions(incident)
    hazard_flags = extract_visible_hazard_flags(text, basic_conditions)
    issue_type = infer_issue_type(incident, basic_conditions)

    if issue_type == "no_power":
        score = 0.9 if basic_conditions.main_power_supply == "problem" else 0.74
    elif issue_type == "tripping_mcb_rccb":
        score = 0.91 if any(token in text for token in ["mcb", "rccb", "breaker", "trip"]) else 0.78
    elif issue_type == "charging_slow":
        score = 0.86 if any(token in text for token in ["slow", "voltage drop", "vehicle limiting"]) else 0.72
    else:
        score = 0.83 if basic_conditions.indicator_or_error_code != "unknown" else 0.68

    return DiagnosisProviderResponse(
        provider_summary="Organizer decision-tree heuristic applied to the available incident evidence.",
        issue_type=issue_type,
        likely_fault=likely_fault_for(issue_type, basic_conditions),
        confidence_score=score,
        raw_ocr_text=incident.error_code or "",
        severity=severity_for(issue_type, basic_conditions, hazard_flags, score),
        basic_conditions=basic_conditions,
        hazard_flags=hazard_flags,
        diagnosis_source="organizer_heuristic",
        branch_name="heuristic_fallback",
    )


def _parse_gemini_diagnosis(raw: str) -> DiagnosisProviderResponse:
    text = re.sub(r"^```[a-z]*\n?", "", raw.strip(), flags=re.MULTILINE)
    text = re.sub(r"```$", "", text.strip())
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        fallback_conditions = make_basic_conditions()
        return DiagnosisProviderResponse(
            provider_summary=raw[:300],
            issue_type="not_responding",
            likely_fault="Unconfirmed charger issue",
            confidence_score=0.45,
            raw_ocr_text="",
            severity=SeverityLevel.MODERATE,
            basic_conditions=fallback_conditions,
            hazard_flags=[],
            diagnosis_source="gemini_parse_error",
            branch_name="gemini_provider",
        )

    issue_type_raw = str(data.get("issue_type", "not_responding"))
    issue_type = issue_type_raw if issue_type_raw in VALID_ISSUE_TYPES else "not_responding"

    severity_raw = data.get("severity", "moderate")
    severity = SeverityLevel(severity_raw) if severity_raw in VALID_SEVERITIES else SeverityLevel.MODERATE

    try:
        score = clamp_score(float(data.get("confidence_score", 0.5)))
    except (TypeError, ValueError):
        score = 0.5

    basic_raw = data.get("basic_conditions", {})
    if not isinstance(basic_raw, dict):
        basic_raw = {}
    basic_conditions = make_basic_conditions(
        main_power_supply=normalize_status(basic_raw.get("main_power_supply")),
        cable_condition=normalize_status(basic_raw.get("cable_condition")),
        indicator_or_error_code=normalize_status(basic_raw.get("indicator_or_error_code")),
        indicator_detail=str(basic_raw.get("indicator_detail", "")),
    )

    hazard_flags = [str(flag) for flag in data.get("hazard_flags", []) if isinstance(flag, str)]

    return DiagnosisProviderResponse(
        provider_summary=str(data.get("provider_summary", ""))[:500],
        issue_type=issue_type,  # type: ignore[arg-type]
        likely_fault=str(data.get("likely_fault", "Unconfirmed charger issue"))[:120],
        confidence_score=score,
        raw_ocr_text=str(data.get("raw_ocr_text", "")),
        severity=severity,
        basic_conditions=basic_conditions,
        hazard_flags=hazard_flags,
        diagnosis_source="gemini_multimodal",
        branch_name="gemini_provider",
    )


class GeminiDiagnosisProvider(DiagnosisProvider):
    def analyze(self, incident: IncidentInput) -> DiagnosisProviderResponse:
        client = get_gemini_client()
        if client is None:
            return HeuristicDiagnosisProvider().analyze(incident)

        try:
            from google.genai import types as genai_types  # type: ignore[import-untyped]
            from app.services.diagnosis_classifier import _resolve_photo_path

            prompt_text = _build_diagnosis_prompt(incident)
            contents: list[object] = [prompt_text]

            if incident.photo_evidence and incident.photo_evidence.storage_path:
                photo_path = _resolve_photo_path(incident)
                if photo_path is not None and photo_path.exists():
                    raw_bytes = photo_path.read_bytes()
                    contents.insert(
                        0,
                        genai_types.Part.from_bytes(
                            data=raw_bytes,
                            mime_type=incident.photo_evidence.media_type,
                        ),
                    )

            response = client.models.generate_content(  # type: ignore[attr-defined]
                model=GEMINI_MODEL,
                contents=contents,
                config=genai_types.GenerateContentConfig(
                    system_instruction=_DIAGNOSIS_SYSTEM_PROMPT,
                    temperature=0.1,
                    max_output_tokens=512,
                ),
            )
            parsed = _parse_gemini_diagnosis(response.text or "")
            if parsed.basic_conditions == make_basic_conditions():
                heuristic = heuristic_provider_response(incident)
                parsed.basic_conditions = heuristic.basic_conditions
                if parsed.likely_fault == "Unconfirmed charger issue":
                    parsed.likely_fault = heuristic.likely_fault
            return parsed
        except Exception as exc:  # noqa: BLE001
            heuristic = HeuristicDiagnosisProvider().analyze(incident)
            heuristic.provider_summary = (
                f"Gemini call failed ({exc!s}); using heuristic fallback. {heuristic.provider_summary}"
            )[:500]
            heuristic.diagnosis_source = "gemini_fallback_heuristic"
            return heuristic


class HeuristicDiagnosisProvider(DiagnosisProvider):
    def analyze(self, incident: IncidentInput) -> DiagnosisProviderResponse:
        return heuristic_provider_response(incident)


class BranchOrchestratingDiagnosisProvider(DiagnosisProvider):
    def analyze(self, incident: IncidentInput) -> DiagnosisProviderResponse:
        providers: list[tuple[str, Callable[[IncidentInput], DiagnosisProviderResponse]]] = []
        if is_probably_screenshot_evidence(incident):
            providers.append(("ocr_text_branch", analyze_ocr_branch))
        if is_probably_symptom_heavy(incident) or not incident.photo_evidence:
            providers.append(("symptom_multimodal_branch", analyze_symptom_branch))
        if incident.photo_evidence and not is_probably_screenshot_evidence(incident):
            providers.append(("hardware_visual_branch", analyze_hardware_visual_branch))

        if not providers:
            providers.append(("symptom_multimodal_branch", analyze_symptom_branch))

        errors: list[str] = []
        for branch_name, provider in providers:
            try:
                return provider(incident)
            except Exception as exc:  # noqa: BLE001
                errors.append(f"{branch_name}: {exc!s}")

        fallback_provider = GeminiDiagnosisProvider() if get_gemini_client() is not None else HeuristicDiagnosisProvider()
        fallback = fallback_provider.analyze(incident)
        if errors:
            fallback.provider_summary = (
                f"Branch providers unavailable ({'; '.join(errors)}). {fallback.provider_summary}"
            )[:500]
        if fallback.branch_name == "heuristic_fallback":
            fallback.branch_name = "branch_orchestrator_fallback"
        return fallback


def run_diagnosis(incident: IncidentInput, provider: DiagnosisProvider | None = None) -> DiagnosisResult:
    if provider is None:
        provider = BranchOrchestratingDiagnosisProvider()
    response = provider.analyze(incident)
    band = confidence_band(response.confidence_score)
    return DiagnosisResult(
        raw_provider_output=response.provider_summary,
        issue_type=response.issue_type,
        likely_fault=response.likely_fault,
        evidence_summary=(
            incident.symptom_text
            or f"Photo hint: {incident.photo_hint or 'n/a'}; OCR/error code: {incident.error_code or 'none'}."
        ),
        basic_conditions=response.basic_conditions,
        raw_ocr_text=response.raw_ocr_text,
        confidence_score=response.confidence_score,
        confidence_band=band,
        unknown_flag=any(
            status == "unknown"
            for status in [
                response.basic_conditions.main_power_supply,
                response.basic_conditions.cable_condition,
                response.basic_conditions.indicator_or_error_code,
            ]
        ),
        severity=response.severity,
        hazard_flags=response.hazard_flags,
        diagnosis_source=response.diagnosis_source,
        branch_name=response.branch_name,
        resolver_hint_final=response.resolver_hint_final,
        next_question_hint=response.next_question_hint,
        next_action_hint=response.next_action_hint,
        classifier_metadata=ClassifierMetadata.model_validate(response.classifier_metadata)
        if response.classifier_metadata
        else None,
        ocr_metadata=OcrMetadata.model_validate(response.ocr_metadata) if response.ocr_metadata else None,
    )


__all__ = [
    "BranchOrchestratingDiagnosisProvider",
    "DiagnosisProvider",
    "GeminiDiagnosisProvider",
    "HeuristicDiagnosisProvider",
    "heuristic_provider_response",
    "infer_basic_conditions",
    "infer_issue_type",
    "run_diagnosis",
]
