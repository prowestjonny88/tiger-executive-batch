from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

from app.core.models import (
    BasicCheckStatus,
    BasicConditionsAssessment,
    ConfidenceBand,
    DiagnosisResult,
    IncidentInput,
    IssueType,
    SeverityLevel,
)
from app.services.gemini_client import GEMINI_MODEL, get_gemini_client


@dataclass
class DiagnosisProviderResponse:
    provider_summary: str
    issue_type: IssueType
    likely_fault: str
    confidence_score: float
    raw_ocr_text: str
    severity: SeverityLevel
    basic_conditions: BasicConditionsAssessment
    hazard_flags: list[str] = field(default_factory=list)


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

_VALID_ISSUE_TYPES = {"no_power", "tripping_mcb_rccb", "charging_slow", "not_responding"}
_VALID_STATUSES = {"ok", "problem", "unknown"}
_VALID_SEVERITIES = {severity.value for severity in SeverityLevel}


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


def _normalize_status(value: object) -> BasicCheckStatus:
    normalized = str(value or "unknown").strip().lower().replace(" ", "_")
    if normalized in _VALID_STATUSES:
        return normalized  # type: ignore[return-value]
    return "unknown"


def _make_basic_conditions(
    main_power_supply: BasicCheckStatus = "unknown",
    cable_condition: BasicCheckStatus = "unknown",
    indicator_or_error_code: BasicCheckStatus = "unknown",
    indicator_detail: str | None = None,
) -> BasicConditionsAssessment:
    detail = indicator_detail.strip() if indicator_detail else None
    return BasicConditionsAssessment(
        main_power_supply=main_power_supply,
        cable_condition=cable_condition,
        indicator_or_error_code=indicator_or_error_code,
        indicator_detail=detail or None,
    )


def _text_blob(incident: IncidentInput) -> str:
    return " ".join(
        filter(
            None,
            [
                incident.photo_hint or "",
                incident.symptom_text or "",
                incident.error_code or "",
                " ".join(f"{key}:{value}" for key, value in incident.follow_up_answers.items()),
            ],
        )
    ).lower()


def _has_any(text: str, tokens: list[str]) -> bool:
    return any(token in text for token in tokens)


def infer_basic_conditions(incident: IncidentInput) -> BasicConditionsAssessment:
    text = _text_blob(incident)
    power_answer = (incident.follow_up_answers.get("main_power_supply") or "").lower()
    cable_answer = (incident.follow_up_answers.get("cable_condition") or "").lower()
    indicator_answer = (incident.follow_up_answers.get("indicator_or_error_code") or "").lower()
    main_power_supply: BasicCheckStatus = "unknown"
    cable_condition: BasicCheckStatus = "unknown"
    indicator_or_error_code: BasicCheckStatus = "unknown"

    if _has_any(power_answer, ["available", "present", "stable", "healthy", "ok", "good", "on"]) or _has_any(
        text,
        [
            "power available",
            "display on",
            "screen on",
            "screen dim",
            "indicator on",
            "mains healthy",
            "incoming voltage ok",
            "main_power_supply:ok",
            "main_power_supply:yes",
        ],
    ):
        main_power_supply = "ok"
    elif _has_any(power_answer, ["missing", "unavailable", "off", "low", "failed", "dead", "no power"]) or _has_any(
        text,
        [
            "no power",
            "power unavailable",
            "incoming voltage low",
            "incoming voltage missing",
            "lights off",
            "display off",
            "main breaker off",
            "mcb off",
            "main_power_supply:no",
            "main_power_supply:problem",
        ],
    ):
        main_power_supply = "problem"

    has_negative_damage_signal = _has_any(
        cable_answer,
        ["good", "normal", "looks normal", "secure", "no damage", "no visible damage"],
    ) or _has_any(
        text,
        [
            "no damage",
            "no visible damage",
            "without damage",
            "cable condition good",
            "cable_condition:ok",
            "cable_condition:good",
            "visible_damage:no",
            "visible_damage:false",
        ],
    )
    has_damage_signal = _has_any(
        cable_answer,
        ["loose", "hot", "warm", "damage", "overheat", "burn", "frayed"],
    ) or _has_any(
        text,
        [
            "burn",
            "exposed",
            "scorch",
            "water",
            "frayed",
            "melt",
            "loose cable",
            "overheat",
            "cable damage",
            "connector damage",
            "cable_condition:problem",
        ],
    ) or ("damage" in text and not has_negative_damage_signal)
    if has_damage_signal:
        cable_condition = "problem"
    elif has_negative_damage_signal:
        cable_condition = "ok"

    indicator_detail = incident.error_code or incident.follow_up_answers.get("indicator_or_error_code_detail", "")
    if _has_any(indicator_answer, ["no indicator", "none", "blank", "dead", "off"]) or _has_any(
        text,
        [
            "blank screen",
            "no indicator",
            "no error code",
            "indicator_or_error_code:problem",
            "screen dead",
            "display dead",
        ],
    ):
        indicator_or_error_code = "problem"
    elif indicator_answer or indicator_detail or _has_any(
        text,
        [
            "error code",
            "indicator",
            "led",
            "blink",
            "display",
            "screen",
            "indicator_or_error_code:ok",
        ],
    ):
        indicator_or_error_code = "ok"

    return _make_basic_conditions(
        main_power_supply=main_power_supply,
        cable_condition=cable_condition,
        indicator_or_error_code=indicator_or_error_code,
        indicator_detail=indicator_detail or incident.error_code,
    )


