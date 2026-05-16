from __future__ import annotations

import json
import re
import time
from pathlib import Path

from app.core.models import IncidentInput, Theme2PerceptionAssessment, Theme2VisualExtraction
from app.services.gemini_client import GEMINI_MODEL, get_gemini_client
from app.services.intake import get_upload_root

_GEMINI_PARSE_ATTEMPTS = 3
_GEMINI_MAX_OUTPUT_TOKENS = 8192

_GEMINI_RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "evidence_type": {"type": "string"},
        "scene_summary": {"type": "string"},
        "components_visible": {"type": "array", "items": {"type": "string"}},
        "visible_abnormalities": {"type": "array", "items": {"type": "string"}},
        "ocr_findings": {"type": "array", "items": {"type": "string"}},
        "hazard_signals": {"type": "array", "items": {"type": "string"}},
        "uncertainty_notes": {"type": "array", "items": {"type": "string"}},
        "confidence_score": {"type": "number"},
        "input_component": {"type": "string", "enum": ["charger", "evdb", "isolator", "unknown"]},
        "observation_result": {
            "type": "string",
            "enum": [
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
            ],
        },
        "charger_serial_number": {"type": "string", "nullable": True},
        "charger_brand_model": {"type": "string", "nullable": True},
        "indicator_status": {"type": "string"},
        "evdb_phase_type": {"type": "string"},
        "mcb_visible": {"type": "boolean", "nullable": True},
        "rccb_visible": {"type": "boolean", "nullable": True},
        "mcb_rating": {"type": "string", "nullable": True},
        "rccb_rating": {"type": "string", "nullable": True},
        "rccb_type": {"type": "string"},
        "isolator_state": {"type": "string"},
        "raw_visible_text": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "evidence_type",
        "scene_summary",
        "components_visible",
        "visible_abnormalities",
        "ocr_findings",
        "hazard_signals",
        "uncertainty_notes",
        "confidence_score",
        "input_component",
        "observation_result",
        "charger_serial_number",
        "charger_brand_model",
        "indicator_status",
        "evdb_phase_type",
        "mcb_visible",
        "rccb_visible",
        "mcb_rating",
        "rccb_rating",
        "rccb_type",
        "isolator_state",
        "raw_visible_text",
    ],
}


class GeminiPerceptionError(RuntimeError):
    def __init__(self, message: str, *, error_type: str, raw_provider_output: str | None = None) -> None:
        super().__init__(message)
        self.error_type = error_type
        self.raw_provider_output = raw_provider_output

_COMPONENT_TOKENS = {
    "charger": ["charger", "indicator", "wallbox", "display"],
    "evdb": ["evdb", "distribution board", "mcb", "rccb", "breaker", "rcd"],
    "isolator": ["isolator", "switch"],
}

_ABNORMALITY_TOKENS = {
    "red_indicator": ["red light", "red indicator"],
    "blinking_red_indicator": ["blinking red", "flashing red", "red flashes", "red blinking"],
    "no_light": ["no light", "no lights", "display off"],
    "tripped_breaker": ["mcb tripped", "breaker tripped", "breaker down", "mcb down", "tripped breaker"],
    "missing_protection": ["missing mcb", "missing rccb", "no mcb", "no rccb"],
    "wrong_specs": ["wrong component", "wrong spec", "incorrect spec", "type ac"],
    "isolator_off": ["isolator off", "open circuit", "switch off"],
}


def _normalize_list(values: object) -> list[str]:
    if isinstance(values, list):
        return [str(value).strip() for value in values if str(value).strip()]
    if isinstance(values, str):
        return [part.strip() for part in re.split(r"[;\n,]+", values) if part.strip()]
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
    if text in {"solid_red_light", "solid_red", "red", "red_indicator"}:
        return "red_light"
    if text in {"flashing_red", "blinking_red", "red_flashing", "red_blinking"}:
        return "blinking_red_light"
    if text in {"off", "unlit", "no_indicator", "display_off"}:
        return "no_light"
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


def _extract_json_object(raw: str) -> dict[str, object]:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text, flags=re.IGNORECASE)
        text = re.sub(r"\s*```$", "", text.strip())
    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    start = text.find("{")
    end = text.rfind("}")
    if start < 0 or end <= start:
        raise json.JSONDecodeError("No JSON object found in provider output", text, 0)
    candidate = text[start : end + 1]
    data = json.loads(candidate)
    if not isinstance(data, dict):
        raise json.JSONDecodeError("Provider JSON root is not an object", candidate, 0)
    return data


def _combined_incident_text(incident: IncidentInput) -> str:
    parts = [
        incident.photo_hint or "",
        incident.symptom_text or "",
        incident.error_code or "",
        " ".join(f"{key} {value}" for key, value in incident.follow_up_answers.items()),
    ]
    return " ".join(part for part in parts if part).strip()


