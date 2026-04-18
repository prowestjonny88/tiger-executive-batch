from __future__ import annotations

import json
import re
from pathlib import Path

from app.core.models import IncidentInput, PerceptionResult
from app.services.diagnosis_fallback import build_incident_text, infer_evidence_type
from app.services.gemini_client import GEMINI_MODEL, get_gemini_client
from app.services.intake import get_upload_root

_COMPONENT_TOKENS = {
    "breaker": ["breaker", "mcb", "rccb", "rcd"],
    "isolator": ["isolator", "switch"],
    "cable_termination": ["terminal", "cable", "lug", "wire", "termination"],
    "charger_display": ["display", "screen", "indicator", "ui"],
    "app_screen": ["app", "wc apps", "screenshot", "screen capture"],
    "db_board": ["db", "distribution board", "panel", "mcb row"],
}

_ABNORMALITY_TOKENS = {
    "burn_mark": ["burn", "char", "scorch"],
    "melted_plastic": ["melt", "melted", "smell"],
    "loose_termination": ["loose", "termination", "overheated lug"],
    "tripped_breaker": ["tripped", "breaker down", "mcb down"],
    "fault_status": ["faulted", "error", "over-voltage", "trip"],
}
_HIGH_HAZARD_ABNORMALITIES = {"burn_mark", "melted_plastic", "loose_termination"}


def _normalize_list(values: object) -> list[str]:
    if isinstance(values, list):
        return [str(value).strip() for value in values if str(value).strip()]
    if isinstance(values, str):
        return [part.strip() for part in values.split(";") if part.strip()]
    return []


def _contains_token(text: str, token: str) -> bool:
    normalized = re.escape(token.strip().lower()).replace(r"\ ", r"\s+")
    return re.search(rf"(?<![a-z0-9]){normalized}(?![a-z0-9])", text.lower()) is not None


def _fallback_components(text: str) -> list[str]:
    lowered = text.lower()
    components: list[str] = []
    for label, tokens in _COMPONENT_TOKENS.items():
        if any(_contains_token(lowered, token) for token in tokens):
            components.append(label)
    return components


def _fallback_abnormalities(text: str) -> list[str]:
    lowered = text.lower()
    abnormalities: list[str] = []
    for label, tokens in _ABNORMALITY_TOKENS.items():
        if any(_contains_token(lowered, token) for token in tokens):
            abnormalities.append(label)
    return abnormalities


def _fallback_ocr_findings(incident: IncidentInput) -> list[str]:
    findings: list[str] = []
    if incident.error_code:
        findings.append(incident.error_code.strip())
    combined = " ".join(part for part in [incident.photo_hint or "", incident.symptom_text or ""] if part)
    for match in re.finditer(r"\b(?:faulted|trip(?:ped)?|over-?voltage|c\d{1,3}|mcb|rccb)\b", combined, flags=re.IGNORECASE):
        findings.append(match.group(0))
    return sorted(dict.fromkeys(item for item in findings if item))


