from __future__ import annotations

import json
import re
from pathlib import Path

from app.core.models import IncidentInput, PerceptionResult, Theme2VisualExtraction
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


def _clean_optional_text(value: object) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text or text.lower() in {"unknown", "unreadable", "none", "null", "n/a", "na"}:
        return None
    return text


def _normalize_confidence(value: object, default: float) -> float:
    try:
        return max(min(float(str(value)), 1.0), 0.0)
    except (TypeError, ValueError):
        return default


def _normalize_optional_bool(value: object) -> bool | None:
    if isinstance(value, bool):
        return value
    if value is None:
        return None
    text = str(value).strip().lower()
    if text in {"true", "yes", "visible", "present", "1"}:
        return True
    if text in {"false", "no", "missing", "absent", "0"}:
        return False
    return None


def _normalize_input_component(value: object) -> str:
    text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    return text if text in {"charger", "evdb", "isolator", "unknown"} else "unknown"


def _normalize_observation_result(value: object) -> str:
    text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    valid = {
        "charger_red_light",
        "charger_blinking_red_light",
        "charger_no_light",
        "charger_serial_brand_visible",
        "evdb_single_phase",
        "evdb_three_phase",
        "mcb_tripped",
        "missing_mcb_rccb",
        "wrong_component_specs",
        "isolator_on",
        "isolator_off_open_circuit",
        "unknown",
    }
    return text if text in valid else "unknown"


def _normalize_indicator_status(value: object) -> str:
    text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    return text if text in {"red_light", "blinking_red_light", "no_light", "unknown"} else "unknown"


def _normalize_phase_type(value: object) -> str:
    text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    if text in {"1_phase", "one_phase", "single", "single_phase"}:
        return "single_phase"
    if text in {"3_phase", "three_phase", "three", "threephase"}:
        return "three_phase"
    return "unknown"


def _normalize_rccb_type(value: object) -> str:
    text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    if text in {"type_a", "a"}:
        return "type_a"
    if text in {"type_ac", "ac"}:
        return "type_ac"
    return "unknown"


def _normalize_isolator_state(value: object) -> str:
    text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    if text in {"on", "closed", "closed_circuit"}:
        return "on"
    if text in {"off", "open", "open_circuit"}:
        return "off"
    return "unknown"


def _contains_token(text: str, token: str) -> bool:
    normalized = re.escape(token.strip().lower()).replace(r"\ ", r"\s+")
    return re.search(rf"(?<![a-z0-9]){normalized}(?![a-z0-9])", text.lower()) is not None


def _extract_rating(text: str, component: str) -> str | None:
    pattern = rf"\b{component}\b[^.;,\n]*?(\d{{1,3}}\s*a(?:\s*(?:2p|4p))?)"
    match = re.search(pattern, text, flags=re.IGNORECASE)
    return match.group(1).strip() if match else None


def _extract_serial_number(text: str) -> str | None:
    match = re.search(r"\b(?:sn|serial(?:\s*number)?|serial\s*no\.?|id)\s*[:#-]?\s*([A-Za-z0-9-]{5,})", text, flags=re.IGNORECASE)
    return match.group(1).strip() if match else None


def _extract_brand_model(text: str) -> str | None:
    match = re.search(r"\b(?:brand|model|brand/model)\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9 _-]{2,40})", text, flags=re.IGNORECASE)
    if not match:
        return None
    return match.group(1).strip(" .;,")


def _theme2_from_data(data: dict[str, object], incident: IncidentInput, default_confidence: float) -> Theme2VisualExtraction:
    nested = data.get("theme2")
    theme_data = dict(data)
    if isinstance(nested, dict):
        theme_data.update(nested)
    raw_visible_text = _normalize_list(theme_data.get("raw_visible_text")) or _normalize_list(theme_data.get("visible_text")) or _normalize_list(theme_data.get("ocr_findings"))
    return Theme2VisualExtraction(
        input_component=_normalize_input_component(theme_data.get("input_component")),  # type: ignore[arg-type]
        observation_result=_normalize_observation_result(theme_data.get("observation_result")),  # type: ignore[arg-type]
        charger_serial_number=_clean_optional_text(theme_data.get("charger_serial_number")),
        charger_brand_model=_clean_optional_text(theme_data.get("charger_brand_model")),
        indicator_status=_normalize_indicator_status(theme_data.get("indicator_status")),  # type: ignore[arg-type]
        evdb_phase_type=_normalize_phase_type(theme_data.get("evdb_phase_type")),  # type: ignore[arg-type]
        mcb_visible=_normalize_optional_bool(theme_data.get("mcb_visible")),
        rccb_visible=_normalize_optional_bool(theme_data.get("rccb_visible")),
        mcb_rating=_clean_optional_text(theme_data.get("mcb_rating")),
        rccb_rating=_clean_optional_text(theme_data.get("rccb_rating")),
        rccb_type=_normalize_rccb_type(theme_data.get("rccb_type")),  # type: ignore[arg-type]
        isolator_state=_normalize_isolator_state(theme_data.get("isolator_state")),  # type: ignore[arg-type]
        raw_visible_text=raw_visible_text,
        confidence_score=_normalize_confidence(theme_data.get("theme2_confidence_score", theme_data.get("confidence_score")), default_confidence),
        uncertainty_notes=_normalize_list(theme_data.get("theme2_uncertainty_notes")) or _normalize_list(theme_data.get("uncertainty_notes")),
    )