def _infer_evidence_type(incident: IncidentInput) -> str:
    if incident.photo_evidence is None:
        return "symptom_report"
    media_type = incident.photo_evidence.media_type.lower()
    text = _combined_incident_text(incident).lower()
    if "screenshot" in text or "app" in text or "error log" in text:
        return "screenshot"
    if media_type.startswith("image/"):
        return "hardware_photo"
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


def _theme2_from_data(data: dict[str, object], default_confidence: float) -> Theme2VisualExtraction:
    nested = data.get("theme2")
    theme_data = dict(data)
    if isinstance(nested, dict):
        theme_data.update(nested)
    raw_visible_text = (
        _normalize_list(theme_data.get("raw_visible_text"))
        or _normalize_list(theme_data.get("visible_text"))
        or _normalize_list(theme_data.get("ocr_findings"))
    )
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
    combined = _combined_incident_text(incident)
    for match in re.finditer(r"\b(?:faulted|trip(?:ped)?|mcb|rccb|type\s*a|type\s*ac|serial|sn|brand|model|[234]p|40a)\b", combined, flags=re.IGNORECASE):
        findings.append(match.group(0))
    return sorted(dict.fromkeys(item for item in findings if item))


def _fallback_theme2_extraction(incident: IncidentInput, confidence_score: float) -> Theme2VisualExtraction:
    text = _combined_incident_text(incident).lower()
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
        elif "no light" in text or "no lights" in text or "display off" in text:
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
        uncertainty_notes=[] if observation != "unknown" else ["Theme 2 observation could not be inferred from available evidence."],
    )


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


def _gemini_config(genai_types: object) -> object:
    return genai_types.GenerateContentConfig(  # type: ignore[attr-defined]
        temperature=0.0,
        max_output_tokens=_GEMINI_MAX_OUTPUT_TOKENS,
        response_mime_type="application/json",
        response_schema=_GEMINI_RESPONSE_SCHEMA,
    )


def _gemini_config_without_schema(genai_types: object) -> object:
    return genai_types.GenerateContentConfig(  # type: ignore[attr-defined]
        temperature=0.0,
        max_output_tokens=_GEMINI_MAX_OUTPUT_TOKENS,
        response_mime_type="application/json",
    )


def _call_gemini_perception(incident: IncidentInput) -> Theme2PerceptionAssessment | None:
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
        "You are RExharge Theme 2 EV charger troubleshooting perception. Inspect the image and return JSON only.\n"
        "Use exactly these keys:\n"
        "evidence_type, scene_summary, components_visible, visible_abnormalities, ocr_findings, hazard_signals, "
        "uncertainty_notes, confidence_score, input_component, observation_result, charger_serial_number, "
        "charger_brand_model, indicator_status, evdb_phase_type, mcb_visible, rccb_visible, mcb_rating, "
        "rccb_rating, rccb_type, isolator_state, raw_visible_text.\n"
        "Allowed input_component: charger, evdb, isolator, unknown.\n"
        "Allowed observation_result: charger_red_light, charger_blinking_red_light, charger_no_light, "
        "charger_serial_brand_visible, evdb_single_phase, evdb_three_phase, mcb_tripped, missing_mcb_rccb, "
        "wrong_component_specs, isolator_on, isolator_off_open_circuit, unknown.\n"
        "Do not guess serial number, brand/model, breaker rating, or RCCB type. Use null or unknown when unreadable.\n"
        "Keep arrays short: maximum 5 items per array, maximum 80 characters per item. "
        "Keep scene_summary under 160 characters. Return a complete JSON object with no markdown.\n"
        f"photo_hint: {incident.photo_hint or ''}\n"
        f"symptom_text: {incident.symptom_text or ''}\n"
        f"error_code: {incident.error_code or ''}\n"
    )

    image_path = _photo_path(incident)
    if image_path is None:
        raise FileNotFoundError("image_path_unresolved")

    image_bytes = image_path.read_bytes()
    image_part = genai_types.Part.from_bytes(data=image_bytes, mime_type=incident.photo_evidence.media_type)
    contents = [image_part, prompt]
    raw: str | None = None
    last_error: json.JSONDecodeError | None = None
    data: dict[str, object] | None = None
    use_schema = True

    for attempt in range(_GEMINI_PARSE_ATTEMPTS):
        try:
            response = client.models.generate_content(  # type: ignore[attr-defined]
                model=GEMINI_MODEL,
                contents=contents,
                config=_gemini_config(genai_types) if use_schema else _gemini_config_without_schema(genai_types),
            )
        except Exception:
            if not use_schema:
                raise
            use_schema = False
            response = client.models.generate_content(  # type: ignore[attr-defined]
                model=GEMINI_MODEL,
                contents=contents,
                config=_gemini_config_without_schema(genai_types),
            )
        raw = (response.text or "").strip()
        try:
            data = _extract_json_object(raw)
            break
        except json.JSONDecodeError as exc:
            last_error = exc
            if attempt < _GEMINI_PARSE_ATTEMPTS - 1:
                time.sleep(0.4 * (attempt + 1))
    else:
        message = str(last_error) if last_error is not None else "Gemini returned no parseable JSON."
        raise GeminiPerceptionError(message, error_type="schema_mismatch", raw_provider_output=raw)
    if data is None:
        raise GeminiPerceptionError("Gemini returned no parseable JSON.", error_type="schema_mismatch", raw_provider_output=raw)

    evidence_type = str(data.get("evidence_type") or _infer_evidence_type(incident))
    if evidence_type not in {"hardware_photo", "screenshot", "symptom_heavy_photo", "mixed_photo", "symptom_report", "unknown"}:
        evidence_type = _infer_evidence_type(incident)

    uncertainty_notes = _normalize_list(data.get("uncertainty_notes"))
    confidence_score = _normalize_confidence(data.get("confidence_score"), 0.72)
    return Theme2PerceptionAssessment(
        mode="vlm",
        evidence_type=evidence_type,  # type: ignore[arg-type]
        scene_summary=str(data.get("scene_summary") or incident.photo_hint or incident.symptom_text or "Visual evidence inspected."),
        components_visible=_normalize_list(data.get("components_visible")),
        visible_abnormalities=_normalize_list(data.get("visible_abnormalities")),
        ocr_findings=_normalize_list(data.get("ocr_findings")),
        hazard_signals=_normalize_list(data.get("hazard_signals")),
        uncertainty_notes=uncertainty_notes,
        confidence_score=confidence_score,
        requires_follow_up=bool(uncertainty_notes),
        provider_attempted=True,
        fallback_used=False,
        raw_provider_output=raw,
        extraction=_theme2_from_data(data, confidence_score),
    )