def _photo_path(incident: IncidentInput) -> Path | None:
    if not incident.photo_evidence:
        return None
    storage_path = Path(incident.photo_evidence.storage_path)
    if storage_path.is_absolute() and storage_path.exists():
        return storage_path
    candidates = [
        Path(__file__).resolve().parents[2] / incident.photo_evidence.storage_path,
        get_upload_root() / "incidents" / storage_path.name,
        Path(__file__).resolve().parents[3] / incident.photo_evidence.storage_path,
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def _call_gemini_perception(incident: IncidentInput) -> PerceptionResult | None:
    if incident.photo_evidence is None:
        return None
    client = get_gemini_client()
    if client is None:
        raise RuntimeError("gemini_client_unavailable")

    try:
        from google.genai import types as genai_types  # type: ignore[import-untyped]
    except ImportError:
        raise RuntimeError("gemini_sdk_unavailable")

    prompt = (
        "You are OmniTriage perception. Inspect the evidence image first and return JSON only.\n"
        "Use exactly these keys:\n"
        '  evidence_type: one of hardware_photo, screenshot, symptom_heavy_photo, mixed_photo\n'
        '  scene_summary: one concise sentence\n'
        '  components_visible: array of short component labels\n'
        '  visible_abnormalities: array of short abnormality labels\n'
        '  ocr_findings: array of visible text or codes\n'
        '  hazard_signals: array of hazard indicators\n'
        '  uncertainty_notes: array of uncertainty notes\n'
        '  confidence_score: number 0.0 to 1.0\n'
        f"photo_hint: {incident.photo_hint or ''}\n"
        f"symptom_text: {incident.symptom_text or ''}\n"
        f"error_code: {incident.error_code or ''}\n"
    )

    contents: list[object] = [prompt]
    image_path = _photo_path(incident)
    if image_path is None:
        raise FileNotFoundError("image_path_unresolved")
    contents.insert(
        0,
        genai_types.Part.from_bytes(
            data=image_path.read_bytes(),
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
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw.strip())
    data = json.loads(raw)

    evidence_type = str(data.get("evidence_type") or infer_evidence_type(incident))
    if evidence_type not in {"hardware_photo", "screenshot", "symptom_heavy_photo", "mixed_photo"}:
        evidence_type = infer_evidence_type(incident)

    abnormalities = _normalize_list(data.get("visible_abnormalities"))
    hazard_signals = _normalize_list(data.get("hazard_signals"))
    uncertainty_notes = _normalize_list(data.get("uncertainty_notes"))

    return PerceptionResult(
        mode="vlm",
        evidence_type=evidence_type,  # type: ignore[arg-type]
        scene_summary=str(data.get("scene_summary") or incident.photo_hint or incident.symptom_text or "Visual evidence inspected."),
        components_visible=_normalize_list(data.get("components_visible")),
        visible_abnormalities=abnormalities,
        ocr_findings=_normalize_list(data.get("ocr_findings")),
        hazard_signals=hazard_signals,
        uncertainty_notes=uncertainty_notes,
        confidence_score=max(min(float(data.get("confidence_score", 0.72) or 0.72), 1.0), 0.0),
        requires_follow_up=bool(uncertainty_notes),
        provider_attempted=True,
        fallback_used=False,
        raw_provider_output=raw,
    )


def _classify_perception_error(exc: Exception) -> tuple[str, str]:
    message = str(exc) or exc.__class__.__name__
    lowered = message.lower()
    if "image_path_unresolved" in lowered:
        return "image_path_failure", message
    if "gemini_client_unavailable" in lowered:
        return "gemini_client_unavailable", message
    if "google-genai" in lowered or "sdk" in lowered:
        return "sdk_unavailable", message
    if "timeout" in lowered:
        return "timeout", message
    if isinstance(exc, json.JSONDecodeError):
        return "schema_mismatch", message
    return "sdk_call_error", message


def assess_perception(incident: IncidentInput) -> PerceptionResult:
    if incident.photo_evidence is None:
        summary = incident.symptom_text or incident.photo_hint or "No visual evidence provided."
        text = build_incident_text(incident)
        abnormalities = _fallback_abnormalities(text)
        hazard_signals = ["visible_hazard"] if set(abnormalities) & _HIGH_HAZARD_ABNORMALITIES else []
        return PerceptionResult(
            mode="text_only",
            evidence_type=infer_evidence_type(incident),
            scene_summary=summary,
            components_visible=_fallback_components(text),
            visible_abnormalities=abnormalities,
            ocr_findings=_fallback_ocr_findings(incident),
            hazard_signals=hazard_signals,
            uncertainty_notes=["No photo evidence available for visual perception."],
            confidence_score=0.25,
            requires_follow_up=True,
            provider_attempted=False,
            fallback_used=True,
            error_type="text_only_no_photo",
            error_message="No photo evidence was provided.",
            raw_provider_output=None,
        )

    error_type: str | None = None
    error_message: str | None = None
    try:
        gemini_result = _call_gemini_perception(incident)
        if gemini_result is not None:
            return gemini_result
    except Exception as exc:
        error_type, error_message = _classify_perception_error(exc)

    text = build_incident_text(incident)
    abnormalities = _fallback_abnormalities(text)
    hazard_signals = ["visible_hazard"] if set(abnormalities) & _HIGH_HAZARD_ABNORMALITIES else []
    return PerceptionResult(
        mode="heuristic",
        evidence_type=infer_evidence_type(incident),
        scene_summary=incident.photo_hint or incident.symptom_text or "Uploaded photo requires deterministic visual assessment.",
        components_visible=_fallback_components(text),
        visible_abnormalities=abnormalities,
        ocr_findings=_fallback_ocr_findings(incident),
        hazard_signals=hazard_signals,
        uncertainty_notes=["Gemini perception unavailable; using heuristic visual interpretation.", *(["Perception fallback reduced certainty."] if error_type else [])],
        confidence_score=0.38 if incident.photo_evidence else 0.25,
        requires_follow_up=not abnormalities and not _fallback_components(text),
        provider_attempted=True,
        fallback_used=True,
        error_type=error_type or "fallback_without_error_detail",
        error_message=error_message or "Gemini perception did not produce a usable structured response.",
        raw_provider_output=None,
    )
