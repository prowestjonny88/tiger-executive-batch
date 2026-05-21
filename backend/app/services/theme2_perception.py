from __future__ import annotations

import json
import re
import time
from io import BytesIO
from typing import Any

from app.core.models import IncidentInput, StoredPhotoEvidence, Theme2BoundingBox, Theme2PerceptionAssessment, Theme2VisualExtraction
from app.services.gemini_client import GEMINI_MODEL, get_gemini_client
from app.services.storage import read_photo_bytes

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
        "mcb_current_amp": {"type": "integer", "nullable": True},
        "rccb_current_amp": {"type": "integer", "nullable": True},
        "mcb_poles": {"type": "string"},
        "rccb_poles": {"type": "string"},
        "mcb_brand_model": {"type": "string", "nullable": True},
        "rccb_brand_model": {"type": "string", "nullable": True},
        "rccb_type": {"type": "string"},
        "rccb_type_evidence": {"type": "string"},
        "rccb_symbol_description": {"type": "string", "nullable": True},
        "charger_brand_source": {"type": "string"},
        "evdb_spec_status": {"type": "string"},
        "isolator_state": {"type": "string"},
        "raw_visible_text": {"type": "array", "items": {"type": "string"}},
        "bounding_boxes": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "string"},
                    "label": {"type": "string"},
                    "x": {"type": "number"},
                    "y": {"type": "number"},
                    "width": {"type": "number"},
                    "height": {"type": "number"},
                },
                "required": ["id", "label", "x", "y", "width", "height"],
            },
        },
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
        "mcb_current_amp",
        "rccb_current_amp",
        "mcb_poles",
        "rccb_poles",
        "mcb_brand_model",
        "rccb_brand_model",
        "rccb_type",
        "rccb_type_evidence",
        "rccb_symbol_description",
        "charger_brand_source",
        "evdb_spec_status",
        "isolator_state",
        "raw_visible_text",
        "bounding_boxes",
    ],
}

_APP_SCREENSHOT_SCHEMA = {
    "type": "object",
    "properties": {
        "app_status_summary": {"type": "string"},
        "app_visible_text": {"type": "array", "items": {"type": "string"}},
        "app_error_code": {"type": "string", "nullable": True},
        "app_fault_hint": {"type": "string", "nullable": True},
        "app_uncertainty_notes": {"type": "array", "items": {"type": "string"}},
        "confidence_score": {"type": "number"},
    },
    "required": [
        "app_status_summary",
        "app_visible_text",
        "app_error_code",
        "app_fault_hint",
        "app_uncertainty_notes",
        "confidence_score",
    ],
}

_ISOLATOR_CHECK_SCHEMA = {
    "type": "object",
    "properties": {
        "isolator_visible": {"type": "boolean"},
        "isolator_state": {"type": "string"},
        "isolator_observation": {"type": "string"},
        "confidence_score": {"type": "number"},
        "uncertainty_notes": {"type": "array", "items": {"type": "string"}},
        "raw_visible_text": {"type": "array", "items": {"type": "string"}},
        "bounding_boxes": _GEMINI_RESPONSE_SCHEMA["properties"]["bounding_boxes"],
    },
    "required": [
        "isolator_visible",
        "isolator_state",
        "isolator_observation",
        "confidence_score",
        "uncertainty_notes",
        "raw_visible_text",
        "bounding_boxes",
    ],
}