def infer_issue_type(incident: IncidentInput, basic_conditions: BasicConditionsAssessment | None = None) -> IssueType:
    text = _text_blob(incident)
    conditions = basic_conditions or infer_basic_conditions(incident)

    if _has_any(text, ["tripping", "trip", "breaker", "mcb", "rccb", "rcd"]):
        return "tripping_mcb_rccb"
    if _has_any(text, ["slow", "slower", "reduced output", "low current", "voltage drop", "vehicle limiting"]):
        return "charging_slow"
    if _has_any(text, ["not responding", "unresponsive", "frozen", "hung", "stuck", "blank screen", "reset system"]):
        return "not_responding"
    if _has_any(text, ["no power", "power off", "dead charger", "lights off", "incoming voltage", "no supply"]):
        return "no_power"

    if conditions.main_power_supply == "problem":
        return "no_power"
    if conditions.indicator_or_error_code == "problem":
        return "not_responding"
    if conditions.cable_condition == "problem":
        return "tripping_mcb_rccb"

    return "not_responding"


def _likely_fault_for(issue_type: IssueType, conditions: BasicConditionsAssessment) -> str:
    if issue_type == "no_power":
        if conditions.main_power_supply == "problem":
            return "Main supply or breaker issue"
        return "Power supply not reaching charger"
    if issue_type == "tripping_mcb_rccb":
        if conditions.cable_condition == "problem":
            return "Loose or overheated cable connection"
        return "Breaker protection is tripping"
    if issue_type == "charging_slow":
        return "Output setting or vehicle limitation"
    if conditions.indicator_or_error_code == "problem":
        return "Control board or display not responding"
    return "System needs a controlled reset"


def _severity_for(
    issue_type: IssueType,
    basic_conditions: BasicConditionsAssessment,
    hazard_flags: list[str],
    confidence_score: float,
) -> SeverityLevel:
    if hazard_flags:
        return SeverityLevel.CRITICAL
    if basic_conditions.main_power_supply == "problem" or basic_conditions.cable_condition == "problem":
        return SeverityLevel.HIGH
    if issue_type in {"tripping_mcb_rccb", "not_responding"}:
        return SeverityLevel.MODERATE
    if confidence_score >= 0.8:
        return SeverityLevel.LOW
    return SeverityLevel.MODERATE


