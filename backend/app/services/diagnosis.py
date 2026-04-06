from __future__ import annotations

import json
import re
from dataclasses import dataclass, field

from app.core.models import ConfidenceBand, DiagnosisResult, IncidentInput, SeverityLevel
from app.services.gemini_client import GEMINI_MODEL, get_gemini_client


@dataclass
class DiagnosisProviderResponse:
    provider_summary: str
    issue_category: str
    likely_fault: str
    confidence_score: float
    raw_ocr_text: str
    severity: SeverityLevel
    hazard_flags: list[str] = field(default_factory=list)


class DiagnosisProvider:
    def analyze(self, incident: IncidentInput) -> DiagnosisProviderResponse:
        raise NotImplementedError


_DIAGNOSIS_SYSTEM_PROMPT = """\
You are OmniTriage, an expert EV charger field-diagnostics engine.
You receive a structured incident observation and must respond with a JSON object.

Rules:
- issue_category must be ONE of: "connectivity", "hardware_risk", "software", "power", "physical_damage", "operational", "unknown"
- confidence_score must be a float 0.0-1.0
- severity must be ONE of: "low", "moderate", "high", "critical"
- hazard_flags is a list of strings; use "visible_hazard" if there is any evidence of physical damage, burning, or exposed wiring
- likely_fault should be a short, human-readable English phrase (max 10 words)
- raw_ocr_text is any error code or display text you can read from the photo (empty string if none)
- provider_summary is a 1-2 sentence narrative of your reasoning

Respond with ONLY a JSON object - no markdown, no commentary.
Schema:
{
  "provider_summary": "...",
  "issue_category": "...",
  "likely_fault": "...",
  "confidence_score": 0.0,
  "raw_ocr_text": "...",
  "severity": "...",
  "hazard_flags": []
}
"""

_VALID_CATEGORIES = {"connectivity", "hardware_risk", "software", "power", "physical_damage", "operational", "unknown"}
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


def _parse_gemini_diagnosis(raw: str) -> DiagnosisProviderResponse:
    text = re.sub(r"^```[a-z]*\n?", "", raw.strip(), flags=re.MULTILINE)
    text = re.sub(r"```$", "", text.strip())
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        return DiagnosisProviderResponse(
            provider_summary=raw[:300],
            issue_category="unknown",
            likely_fault="Unconfirmed charger issue",
            confidence_score=0.45,
            raw_ocr_text="",
            severity=SeverityLevel.MODERATE,
            hazard_flags=[],
        )

    issue_category = data.get("issue_category", "unknown")
    if issue_category not in _VALID_CATEGORIES:
        issue_category = "unknown"

    severity_raw = data.get("severity", "moderate")
    severity = SeverityLevel(severity_raw) if severity_raw in _VALID_SEVERITIES else SeverityLevel.MODERATE

    try:
        score = float(data.get("confidence_score", 0.5))
        score = max(0.0, min(1.0, score))
    except (TypeError, ValueError):
        score = 0.5

    hazard_flags = [str(flag) for flag in data.get("hazard_flags", []) if isinstance(flag, str)]

    return DiagnosisProviderResponse(
        provider_summary=str(data.get("provider_summary", ""))[:500],
        issue_category=issue_category,
        likely_fault=str(data.get("likely_fault", "Unconfirmed charger issue"))[:120],
        confidence_score=score,
        raw_ocr_text=str(data.get("raw_ocr_text", "")),
        severity=severity,
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
                import base64
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
                            data=base64.b64decode(base64.b64encode(raw_bytes).decode()),
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
            return _parse_gemini_diagnosis(response.text or "")
        except Exception as exc:  # noqa: BLE001
            heuristic = HeuristicDiagnosisProvider().analyze(incident)
            heuristic.provider_summary = (
                f"Gemini call failed ({exc!s}); using heuristic fallback. {heuristic.provider_summary}"
            )[:500]
            return heuristic


class HeuristicDiagnosisProvider(DiagnosisProvider):
    def analyze(self, incident: IncidentInput) -> DiagnosisProviderResponse:
        text = " ".join(
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

        hazard_flags: list[str] = []
        has_negative_damage_signal = any(
            signal in text
            for signal in [
                "no damage",
                "no visible damage",
                "without damage",
                "visible_damage:no",
                "visible_damage:none",
                "visible_damage:false",
            ]
        )
        has_visible_damage = any(token in text for token in ["burn", "exposed", "scorch", "water"]) or (
            bool(re.search(r"\bdamage\b", text)) and not has_negative_damage_signal
        )
        if has_visible_damage:
            hazard_flags.append("visible_hazard")
            return DiagnosisProviderResponse(
                provider_summary="Visible hazard cues detected from seeded input.",
                issue_category="hardware_risk",
                likely_fault="Visible cable or connector damage",
                confidence_score=0.93,
                raw_ocr_text=incident.error_code or "",
                severity=SeverityLevel.CRITICAL,
                hazard_flags=hazard_flags,
            )

        if any(token in text for token in ["offline", "wifi", "network", "net-01", "off-12", "red"]):
            score = 0.74 if "off-12" in text or "dim" in text else 0.88
            severity = SeverityLevel.MODERATE if score > 0.8 else SeverityLevel.HIGH
            return DiagnosisProviderResponse(
                provider_summary="Connectivity-related symptoms inferred from display and LED cues.",
                issue_category="connectivity",
                likely_fault="Charger offline or network disconnect",
                confidence_score=score,
                raw_ocr_text=incident.error_code or "",
                severity=severity,
                hazard_flags=hazard_flags,
            )

        return DiagnosisProviderResponse(
            provider_summary="Evidence is limited; issue remains partially unknown.",
            issue_category="unknown",
            likely_fault="Unconfirmed charger issue",
            confidence_score=0.52,
            raw_ocr_text=incident.error_code or "",
            severity=SeverityLevel.MODERATE,
            hazard_flags=hazard_flags,
        )


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
        internal_issue_category=response.issue_category,
        likely_fault=response.likely_fault,
        evidence_summary=(
            incident.symptom_text
            or f"Photo hint: {incident.photo_hint or 'n/a'}; OCR/error code: {incident.error_code or 'none'}."
        ),
        raw_ocr_text=response.raw_ocr_text,
        confidence_score=response.confidence_score,
        confidence_band=band,
        unknown_flag=response.issue_category == "unknown",
        severity=response.severity,
        hazard_flags=response.hazard_flags,
    )