def _fallback_theme2_extraction(incident: IncidentInput, confidence_score: float) -> Theme2VisualExtraction:
    text = build_incident_text(incident).lower()
    input_component = "unknown"
    observation = "unknown"
    indicator_status = "unknown"
    evdb_phase_type = "unknown"
    isolator_state = "unknown"
    mcb_visible: bool | None = None
    rccb_visible: bool | None = None
    rccb_type = "unknown"

    if "isolator" in text:
        input_component = "isolator"
        if any(token in text for token in ["isolator off", "open circuit", "switch off"]):
            observation = "isolator_off_open_circuit"
            isolator_state = "off"
        elif any(token in text for token in ["isolator on", "switch on"]):
            observation = "isolator_on"
            isolator_state = "on"
    elif any(token in text for token in ["evdb", "distribution board", "mcb", "rccb", "breaker"]):
        input_component = "evdb"
        if any(token in text for token in ["missing mcb", "missing rccb", "no mcb", "no rccb"]):
            observation = "missing_mcb_rccb"
        elif any(token in text for token in ["wrong component", "wrong spec", "incorrect spec", "type ac"]):
            observation = "wrong_component_specs"
        elif any(token in text for token in ["mcb tripped", "breaker tripped", "breaker down", "mcb down", "tripped breaker"]):
            observation = "mcb_tripped"
        elif any(token in text for token in ["three phase", "3 phase", "4p"]):
            observation = "evdb_three_phase"
            evdb_phase_type = "three_phase"
        elif any(token in text for token in ["single phase", "1 phase", "2p"]):
            observation = "evdb_single_phase"
            evdb_phase_type = "single_phase"
        mcb_visible = False if "missing mcb" in text or "no mcb" in text else None
        rccb_visible = False if "missing rccb" in text or "no rccb" in text else None
        rccb_type = "type_ac" if "type ac" in text else "type_a" if "type a" in text else "unknown"
    elif any(token in text for token in ["charger", "red light", "no light", "serial", "brand", "model"]):
        input_component = "charger"
        if any(token in text for token in ["blinking red", "flashing red", "red flashes", "red blinking"]):
            observation = "charger_blinking_red_light"
            indicator_status = "blinking_red_light"
        elif "no light" in text or "no lights" in text:
            observation = "charger_no_light"
            indicator_status = "no_light"
        elif "red light" in text or "red indicator" in text:
            observation = "charger_red_light"
            indicator_status = "red_light"
        elif any(token in text for token in ["serial", "brand", "model"]):
            observation = "charger_serial_brand_visible"

    serial_number = _extract_serial_number(text)
    brand_model = _extract_brand_model(text)
    if observation == "unknown" and input_component == "charger" and (serial_number or brand_model):
        observation = "charger_serial_brand_visible"

    return Theme2VisualExtraction(
        input_component=input_component,  # type: ignore[arg-type]
        observation_result=observation,  # type: ignore[arg-type]
        charger_serial_number=serial_number,
        charger_brand_model=brand_model,
        indicator_status=indicator_status,  # type: ignore[arg-type]
        evdb_phase_type=evdb_phase_type,  # type: ignore[arg-type]
        mcb_visible=mcb_visible,
        rccb_visible=rccb_visible,
        mcb_rating=_extract_rating(text, "mcb"),
        rccb_rating=_extract_rating(text, "rccb"),
        rccb_type=rccb_type,  # type: ignore[arg-type]
        isolator_state=isolator_state,  # type: ignore[arg-type]
        raw_visible_text=_fallback_ocr_findings(incident),
        confidence_score=confidence_score,
        uncertainty_notes=[] if observation != "unknown" else ["Theme 2 observation could not be inferred from available text."],
    )


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
        '  input_component: one of charger, evdb, isolator, unknown\n'
        '  observation_result: one of charger_red_light, charger_blinking_red_light, charger_no_light, '
        'charger_serial_brand_visible, evdb_single_phase, evdb_three_phase, mcb_tripped, '
        'missing_mcb_rccb, wrong_component_specs, isolator_on, isolator_off_open_circuit, unknown\n'
        '  charger_serial_number: string or null; return null if unreadable\n'
        '  charger_brand_model: string or null; return null if unreadable\n'
        '  indicator_status: one of red_light, blinking_red_light, no_light, unknown\n'
        '  evdb_phase_type: one of single_phase, three_phase, unknown\n'
        '  mcb_visible: boolean or null\n'
        '  rccb_visible: boolean or null\n'
        '  mcb_rating: string or null\n'
        '  rccb_rating: string or null\n'
        '  rccb_type: one of type_a, type_ac, unknown\n'
        '  isolator_state: one of on, off, unknown\n'
        '  raw_visible_text: array of visible text strings\n'
        'Do not guess serial number, brand/model, breaker rating, or RCCB type. Use null or unknown when unreadable.\n'
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
    confidence_score = _normalize_confidence(data.get("confidence_score"), 0.72)

    return PerceptionResult(
        mode="vlm",
        evidence_type=evidence_type,  # type: ignore[arg-type]
        scene_summary=str(data.get("scene_summary") or incident.photo_hint or incident.symptom_text or "Visual evidence inspected."),
        components_visible=_normalize_list(data.get("components_visible")),
        visible_abnormalities=abnormalities,
        ocr_findings=_normalize_list(data.get("ocr_findings")),
        hazard_signals=hazard_signals,
        uncertainty_notes=uncertainty_notes,
        confidence_score=confidence_score,
        requires_follow_up=bool(uncertainty_notes),
        provider_attempted=True,
        fallback_used=False,
        raw_provider_output=raw,
        theme2=_theme2_from_data(data, incident, confidence_score),
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
            theme2=_fallback_theme2_extraction(incident, 0.25),
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
        theme2=_fallback_theme2_extraction(incident, 0.38 if incident.photo_evidence else 0.25),
    )