def heuristic_provider_response(incident: IncidentInput) -> DiagnosisProviderResponse:
    text = _text_blob(incident)
    basic_conditions = infer_basic_conditions(incident)
    hazard_flags: list[str] = []
    has_visible_hazard = basic_conditions.cable_condition == "problem" and _has_any(
        text,
        ["burn", "exposed", "scorch", "water", "melt"],
    )
    if has_visible_hazard:
        hazard_flags.append("visible_hazard")

    issue_type = infer_issue_type(incident, basic_conditions)

    if issue_type == "no_power":
        score = 0.9 if basic_conditions.main_power_supply == "problem" else 0.74
    elif issue_type == "tripping_mcb_rccb":
        score = 0.91 if _has_any(text, ["mcb", "rccb", "breaker", "trip"]) else 0.78
    elif issue_type == "charging_slow":
        score = 0.86 if _has_any(text, ["slow", "voltage drop", "vehicle limiting"]) else 0.72
    else:
        score = 0.83 if basic_conditions.indicator_or_error_code != "unknown" else 0.68

    return DiagnosisProviderResponse(
        provider_summary="Organizer decision-tree heuristic applied to the available incident evidence.",
        issue_type=issue_type,
        likely_fault=_likely_fault_for(issue_type, basic_conditions),
        confidence_score=score,
        raw_ocr_text=incident.error_code or "",
        severity=_severity_for(issue_type, basic_conditions, hazard_flags, score),
        basic_conditions=basic_conditions,
        hazard_flags=hazard_flags,
    )


def _parse_gemini_diagnosis(raw: str) -> DiagnosisProviderResponse:
    text = re.sub(r"^```[a-z]*\n?", "", raw.strip(), flags=re.MULTILINE)
    text = re.sub(r"```$", "", text.strip())
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        fallback_conditions = _make_basic_conditions()
        return DiagnosisProviderResponse(
            provider_summary=raw[:300],
            issue_type="not_responding",
            likely_fault="Unconfirmed charger issue",
            confidence_score=0.45,
            raw_ocr_text="",
            severity=SeverityLevel.MODERATE,
            basic_conditions=fallback_conditions,
            hazard_flags=[],
        )

    issue_type_raw = str(data.get("issue_type", "not_responding"))
    issue_type = issue_type_raw if issue_type_raw in _VALID_ISSUE_TYPES else "not_responding"

    severity_raw = data.get("severity", "moderate")
    severity = SeverityLevel(severity_raw) if severity_raw in _VALID_SEVERITIES else SeverityLevel.MODERATE

    try:
        score = float(data.get("confidence_score", 0.5))
        score = max(0.0, min(1.0, score))
    except (TypeError, ValueError):
        score = 0.5

    basic_raw = data.get("basic_conditions", {})
    if not isinstance(basic_raw, dict):
        basic_raw = {}
    basic_conditions = _make_basic_conditions(
        main_power_supply=_normalize_status(basic_raw.get("main_power_supply")),
        cable_condition=_normalize_status(basic_raw.get("cable_condition")),
        indicator_or_error_code=_normalize_status(basic_raw.get("indicator_or_error_code")),
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
    )


class GeminiDiagnosisProvider(DiagnosisProvider):
    def analyze(self, incident: IncidentInput) -> DiagnosisProviderResponse:
        client = get_gemini_client()
        if client is None:
            return HeuristicDiagnosisProvider().analyze(incident)

        try:
            from google.genai import types as genai_types  # type: ignore[import-untyped]

            prompt_text = _build_diagnosis_prompt(incident)
            contents: list[object] = [prompt_text]

            if incident.photo_evidence and incident.photo_evidence.storage_path:
                from pathlib import Path

                from app.services.intake import UPLOAD_ROOT

                photo_path = UPLOAD_ROOT / Path(incident.photo_evidence.storage_path).name
                if not photo_path.exists():
                    photo_path = Path(__file__).resolve().parents[2] / incident.photo_evidence.storage_path
                if photo_path.exists():
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
            if parsed.basic_conditions == _make_basic_conditions():
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
            return heuristic


class HeuristicDiagnosisProvider(DiagnosisProvider):
    def analyze(self, incident: IncidentInput) -> DiagnosisProviderResponse:
        return heuristic_provider_response(incident)


def confidence_band(score: float) -> ConfidenceBand:
    if score >= 0.85:
        return ConfidenceBand.HIGH
    if score >= 0.60:
        return ConfidenceBand.MEDIUM
    return ConfidenceBand.LOW


def run_diagnosis(incident: IncidentInput, provider: DiagnosisProvider | None = None) -> DiagnosisResult:
    if provider is None:
        provider = GeminiDiagnosisProvider() if get_gemini_client() is not None else HeuristicDiagnosisProvider()
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
    )