_EVDB_TRIP_CHECK_SCHEMA = {
    "type": "object",
    "properties": {
        "evdb_visible": {"type": "boolean"},
        "mcb_or_rccb_tripped": {"type": "boolean"},
        "trip_observation": {"type": "string"},
        "trip_evidence": {"type": "array", "items": {"type": "string"}},
        "confidence_score": {"type": "number"},
        "uncertainty_notes": {"type": "array", "items": {"type": "string"}},
        "raw_visible_text": {"type": "array", "items": {"type": "string"}},
        "bounding_boxes": _GEMINI_RESPONSE_SCHEMA["properties"]["bounding_boxes"],
    },
    "required": [
        "evdb_visible",
        "mcb_or_rccb_tripped",
        "trip_observation",
        "trip_evidence",
        "confidence_score",
        "uncertainty_notes",
        "raw_visible_text",
        "bounding_boxes",
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
    "isolator_off": [
        "isolator off",
        "open circuit",
        "switch off",
        "main switch off",
        "isolator tripped",
        "tripped isolator",
    ],
}

_EVDB_TRIPPED_TOKENS = [
    "mcb tripped",
    "rccb tripped",
    "breaker tripped",
    "rcd tripped",
    "breaker down",
    "mcb down",
    "rccb down",
    "breaker off",
    "mcb off",
    "rccb off",
    "tripped breaker",
]

_ISOLATOR_OFF_TOKENS = [
    "isolator off",
    "open circuit",
    "switch off",
    "main switch off",
    "isolator tripped",
    "tripped isolator",
    "isolator down",
    "off at isolator",
]

_ISOLATOR_ON_TOKENS = [
    "isolator on",
    "switch on",
    "main switch on",
    "isolator closed",
    "closed circuit",
]

_GENERIC_UPLOAD_HINTS = {
    "photo uploaded for ev charger troubleshooting",
    "uploaded photo requires deterministic theme 2 assessment",
}


def _normalize_list(values: object) -> list[str]:
    placeholders = {"unknown", "unreadable", "none", "null", "n/a", "na", "not_applicable"}
    if isinstance(values, list):
        return [
            str(value).strip()
            for value in values
            if str(value).strip() and str(value).strip().lower() not in placeholders
        ]
    if isinstance(values, str):
        return [
            part.strip()
            for part in re.split(r"[;\n,]+", values)
            if part.strip() and part.strip().lower() not in placeholders
        ]
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
    aliases = {
        "red_light": "charger_red_light",
        "solid_red": "charger_red_light",
        "solid_red_light": "charger_red_light",
        "blinking_red": "charger_blinking_red_light",
        "flashing_red": "charger_blinking_red_light",
        "no_light": "charger_no_light",
        "charger_off": "charger_no_light",
        "breaker_tripped": "mcb_tripped",
        "mcb_down": "mcb_tripped",
        "mcb_off": "mcb_tripped",
        "rccb_tripped": "mcb_tripped",
        "rccb_down": "mcb_tripped",
        "rccb_off": "mcb_tripped",
        "isolator_off": "isolator_off_open_circuit",
        "switch_off": "isolator_off_open_circuit",
        "open_circuit": "isolator_off_open_circuit",
        "isolator_tripped": "isolator_off_open_circuit",
        "tripped_isolator": "isolator_off_open_circuit",
        "isolator_closed": "isolator_on",
        "switch_on": "isolator_on",
    }
    text = aliases.get(text, text)
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


def _normalize_poles(value: object) -> str:
    text = str(value or "").strip().lower().replace("-", "").replace(" ", "")
    if text in {"1p", "1pole", "singlepole"}:
        return "1p"
    if text in {"2p", "2pole", "doublepole"}:
        return "2p"
    if text in {"3p", "3pole", "triplepole"}:
        return "3p"
    if text in {"4p", "4pole", "fourpole"}:
        return "4p"
    match = re.search(r"\b([1-4])\s*p(?:ole)?\b", str(value or ""), flags=re.IGNORECASE)
    return f"{match.group(1)}p" if match else "unknown"


def _normalize_optional_int(value: object) -> int | None:
    if value is None:
        return None
    try:
        number = int(float(str(value).strip().replace("A", "").replace("a", "")))
    except (TypeError, ValueError):
        return None
    return number if 0 < number <= 250 else None


def _normalize_evidence_source(value: object) -> str:
    text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    return text if text in {"text_label", "symbol_only", "mixed", "unknown"} else "unknown"


def _normalize_brand_source(value: object) -> str:
    text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    return text if text in {"text_label", "logo_text", "mixed", "unknown"} else "unknown"


def _normalize_evdb_spec_status(value: object) -> str:
    text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    return text if text in {"correct", "wrong", "missing", "incomplete", "unknown"} else "unknown"


def _normalize_isolator_state(value: object) -> str:
    text = str(value or "").strip().lower().replace("-", "_").replace(" ", "_")
    if text in {"on", "closed", "closed_circuit"}:
        return "on"
    if text in {"off", "open", "open_circuit"}:
        return "off"
    return "unknown"


def _normalize_box_number(value: object, default: float) -> float:
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return default


def _normalize_bounding_boxes(values: object, *, source: str) -> list[Theme2BoundingBox]:
    if not isinstance(values, list):
        return []

    boxes: list[Theme2BoundingBox] = []
    for index, raw_box in enumerate(values, start=1):
        if len(boxes) >= 3:
            break
        if not isinstance(raw_box, dict):
            continue
        if any(raw_box.get(field) is None for field in ("x", "y", "width", "height")):
            continue
        x = max(min(_normalize_box_number(raw_box.get("x"), 0.0), 100.0), 0.0)
        y = max(min(_normalize_box_number(raw_box.get("y"), 0.0), 100.0), 0.0)
        width = max(min(_normalize_box_number(raw_box.get("width"), 1.0), 100.0), 1.0)
        height = max(min(_normalize_box_number(raw_box.get("height"), 1.0), 100.0), 1.0)
        if x + width > 100.0:
            width = max(1.0, 100.0 - x)
        if y + height > 100.0:
            height = max(1.0, 100.0 - y)

        label = str(raw_box.get("label") or f"Theme 2 evidence {index}").strip()[:80]
        box_id = str(raw_box.get("id") or f"theme2-box-{index}").strip()[:60]
        boxes.append(
            Theme2BoundingBox(
                id=box_id,
                label=label,
                x=x,
                y=y,
                width=width,
                height=height,
                source="heuristic" if source == "heuristic" else "vlm",
            )
        )
    return boxes


def _text_has_any_phrase(text: str, phrases: list[str]) -> bool:
    return any(_contains_token(text, phrase) for phrase in phrases)


def _provider_text_for_component_override(theme_data: dict[str, object], raw_visible_text: list[str]) -> str:
    values: list[str] = []
    for key in (
        "scene_summary",
        "components_visible",
        "visible_abnormalities",
        "ocr_findings",
        "hazard_signals",
        "uncertainty_notes",
        "raw_visible_text",
    ):
        values.extend(_normalize_list(theme_data.get(key)))
        value = theme_data.get(key)
        if isinstance(value, str):
            values.append(value)
    values.extend(raw_visible_text)
    raw_boxes = theme_data.get("bounding_boxes")
    if isinstance(raw_boxes, list):
        for raw_box in raw_boxes:
            if isinstance(raw_box, dict):
                values.append(str(raw_box.get("id") or ""))
                values.append(str(raw_box.get("label") or ""))
    return " ".join(value for value in values if value).lower()


def _provider_mentions_isolator(text: str) -> bool:
    return any(_contains_token(text, token) for token in ["isolator", "main switch", "switch disconnector"])


def _provider_mentions_evdb(text: str) -> bool:
    return any(_contains_token(text, token) for token in ["evdb", "distribution board", "mcb", "rccb", "breaker", "rcd"])


def _provider_has_evdb_tripped_signal(text: str, input_component: str) -> bool:
    if input_component != "evdb" and not _provider_mentions_evdb(text):
        return False
    return _text_has_any_phrase(text, _EVDB_TRIPPED_TOKENS)


def _provider_has_isolator_off_signal(text: str, isolator_state: str) -> bool:
    if isolator_state == "off":
        return True
    if not _provider_mentions_isolator(text):
        return False
    return _text_has_any_phrase(text, _ISOLATOR_OFF_TOKENS) or _contains_token(text, "off")


def _provider_has_isolator_on_signal(text: str, isolator_state: str) -> bool:
    if isolator_state == "on":
        return True
    if not _provider_mentions_isolator(text):
        return False
    return _text_has_any_phrase(text, _ISOLATOR_ON_TOKENS) or _contains_token(text, "on")


def _provider_charger_indicator_fault(text: str, indicator_status: str, observation_result: str) -> str | None:
    if observation_result in {"charger_red_light", "charger_blinking_red_light"}:
        return observation_result
    if indicator_status == "red_light":
        return "charger_red_light"
    if indicator_status == "blinking_red_light":
        return "charger_blinking_red_light"
    if not any(_contains_token(text, token) for token in ["charger", "charging unit", "ev charger"]):
        return None
    if _text_has_any_phrase(
        text,
        [
            "blinking red light",
            "red light blinking",
            "flashing red light",
            "red indicator blinking",
            "blinking red indicator",
        ],
    ):
        return "charger_blinking_red_light"
    if _text_has_any_phrase(
        text,
        [
            "charger red light",
            "red light indicator",
            "red indicator",
            "solid red light",
            "solid red indicator",
        ],
    ):
        return "charger_red_light"
    return None


def _red_trip_window_box_from_image(
    evidence: StoredPhotoEvidence,
    search_boxes: list[Theme2BoundingBox],
) -> Theme2BoundingBox | None:
    if not search_boxes:
        return None

    try:
        from PIL import Image  # type: ignore[import-untyped]
    except ImportError:
        return None

    try:
        image = Image.open(BytesIO(read_photo_bytes(evidence))).convert("RGB")
    except Exception:
        return None

    image_width, image_height = image.size
    candidate_boxes = [
        box
        for box in search_boxes
        if any(token in f"{box.id} {box.label}".lower() for token in ["mcb", "rccb", "breaker", "evdb"])
    ]
    if not candidate_boxes:
        candidate_boxes = search_boxes

    best: tuple[int, int, int, int, int] | None = None
    for box in candidate_boxes:
        left = int(image_width * box.x / 100.0)
        top = int(image_height * box.y / 100.0)
        right = int(image_width * (box.x + box.width) / 100.0)
        bottom = int(image_height * (box.y + box.height) / 100.0)
        if right <= left or bottom <= top:
            continue
        crop = image.crop((left, top, right, bottom))
        crop_width, crop_height = crop.size
        pixels = crop.load()
        visited: set[tuple[int, int]] = set()
        red_pixels: set[tuple[int, int]] = set()

        for y in range(crop_height):
            for x in range(crop_width):
                r, g, b = pixels[x, y]
                if r >= 120 and r - g >= 35 and r - b >= 35 and g <= 170 and b <= 170:
                    red_pixels.add((x, y))

        for start in red_pixels:
            if start in visited:
                continue
            stack = [start]
            visited.add(start)
            xs: list[int] = []
            ys: list[int] = []
            while stack:
                x, y = stack.pop()
                xs.append(x)
                ys.append(y)
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if (nx, ny) in red_pixels and (nx, ny) not in visited:
                        visited.add((nx, ny))
                        stack.append((nx, ny))
            if not xs:
                continue

            min_x, max_x = min(xs), max(xs)
            min_y, max_y = min(ys), max(ys)
            component_width = max_x - min_x + 1
            component_height = max_y - min_y + 1
            area = len(xs)
            aspect_ratio = component_width / max(component_height, 1)

            if area < 18:
                continue
            if component_width < max(8, int(crop_width * 0.025)):
                continue
            if component_height < 2 or component_height > crop_height * 0.45:
                continue
            if aspect_ratio < 1.8:
                continue
            if min_y > crop_height * 0.68:
                continue

            score = area * component_width
            absolute = (left + min_x, top + min_y, left + max_x + 1, top + max_y + 1, score)
            if best is None or score > best[4]:
                best = absolute

    if best is None:
        return None

    left, top, right, bottom, _ = best
    return Theme2BoundingBox(
        id="evdb-red-trip-window",
        label="EVDB red trip/status window",
        x=max(0.0, min(100.0, left / image_width * 100.0)),
        y=max(0.0, min(100.0, top / image_height * 100.0)),
        width=max(1.0, min(100.0, (right - left) / image_width * 100.0)),
        height=max(1.0, min(100.0, (bottom - top) / image_height * 100.0)),
        source="heuristic",
    )


def _fallback_bounding_boxes(input_component: str, observation: str, *, has_photo: bool) -> list[Theme2BoundingBox]:
    if not has_photo or input_component == "unknown":
        return []
    if input_component == "charger":
        if observation == "charger_serial_brand_visible":
            return [
                Theme2BoundingBox(
                    id="charger-label",
                    label="Charger serial / brand label",
                    x=18.0,
                    y=15.0,
                    width=36.0,
                    height=58.0,
                    source="heuristic",
                )
            ]
        return [
            Theme2BoundingBox(
                id="charger-unit",
                label="Charger unit",
                x=25.0,
                y=12.0,
                width=50.0,
                height=72.0,
                source="heuristic",
            )
        ]
    if input_component == "evdb":
        return [
            Theme2BoundingBox(
                id="evdb-protection",
                label="EVDB / protection breakers",
                x=12.0,
                y=12.0,
                width=76.0,
                height=76.0,
                source="heuristic",
            )
        ]
    if input_component == "isolator":
        return [
            Theme2BoundingBox(
                id="isolator-switch",
                label="Isolator switch",
                x=30.0,
                y=18.0,
                width=40.0,
                height=64.0,
                source="heuristic",
            )
        ]
    return []


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


def _dedupe(items: list[str], limit: int | None = None) -> list[str]:
    values = list(dict.fromkeys(item for item in items if item))
    return values[:limit] if limit is not None else values


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
    pattern = rf"\b{component}\b[^.;,\n/\\]{{0,80}}?(\d{{1,3}}\s*a(?:\s*(?:1p|2p|3p|4p))?)"
    match = re.search(pattern, text, flags=re.IGNORECASE)
    return match.group(1).strip() if match else None


def _extract_current_amp(text: str | None) -> int | None:
    if not text:
        return None
    match = re.search(r"\b(?:c)?(\d{1,3})\s*a?\b", text, flags=re.IGNORECASE)
    return _normalize_optional_int(match.group(1)) if match else None


def _extract_poles(text: str | None) -> str:
    return _normalize_poles(text)


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
    mcb_rating = _clean_optional_text(theme_data.get("mcb_rating"))
    rccb_rating = _clean_optional_text(theme_data.get("rccb_rating"))
    input_component = _normalize_input_component(theme_data.get("input_component"))
    observation_result = _normalize_observation_result(theme_data.get("observation_result"))
    indicator_status = _normalize_indicator_status(theme_data.get("indicator_status"))
    isolator_state = _normalize_isolator_state(theme_data.get("isolator_state"))
    provider_text = _provider_text_for_component_override(theme_data, raw_visible_text)
    charger_indicator_fault = _provider_charger_indicator_fault(provider_text, indicator_status, observation_result)
    if _provider_has_evdb_tripped_signal(provider_text, input_component):
        input_component = "evdb"
        observation_result = "mcb_tripped"
    if charger_indicator_fault is not None:
        input_component = "charger"
        observation_result = charger_indicator_fault
    elif _provider_has_isolator_off_signal(provider_text, isolator_state):
        input_component = "isolator"
        observation_result = "isolator_off_open_circuit"
        isolator_state = "off"
    elif observation_result == "unknown" and _provider_has_isolator_on_signal(provider_text, isolator_state):
        input_component = "isolator"
        observation_result = "isolator_on"
        isolator_state = "on"
    return Theme2VisualExtraction(
        input_component=input_component,  # type: ignore[arg-type]
        observation_result=observation_result,  # type: ignore[arg-type]
        charger_serial_number=_clean_optional_text(theme_data.get("charger_serial_number")),
        charger_brand_model=_clean_optional_text(theme_data.get("charger_brand_model")),
        indicator_status=indicator_status,  # type: ignore[arg-type]
        evdb_phase_type=_normalize_phase_type(theme_data.get("evdb_phase_type")),  # type: ignore[arg-type]
        mcb_visible=_normalize_optional_bool(theme_data.get("mcb_visible")),
        rccb_visible=_normalize_optional_bool(theme_data.get("rccb_visible")),
        mcb_rating=mcb_rating,
        rccb_rating=rccb_rating,
        mcb_current_amp=_normalize_optional_int(theme_data.get("mcb_current_amp")) or _extract_current_amp(mcb_rating),
        rccb_current_amp=_normalize_optional_int(theme_data.get("rccb_current_amp")) or _extract_current_amp(rccb_rating),
        mcb_poles=_normalize_poles(theme_data.get("mcb_poles")) if theme_data.get("mcb_poles") is not None else _extract_poles(mcb_rating),  # type: ignore[arg-type]
        rccb_poles=_normalize_poles(theme_data.get("rccb_poles")) if theme_data.get("rccb_poles") is not None else _extract_poles(rccb_rating),  # type: ignore[arg-type]
        mcb_brand_model=_clean_optional_text(theme_data.get("mcb_brand_model")),
        rccb_brand_model=_clean_optional_text(theme_data.get("rccb_brand_model")),
        rccb_type=_normalize_rccb_type(theme_data.get("rccb_type")),  # type: ignore[arg-type]
        rccb_type_evidence=_normalize_evidence_source(theme_data.get("rccb_type_evidence")),  # type: ignore[arg-type]
        rccb_symbol_description=_clean_optional_text(theme_data.get("rccb_symbol_description")),
        charger_brand_source=_normalize_brand_source(theme_data.get("charger_brand_source")),  # type: ignore[arg-type]
        evdb_spec_status=_normalize_evdb_spec_status(theme_data.get("evdb_spec_status")),  # type: ignore[arg-type]
        isolator_state=isolator_state,  # type: ignore[arg-type]
        raw_visible_text=raw_visible_text,
        bounding_boxes=_normalize_bounding_boxes(theme_data.get("bounding_boxes"), source="vlm"),
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
    meaningful_text = text
    for generic_hint in _GENERIC_UPLOAD_HINTS:
        meaningful_text = meaningful_text.replace(generic_hint, "")
    input_component = "unknown"
    observation = "unknown"
    indicator_status = "unknown"
    evdb_phase_type = "unknown"
    isolator_state = "unknown"
    mcb_visible: bool | None = None
    rccb_visible: bool | None = None
    rccb_type = "unknown"

    if "isolator" in meaningful_text or "main switch" in meaningful_text:
        input_component = "isolator"
        if any(token in meaningful_text for token in _ISOLATOR_OFF_TOKENS):
            observation = "isolator_off_open_circuit"
            isolator_state = "off"
        elif any(token in meaningful_text for token in _ISOLATOR_ON_TOKENS):
            observation = "isolator_on"
            isolator_state = "on"
    elif any(token in meaningful_text for token in ["evdb", "distribution board", "mcb", "rccb", "breaker"]):
        input_component = "evdb"
        if any(token in meaningful_text for token in ["missing mcb", "missing rccb", "no mcb", "no rccb"]):
            observation = "missing_mcb_rccb"
        elif any(token in meaningful_text for token in ["wrong component", "wrong spec", "incorrect spec", "type ac"]):
            observation = "wrong_component_specs"
        elif any(token in meaningful_text for token in ["mcb tripped", "breaker tripped", "breaker down", "mcb down", "tripped breaker"]):
            observation = "mcb_tripped"
        elif any(token in meaningful_text for token in ["three phase", "3 phase", "4p"]):
            observation = "evdb_three_phase"
            evdb_phase_type = "three_phase"
        elif any(token in meaningful_text for token in ["single phase", "1 phase", "2p"]):
            observation = "evdb_single_phase"
            evdb_phase_type = "single_phase"
        mcb_visible = False if "missing mcb" in meaningful_text or "no mcb" in meaningful_text else None
        rccb_visible = False if "missing rccb" in meaningful_text or "no rccb" in meaningful_text else None
        rccb_type = "type_ac" if "type ac" in meaningful_text else "type_a" if "type a" in meaningful_text else "unknown"
    elif any(
        token in meaningful_text
        for token in [
            "charger red",
            "charger blinking",
            "charger no light",
            "charger display off",
            "charger serial",
            "charger brand",
            "charger model",
            "red light",
            "no light",
            "serial",
            "brand",
            "model",
        ]
    ):
        input_component = "charger"
        if any(token in meaningful_text for token in ["blinking red", "flashing red", "red flashes", "red blinking"]):
            observation = "charger_blinking_red_light"
            indicator_status = "blinking_red_light"
        elif "no light" in meaningful_text or "no lights" in meaningful_text or "display off" in meaningful_text:
            observation = "charger_no_light"
            indicator_status = "no_light"
        elif "red light" in meaningful_text or "red indicator" in meaningful_text:
            observation = "charger_red_light"
            indicator_status = "red_light"
        elif any(token in meaningful_text for token in ["serial", "brand", "model"]):
            observation = "charger_serial_brand_visible"

    serial_number = _extract_serial_number(text)
    brand_model = _extract_brand_model(text)
    if observation == "unknown" and input_component == "charger" and (serial_number or brand_model):
        observation = "charger_serial_brand_visible"
    mcb_rating = _extract_rating(text, "mcb")
    rccb_rating = _extract_rating(text, "rccb")
    evdb_spec_status = "unknown"
    if observation == "missing_mcb_rccb":
        evdb_spec_status = "missing"
    elif observation == "wrong_component_specs":
        evdb_spec_status = "wrong"
    elif observation in {"evdb_single_phase", "evdb_three_phase"}:
        evdb_spec_status = "incomplete"

    return Theme2VisualExtraction(
        input_component=input_component,  # type: ignore[arg-type]
        observation_result=observation,  # type: ignore[arg-type]
        charger_serial_number=serial_number,
        charger_brand_model=brand_model,
        indicator_status=indicator_status,  # type: ignore[arg-type]
        evdb_phase_type=evdb_phase_type,  # type: ignore[arg-type]
        mcb_visible=mcb_visible,
        rccb_visible=rccb_visible,
        mcb_rating=mcb_rating,
        rccb_rating=rccb_rating,
        mcb_current_amp=_extract_current_amp(mcb_rating),
        rccb_current_amp=_extract_current_amp(rccb_rating),
        mcb_poles=_extract_poles(mcb_rating),  # type: ignore[arg-type]
        rccb_poles=_extract_poles(rccb_rating),  # type: ignore[arg-type]
        rccb_type=rccb_type,  # type: ignore[arg-type]
        rccb_type_evidence="text_label" if rccb_type != "unknown" else "unknown",  # type: ignore[arg-type]
        charger_brand_source="text_label" if brand_model else "unknown",  # type: ignore[arg-type]
        evdb_spec_status=evdb_spec_status,  # type: ignore[arg-type]
        isolator_state=isolator_state,  # type: ignore[arg-type]
        raw_visible_text=_fallback_ocr_findings(incident),
        bounding_boxes=_fallback_bounding_boxes(input_component, observation, has_photo=incident.photo_evidence is not None),
        confidence_score=confidence_score,
        uncertainty_notes=[] if observation != "unknown" else ["Theme 2 observation could not be inferred from available evidence."],
    )


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


def _gemini_config_for_schema(genai_types: object, schema: dict[str, object]) -> object:
    return genai_types.GenerateContentConfig(  # type: ignore[attr-defined]
        temperature=0.0,
        max_output_tokens=2048,
        response_mime_type="application/json",
        response_schema=schema,
    )


def _generate_gemini_json(
    evidence: StoredPhotoEvidence,
    prompt: str,
    genai_types: object,
    schema: dict[str, object],
) -> tuple[dict[str, object], str]:
    image_bytes = read_photo_bytes(evidence)
    typed_genai_types = genai_types  # type: Any
    image_part = typed_genai_types.Part.from_bytes(data=image_bytes, mime_type=evidence.media_type)
    raw: str | None = None
    last_error: json.JSONDecodeError | None = None
    client = get_gemini_client()
    if client is None:
        raise RuntimeError("gemini_client_unavailable")

    use_schema = True
    for attempt in range(_GEMINI_PARSE_ATTEMPTS):
        try:
            response = client.models.generate_content(  # type: ignore[attr-defined]
                model=GEMINI_MODEL,
                contents=[image_part, prompt],
                config=_gemini_config_for_schema(genai_types, schema) if use_schema else _gemini_config_without_schema(genai_types),
            )
        except Exception:
            if not use_schema:
                raise
            use_schema = False
            response = client.models.generate_content(  # type: ignore[attr-defined]
                model=GEMINI_MODEL,
                contents=[image_part, prompt],
                config=_gemini_config_without_schema(genai_types),
            )
        raw = (response.text or "").strip()
        try:
            return _extract_json_object(raw), raw
        except json.JSONDecodeError as exc:
            last_error = exc
            if attempt < _GEMINI_PARSE_ATTEMPTS - 1:
                time.sleep(0.4 * (attempt + 1))

    message = str(last_error) if last_error is not None else "Gemini returned no parseable JSON."
    raise GeminiPerceptionError(message, error_type="schema_mismatch", raw_provider_output=raw)


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
        "You are ChargerDoc Theme 2 EV charger troubleshooting perception. Inspect the image and return JSON only.\n"
        "Use exactly these keys:\n"
        "evidence_type, scene_summary, components_visible, visible_abnormalities, ocr_findings, hazard_signals, "
        "uncertainty_notes, confidence_score, input_component, observation_result, charger_serial_number, "
        "charger_brand_model, indicator_status, evdb_phase_type, mcb_visible, rccb_visible, mcb_rating, "
        "rccb_rating, mcb_current_amp, rccb_current_amp, mcb_poles, rccb_poles, mcb_brand_model, "
        "rccb_brand_model, rccb_type, rccb_type_evidence, rccb_symbol_description, charger_brand_source, "
        "evdb_spec_status, isolator_state, raw_visible_text, bounding_boxes.\n"
        "Allowed input_component: charger, evdb, isolator, unknown.\n"
        "Allowed observation_result: charger_red_light, charger_blinking_red_light, charger_no_light, "
        "charger_serial_brand_visible, evdb_single_phase, evdb_three_phase, mcb_tripped, missing_mcb_rccb, "
        "wrong_component_specs, isolator_on, isolator_off_open_circuit, unknown.\n"
        "PDF guide EVDB rules: single phase expects MCB 40A 2P and RCCB 40A Type A 2P; "
        "three phase expects MCB 40A 4P and RCCB 40A Type A 4P. "
        "RCCB Type AC is wrong for this guide. A sine-wave-only RCCB symbol means Type AC; "
        "a sine wave plus pulsating DC symbol or readable Type A text means Type A. "
        "EVDB observation priority: missing MCB/RCCB first, then visibly tripped/down/OFF MCB/RCCB breaker, "
        "then wrong component/specs, then single-phase/three-phase reference evidence. If any EVDB breaker handle "
        "is visibly down/OFF/tripped while other breakers are up/ON, return observation_result=mcb_tripped; do not "
        "return evdb_single_phase or evdb_three_phase just because 2P/4P labels are visible. Phase observations are "
        "for reference/spec verification when no tripped/missing/wrong breaker fault is visible. "
        "Do not mix MCB and RCCB labels. If a label is blurry, occluded, or unreadable, set numeric/pole/type fields "
        "to null or unknown and add an uncertainty note. "
        "Set evdb_spec_status to correct, wrong, missing, incomplete, or unknown based only on readable EVDB evidence. "
        "For charger identity, extract serial number only from readable serial/SN/ID text and brand/model only from "
        "readable text or logo text; do not infer brand from shape, color, or styling. "
        "Do not guess serial number, brand/model, breaker rating, pole count, or RCCB type. Use null or unknown when unreadable.\n"
        "Choose the actionable Theme 2 evidence, not merely the largest object. If a charger and isolator are both visible, "
        "a clearly visible charger red light or blinking red light is the primary actionable charger observation and must "
        "not be overridden by the isolator. If the charger has no light/no power and the isolator switch/label is readable "
        "as OFF, the correct output is input_component=isolator, observation_result=isolator_off_open_circuit, "
        "isolator_state=off. Treat user wording such as 'tripped isolator' as isolator OFF/open circuit for this guide. "
        "Do not classify an OFF isolator photo as charger_no_light or charger_serial_brand_visible just because a charger "
        "is also visible.\n"
        "For bounding_boxes, return at most 3 boxes using percentages relative to the full image: "
        "x, y, width, height are 0-100 values. Bound only visible Theme 2 evidence objects such as the charger unit, "
        "charger serial/brand label, EVDB enclosure or MCB/RCCB cluster, or isolator switch. "
        "If the object location cannot be estimated from the image, return an empty array. Do not draw boxes for hidden objects.\n"
        "Keep arrays short: maximum 5 items per array, maximum 80 characters per item. "
        "Keep scene_summary under 160 characters. Return a complete JSON object with no markdown.\n"
        f"photo_hint: {incident.photo_hint or ''}\n"
        f"symptom_text: {incident.symptom_text or ''}\n"
        f"error_code: {incident.error_code or ''}\n"
    )

    image_bytes = read_photo_bytes(incident.photo_evidence)
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
    assessment = Theme2PerceptionAssessment(
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
    assessment = _merge_evdb_trip_secondary_check(incident, assessment)
    return _merge_isolator_secondary_check(incident, assessment)


def _call_gemini_app_screenshot(incident: IncidentInput) -> tuple[dict[str, object], str] | None:
    if incident.app_screenshot_evidence is None:
        return None

    try:
        from google.genai import types as genai_types  # type: ignore[import-untyped]
    except ImportError:
        raise RuntimeError("gemini_sdk_unavailable")

    prompt = (
        "You are reading an EV charging app screenshot for ChargerDoc Theme 2. Return JSON only.\n"
        "Use exactly these keys: app_status_summary, app_visible_text, app_error_code, app_fault_hint, "
        "app_uncertainty_notes, confidence_score.\n"
        "Extract only visible app text. Do not infer hidden status. If text is unreadable, use null and add an uncertainty note.\n"
        "For app_fault_hint, prefer one of: ground fault, emergency stop, short circuit, over-temperature, "
        "charger fault, offline/no supply, unknown. Include visible flash count text if present.\n"
        "Keep arrays short and each text item under 80 characters.\n"
        f"photo_hint: {incident.photo_hint or ''}\n"
        f"symptom_text: {incident.symptom_text or ''}\n"
        f"error_code: {incident.error_code or ''}\n"
    )
    return _generate_gemini_json(incident.app_screenshot_evidence, prompt, genai_types, _APP_SCREENSHOT_SCHEMA)


def _should_run_isolator_secondary_check(perception: Theme2PerceptionAssessment) -> bool:
    extraction = perception.extraction
    return extraction.input_component in {"charger", "unknown"} and extraction.observation_result in {
        "unknown",
        "charger_no_light",
        "charger_serial_brand_visible",
    }


def _call_gemini_isolator_check(incident: IncidentInput) -> tuple[dict[str, object], str] | None:
    if incident.photo_evidence is None:
        return None

    try:
        from google.genai import types as genai_types  # type: ignore[import-untyped]
    except ImportError:
        raise RuntimeError("gemini_sdk_unavailable")

    prompt = (
        "You are doing a targeted ChargerDoc Theme 2 isolator check. Return JSON only.\n"
        "Inspect the image only for EV charger isolator switches, even if a charger unit is larger in the frame.\n"
        "Use exactly these keys: isolator_visible, isolator_state, isolator_observation, confidence_score, "
        "uncertainty_notes, raw_visible_text, bounding_boxes.\n"
        "isolator_state must be on, off, or unknown. isolator_observation must be isolator_on, "
        "isolator_off_open_circuit, or unknown.\n"
        "If any isolator switch label or handle position clearly indicates OFF/open circuit, return "
        "isolator_visible=true, isolator_state=off, isolator_observation=isolator_off_open_circuit. "
        "If the isolator is visible but state is hidden, blurry, or ambiguous, return unknown rather than guessing. "
        "Do not classify charger labels or EVDB breakers as isolators.\n"
        "For bounding_boxes, return at most 2 boxes around visible isolator switches using 0-100 image percentages.\n"
        f"photo_hint: {incident.photo_hint or ''}\n"
        f"symptom_text: {incident.symptom_text or ''}\n"
    )
    return _generate_gemini_json(incident.photo_evidence, prompt, genai_types, _ISOLATOR_CHECK_SCHEMA)


def _should_run_evdb_trip_secondary_check(perception: Theme2PerceptionAssessment) -> bool:
    extraction = perception.extraction
    return extraction.input_component == "evdb" and extraction.observation_result in {"evdb_single_phase", "evdb_three_phase"}


def _call_gemini_evdb_trip_check(incident: IncidentInput) -> tuple[dict[str, object], str] | None:
    if incident.photo_evidence is None:
        return None

    try:
        from google.genai import types as genai_types  # type: ignore[import-untyped]
    except ImportError:
        raise RuntimeError("gemini_sdk_unavailable")

    prompt = (
        "You are doing a targeted ChargerDoc Theme 2 EVDB breaker-trip check. Return JSON only.\n"
        "Inspect only the EV distribution board MCB/RCCB protective devices. This is not a phase/spec check.\n"
        "Use exactly these keys: evdb_visible, mcb_or_rccb_tripped, trip_observation, trip_evidence, confidence_score, "
        "uncertainty_notes, raw_visible_text, bounding_boxes.\n"
        "trip_observation must be mcb_tripped or unknown.\n"
        "Return mcb_or_rccb_tripped=true and trip_observation=mcb_tripped if any protective device shows a trip cue: "
        "handle visibly down/OFF/mid-trip compared with adjacent devices, red/orange trip/status window that indicates a trip, "
        "or readable text/marker showing TRIP/OFF. Phase labels such as 2P/4P and 40A are not the observation. "
        "If all visible handles clearly show ON and there is no reliable trip cue, return false/unknown. "
        "If the plastic cover, glare, blur, or angle makes trip state uncertain, return false/unknown and add an uncertainty note. "
        "For bounding_boxes, return at most 2 boxes around the MCB/RCCB device or trip/status window using 0-100 image percentages.\n"
        f"photo_hint: {incident.photo_hint or ''}\n"
        f"symptom_text: {incident.symptom_text or ''}\n"
    )
    return _generate_gemini_json(incident.photo_evidence, prompt, genai_types, _EVDB_TRIP_CHECK_SCHEMA)


def _merge_evdb_trip_secondary_check(
    incident: IncidentInput,
    perception: Theme2PerceptionAssessment,
) -> Theme2PerceptionAssessment:
    if not _should_run_evdb_trip_secondary_check(perception):
        return perception
    try:
        parsed = _call_gemini_evdb_trip_check(incident)
    except Exception:
        return perception
    if parsed is None:
        return perception

    data, raw = parsed
    trip_observation = _normalize_observation_result(data.get("trip_observation"))
    trip_evidence = _normalize_list(data.get("trip_evidence"))
    raw_visible_text = (
        _normalize_list(data.get("raw_visible_text"))
        or _normalize_list(data.get("ocr_findings"))
        or trip_evidence
    )
    tripped = bool(data.get("mcb_or_rccb_tripped"))
    evdb_visible = bool(data.get("evdb_visible"))

    if evdb_visible and tripped and trip_observation == "mcb_tripped":
        secondary_confidence = _normalize_confidence(data.get("confidence_score"), perception.confidence_score)
        secondary_boxes = _normalize_bounding_boxes(data.get("bounding_boxes"), source="vlm")
        extraction = perception.extraction.model_copy(
            update={
                "input_component": "evdb",
                "observation_result": "mcb_tripped",
                "bounding_boxes": secondary_boxes or perception.extraction.bounding_boxes,
                "raw_visible_text": _dedupe([*perception.extraction.raw_visible_text, *raw_visible_text, *trip_evidence], limit=10),
                "confidence_score": secondary_confidence,
                "uncertainty_notes": _dedupe(
                    [*perception.extraction.uncertainty_notes, *_normalize_list(data.get("uncertainty_notes"))],
                    limit=5,
                ),
            }
        )
        return perception.model_copy(
            update={
                "visible_abnormalities": _dedupe([*perception.visible_abnormalities, "mcb_tripped"], limit=5),
                "ocr_findings": _dedupe([*perception.ocr_findings, *raw_visible_text, *trip_evidence], limit=10),
                "confidence_score": min(max(perception.confidence_score, secondary_confidence), 1.0),
                "requires_follow_up": bool(extraction.uncertainty_notes),
                "raw_provider_output": f"{perception.raw_provider_output or ''}\nEVDB_TRIP_SECONDARY:\n{raw}".strip(),
                "extraction": extraction,
            }
        )

    red_trip_window = _red_trip_window_box_from_image(incident.photo_evidence, perception.extraction.bounding_boxes) if incident.photo_evidence else None
    if evdb_visible and red_trip_window is not None:
        extraction = perception.extraction.model_copy(
            update={
                "input_component": "evdb",
                "observation_result": "mcb_tripped",
                "bounding_boxes": [red_trip_window, *perception.extraction.bounding_boxes][:3],
                "raw_visible_text": _dedupe(
                    [*perception.extraction.raw_visible_text, *raw_visible_text, "red trip/status window"],
                    limit=10,
                ),
                "confidence_score": min(max(perception.extraction.confidence_score, 0.78), 1.0),
                "uncertainty_notes": _dedupe(
                    [
                        *perception.extraction.uncertainty_notes,
                        "Detected a red EVDB trip/status window; treating as MCB/RCCB tripped.",
                    ],
                    limit=5,
                ),
            }
        )
        return perception.model_copy(
            update={
                "visible_abnormalities": _dedupe([*perception.visible_abnormalities, "mcb_tripped"], limit=5),
                "ocr_findings": _dedupe([*perception.ocr_findings, *raw_visible_text, "red trip/status window"], limit=10),
                "confidence_score": min(max(perception.confidence_score, 0.78), 1.0),
                "requires_follow_up": bool(extraction.uncertainty_notes),
                "raw_provider_output": f"{perception.raw_provider_output or ''}\nEVDB_TRIP_SECONDARY:\n{raw}\nEVDB_RED_WINDOW_HEURISTIC: detected".strip(),
                "extraction": extraction,
            }
        )

    return perception.model_copy(
        update={
            "raw_provider_output": f"{perception.raw_provider_output or ''}\nEVDB_TRIP_SECONDARY:\n{raw}".strip(),
        }
    )


def _merge_isolator_secondary_check(
    incident: IncidentInput,
    perception: Theme2PerceptionAssessment,
) -> Theme2PerceptionAssessment:
    if not _should_run_isolator_secondary_check(perception):
        return perception
    try:
        parsed = _call_gemini_isolator_check(incident)
    except Exception:
        return perception
    if parsed is None:
        return perception

    data, raw = parsed
    raw_visible_text = (
        _normalize_list(data.get("raw_visible_text"))
        or _normalize_list(data.get("ocr_findings"))
        or _normalize_list(data.get("visible_text"))
    )
    state = _normalize_isolator_state(data.get("isolator_state"))
    observation = _normalize_observation_result(data.get("isolator_observation"))
    provider_text = _provider_text_for_component_override(data, raw_visible_text)
    isolator_visible = bool(data.get("isolator_visible"))

    if isolator_visible and _provider_has_isolator_off_signal(provider_text, state):
        secondary_confidence = _normalize_confidence(data.get("confidence_score"), perception.confidence_score)
        secondary_boxes = _normalize_bounding_boxes(data.get("bounding_boxes"), source="vlm")
        extraction = perception.extraction.model_copy(
            update={
                "input_component": "isolator",
                "observation_result": "isolator_off_open_circuit",
                "isolator_state": "off",
                "bounding_boxes": secondary_boxes or perception.extraction.bounding_boxes,
                "raw_visible_text": _dedupe([*perception.extraction.raw_visible_text, *raw_visible_text], limit=8),
                "confidence_score": secondary_confidence,
                "uncertainty_notes": _dedupe(
                    [*perception.extraction.uncertainty_notes, *_normalize_list(data.get("uncertainty_notes"))],
                    limit=5,
                ),
            }
        )
        return perception.model_copy(
            update={
                "components_visible": _dedupe([*perception.components_visible, "isolator"], limit=5),
                "visible_abnormalities": _dedupe([*perception.visible_abnormalities, "isolator_off_open_circuit"], limit=5),
                "ocr_findings": _dedupe([*perception.ocr_findings, *raw_visible_text], limit=8),
                "confidence_score": min(max(perception.confidence_score, secondary_confidence), 1.0),
                "requires_follow_up": bool(extraction.uncertainty_notes),
                "raw_provider_output": f"{perception.raw_provider_output or ''}\nISOLATOR_SECONDARY:\n{raw}".strip(),
                "extraction": extraction,
            }
        )

    if isolator_visible and perception.extraction.observation_result == "unknown" and observation == "isolator_on":
        extraction = perception.extraction.model_copy(
            update={
                "input_component": "isolator",
                "observation_result": "isolator_on",
                "isolator_state": "on",
                "bounding_boxes": _normalize_bounding_boxes(data.get("bounding_boxes"), source="vlm")
                or perception.extraction.bounding_boxes,
                "raw_visible_text": _dedupe([*perception.extraction.raw_visible_text, *raw_visible_text], limit=8),
            }
        )
        return perception.model_copy(
            update={
                "components_visible": _dedupe([*perception.components_visible, "isolator"], limit=5),
                "raw_provider_output": f"{perception.raw_provider_output or ''}\nISOLATOR_SECONDARY:\n{raw}".strip(),
                "extraction": extraction,
            }
        )

    return perception


def _merge_app_screenshot_perception(
    incident: IncidentInput,
    perception: Theme2PerceptionAssessment,
) -> Theme2PerceptionAssessment:
    if incident.app_screenshot_evidence is None:
        return perception
    try:
        parsed = _call_gemini_app_screenshot(incident)
    except Exception as exc:
        error_type, error_message = _classify_perception_error(exc)
        notes = _dedupe(
            [
                *perception.uncertainty_notes,
                f"EV app screenshot could not be parsed ({error_type}: {error_message}).",
            ],
            limit=5,
        )
        return perception.model_copy(update={"uncertainty_notes": notes, "requires_follow_up": True})
    if parsed is None:
        return perception

    data, raw = parsed
    app_visible_text = _normalize_list(data.get("app_visible_text"))
    app_error_code = _clean_optional_text(data.get("app_error_code"))
    app_fault_hint = _clean_optional_text(data.get("app_fault_hint"))
    app_summary = _clean_optional_text(data.get("app_status_summary"))
    app_uncertainty_notes = _normalize_list(data.get("app_uncertainty_notes"))

    app_findings = _dedupe(
        [
            *([f"App screenshot summary: {app_summary}"] if app_summary else []),
            *([f"App error code: {app_error_code}"] if app_error_code else []),
            *([f"App fault hint: {app_fault_hint}"] if app_fault_hint else []),
            *[f"App text: {item}" for item in app_visible_text],
        ],
        limit=8,
    )
    extraction = perception.extraction.model_copy(
        update={
            "raw_visible_text": _dedupe([*perception.extraction.raw_visible_text, *app_findings], limit=12),
            "uncertainty_notes": _dedupe([*perception.extraction.uncertainty_notes, *app_uncertainty_notes], limit=6),
        }
    )
    raw_provider_output = perception.raw_provider_output
    if raw:
        raw_provider_output = f"{raw_provider_output}\n\nAPP_SCREENSHOT:\n{raw}" if raw_provider_output else f"APP_SCREENSHOT:\n{raw}"

    return perception.model_copy(
        update={
            "scene_summary": f"{perception.scene_summary} App screenshot reviewed." if app_findings else perception.scene_summary,
            "ocr_findings": _dedupe([*perception.ocr_findings, *app_findings], limit=12),
            "uncertainty_notes": _dedupe([*perception.uncertainty_notes, *app_uncertainty_notes], limit=6),
            "requires_follow_up": perception.requires_follow_up or bool(app_uncertainty_notes),
            "raw_provider_output": raw_provider_output,
            "extraction": extraction,
        }
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
        text_only_result = Theme2PerceptionAssessment(
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
        return _merge_app_screenshot_perception(incident, text_only_result)

    error_type: str | None = None
    error_message: str | None = None
    raw_provider_output: str | None = None
    try:
        gemini_result = _call_gemini_perception(incident)
        if gemini_result is not None:
            return _merge_app_screenshot_perception(incident, gemini_result)
    except Exception as exc:
        error_type, error_message = _classify_perception_error(exc)
        if isinstance(exc, GeminiPerceptionError):
            raw_provider_output = exc.raw_provider_output

    text = _combined_incident_text(incident)
    extraction = _fallback_theme2_extraction(incident, 0.38)
    heuristic_result = Theme2PerceptionAssessment(
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
    return _merge_app_screenshot_perception(incident, heuristic_result)