def _classify_perception_error(exc: Exception) -> tuple[str, str]:
    if isinstance(exc, GeminiPerceptionError):
        return exc.error_type, str(exc)
    message = str(exc) or exc.__class__.__name__
    lowered = message.lower()
    if "image_path_unresolved" in lowered:
        return "image_path_failure", message
    if "gemini_client_unavailable" in lowered:
        return "gemini_client_unavailable", message
    if "sdk" in lowered:
        return "sdk_unavailable", message
    if "timeout" in lowered:
        return "timeout", message
    if isinstance(exc, json.JSONDecodeError):
        return "schema_mismatch", message
    return "sdk_call_error", message


def assess_theme2_perception(incident: IncidentInput) -> Theme2PerceptionAssessment:
    if incident.photo_evidence is None:
        summary = incident.symptom_text or incident.photo_hint or "No visual evidence provided."
        text = _combined_incident_text(incident)
        extraction = _fallback_theme2_extraction(incident, 0.25)
        return Theme2PerceptionAssessment(
            mode="text_only",
            evidence_type=_infer_evidence_type(incident),  # type: ignore[arg-type]
            scene_summary=summary,
            components_visible=_fallback_components(text),
            visible_abnormalities=_fallback_abnormalities(text),
            ocr_findings=_fallback_ocr_findings(incident),
            hazard_signals=[],
            uncertainty_notes=["No photo evidence available for visual perception."],
            confidence_score=0.25,
            requires_follow_up=True,
            provider_attempted=False,
            fallback_used=True,
            error_type="text_only_no_photo",
            error_message="No photo evidence was provided.",
            extraction=extraction,
        )

    error_type: str | None = None
    error_message: str | None = None
    raw_provider_output: str | None = None
    try:
        gemini_result = _call_gemini_perception(incident)
        if gemini_result is not None:
            return gemini_result
    except Exception as exc:
        error_type, error_message = _classify_perception_error(exc)
        if isinstance(exc, GeminiPerceptionError):
            raw_provider_output = exc.raw_provider_output

    text = _combined_incident_text(incident)
    extraction = _fallback_theme2_extraction(incident, 0.38)
    return Theme2PerceptionAssessment(
        mode="heuristic",
        evidence_type=_infer_evidence_type(incident),  # type: ignore[arg-type]
        scene_summary=incident.photo_hint or incident.symptom_text or "Uploaded photo requires deterministic Theme 2 assessment.",
        components_visible=_fallback_components(text),
        visible_abnormalities=_fallback_abnormalities(text),
        ocr_findings=_fallback_ocr_findings(incident),
        hazard_signals=[],
        uncertainty_notes=["Gemini perception unavailable; using heuristic Theme 2 interpretation."],
        confidence_score=0.38,
        requires_follow_up=extraction.observation_result == "unknown",
        provider_attempted=True,
        fallback_used=True,
        raw_provider_output=raw_provider_output,
        error_type=error_type or "fallback_without_error_detail",
        error_message=error_message or "Gemini perception did not produce a usable structured response.",
        extraction=extraction,
    )
