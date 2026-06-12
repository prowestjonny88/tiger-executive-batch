from __future__ import annotations

import json
import re
from typing import Any

from app.core.models import ChargerIdentityScanRequest, ChargerIdentityScanResponse
from app.services.gemini_client import GEMINI_MODEL, get_gemini_client
from app.services.storage import read_photo_bytes

_IDENTITY_SCHEMA = {
    "type": "object",
    "properties": {
        "charger_serial_number": {"type": "string", "nullable": True},
        "charger_brand_model": {"type": "string", "nullable": True},
        "brand_name": {"type": "string", "nullable": True},
        "model_name": {"type": "string", "nullable": True},
        "raw_visible_text": {"type": "array", "items": {"type": "string"}},
        "confidence_score": {"type": "number"},
        "uncertainty_notes": {"type": "array", "items": {"type": "string"}},
    },
    "required": [
        "charger_serial_number",
        "charger_brand_model",
        "brand_name",
        "model_name",
        "raw_visible_text",
        "confidence_score",
        "uncertainty_notes",
    ],
}


def _clean(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    cleaned = value.strip(" \t\r\n:;,.")
    return cleaned or None


def _normalize_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item).strip() for item in value if str(item).strip()][:20]


def _extract_json_object(raw: str) -> dict[str, object]:
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        parsed = json.loads(raw[start : end + 1])
        return parsed if isinstance(parsed, dict) else {}


def _extract_serial_from_text(text: str) -> str | None:
    match = re.search(r"\b(?:sn|s/n|serial(?:\s*number)?|serial\s*no\.?)\s*[:#-]?\s*([A-Za-z0-9-]{5,})", text, flags=re.IGNORECASE)
    return match.group(1).strip() if match else None


def _combine_brand_model(data: dict[str, object]) -> str | None:
    direct = _clean(data.get("charger_brand_model"))
    if direct:
        return direct
    brand = _clean(data.get("brand_name"))
    model = _clean(data.get("model_name"))
    if brand and model:
        return model if brand.lower() in model.lower() else f"{brand} {model}"
    return brand or model


def _fallback_response(error_message: str | None = None) -> ChargerIdentityScanResponse:
    return ChargerIdentityScanResponse(
        note="The charger label photo could not be scanned automatically. You can continue without it or enter the details manually.",
        provider_attempted=bool(error_message),
        fallback_used=True,
        error_message=error_message,
    )


def scan_charger_identity(request: ChargerIdentityScanRequest) -> ChargerIdentityScanResponse:
    client = get_gemini_client()
    if client is None:
        return _fallback_response("gemini_client_unavailable")

    try:
        from google.genai import types as genai_types  # type: ignore[import-untyped]
    except ImportError:
        return _fallback_response("gemini_sdk_unavailable")

    prompt = (
        "You are reading a close-up label photo from an EV charger. Return JSON only.\n"
        "Task: extract charger identity fields for a support ticket.\n"
        "Read exact visible text. Do not guess unreadable characters.\n"
        "Look especially for serial labels such as SN, S/N, Serial No, or Serial Number.\n"
        "For charger_brand_model, include brand plus model when both are visible. "
        "For example, combine a logo/brand text with a Model name label.\n"
        "If a QR sticker contains a batch code, do not use the batch code as the charger serial unless it is clearly labeled as SN/Serial.\n"
        "Use exactly these keys: charger_serial_number, charger_brand_model, brand_name, model_name, raw_visible_text, confidence_score, uncertainty_notes.\n"
        f"Context hint: {request.photo_hint or 'optional charger label photo'}"
    )

    try:
        image_bytes = read_photo_bytes(request.photo_evidence)
        image_part = genai_types.Part.from_bytes(data=image_bytes, mime_type=request.photo_evidence.media_type)
        response = client.models.generate_content(  # type: ignore[attr-defined]
            model=GEMINI_MODEL,
            contents=[image_part, prompt],
            config=genai_types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=1024,
                response_mime_type="application/json",
                response_schema=_IDENTITY_SCHEMA,
            ),
        )
        raw = (response.text or "").strip()
        data = _extract_json_object(raw)
    except Exception as exc:
        return _fallback_response(str(exc))

    raw_visible_text = _normalize_list(data.get("raw_visible_text"))
    serial = _clean(data.get("charger_serial_number")) or _extract_serial_from_text(" ".join(raw_visible_text))
    brand_model = _combine_brand_model(data)
    confidence = data.get("confidence_score")
    confidence_score = float(confidence) if isinstance(confidence, int | float) else 0.0
    found_any = bool(serial or brand_model)
    return ChargerIdentityScanResponse(
        charger_serial_number=serial,
        charger_brand_model=brand_model,
        confidence_score=max(0.0, min(confidence_score, 1.0)),
        source="vlm",
        raw_visible_text=raw_visible_text,
        note=(
            "Charger label details were read from the optional label photo. Please confirm or edit before creating the ticket."
            if found_any
            else "The charger label photo was scanned, but no reliable serial or brand/model was readable."
        ),
        provider_attempted=True,
        fallback_used=False,
    )
