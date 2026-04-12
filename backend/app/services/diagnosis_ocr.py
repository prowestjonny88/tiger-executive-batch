from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import cast

from app.core.models import IncidentInput, IssueType, SeverityLevel
from app.services.diagnosis_contracts import DiagnosisProviderResponse
from app.services.diagnosis_support import (
    DIAGNOSIS_CONFIG_DIR,
    extract_visible_hazard_flags,
    infer_basic_conditions,
    likely_fault_for,
    severity_for,
    text_blob,
)
from app.services.gemini_client import GEMINI_MODEL, get_gemini_client

OCR_RULES_PATH = Path(os.getenv("OMNITRIAGE_OCR_RULES_PATH", DIAGNOSIS_CONFIG_DIR / "ocr_keyword_map.json"))
OCR_ENABLED = os.getenv("OMNITRIAGE_OCR_ENABLED", "true").lower() not in {"0", "false", "no"}
OCR_GEMINI_ASSIST = os.getenv("OMNITRIAGE_OCR_GEMINI_ASSIST", "false").lower() in {"1", "true", "yes"}

OCR_PROMPT = """\
Extract only the visible charger or app-screen text from this EV charger incident image.
Return plain text only. Do not explain or add commentary.
"""


@lru_cache(maxsize=1)
def load_ocr_rules() -> list[dict[str, object]]:
    if not OCR_RULES_PATH.exists():
        return []
    return json.loads(OCR_RULES_PATH.read_text(encoding="utf-8"))


def _string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value]


def _float_or(default: float, value: object) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return default
    return default


def _extract_existing_text(incident: IncidentInput) -> str:
    parts = [
        incident.error_code or "",
        incident.photo_hint or "",
        incident.symptom_text or "",
        " ".join(str(value) for value in incident.follow_up_answers.values()),
    ]
    return " ".join(part for part in parts if part).strip()


def _extract_gemini_text(incident: IncidentInput) -> str:
    if not OCR_GEMINI_ASSIST or not incident.photo_evidence:
        return ""
    client = get_gemini_client()
    if client is None:
        return ""

    try:
        from google.genai import types as genai_types  # type: ignore[import-untyped]
        from app.services.diagnosis_classifier import _resolve_photo_path

        image_path = _resolve_photo_path(incident)
        if image_path is None:
            return ""
        response = client.models.generate_content(  # type: ignore[attr-defined]
            model=GEMINI_MODEL,
            contents=[
                genai_types.Part.from_bytes(
                    data=image_path.read_bytes(),
                    mime_type=incident.photo_evidence.media_type,
                ),
                OCR_PROMPT,
            ],
            config=genai_types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=256,
            ),
        )
    except Exception:  # noqa: BLE001
        return ""

    return (response.text or "").strip()


def analyze_ocr_branch(incident: IncidentInput) -> DiagnosisProviderResponse:
    if not OCR_ENABLED:
        raise RuntimeError("ocr_text_branch disabled by config")

    extracted_text = " ".join(filter(None, [_extract_existing_text(incident), _extract_gemini_text(incident)])).strip()
    if not extracted_text:
        raise RuntimeError("ocr_text_branch requires visible or provided text evidence")

    normalized_text = extracted_text.lower()
    basic_conditions = infer_basic_conditions(incident)
    matched_rule = None
    matched_keywords: list[str] = []
    issue_type: IssueType = "not_responding"
    likely_fault = likely_fault_for(issue_type, basic_conditions)
    confidence_score = 0.68
    severity = SeverityLevel.MODERATE
    hazard_flags = extract_visible_hazard_flags(text_blob(incident), basic_conditions)
    resolver_hint_final = "remote_ops"
    next_question_hint = "Retrieve the exact charger fault detail if the visible text is incomplete."
    next_action_hint = "Use the visible display/app text as the primary clue, then verify organizer basic checks."

    for rule in load_ocr_rules():
        keywords = [keyword.lower() for keyword in _string_list(rule.get("keywords", []))]
        if keywords and all(keyword in normalized_text for keyword in keywords):
            matched_rule = str(rule.get("name", "matched_rule"))
            matched_keywords = keywords
            issue_type_candidate = str(rule.get("issue_type", issue_type))
            if issue_type_candidate in {"no_power", "tripping_mcb_rccb", "charging_slow", "not_responding"}:
                issue_type = cast(IssueType, issue_type_candidate)
            likely_fault = str(rule.get("likely_fault", likely_fault))
            confidence_score = _float_or(confidence_score, rule.get("confidence_score", confidence_score))
            severity_raw = str(rule.get("severity", severity.value))
            severity = SeverityLevel(severity_raw) if severity_raw in {level.value for level in SeverityLevel} else severity
            hazard_flags.extend(_string_list(rule.get("hazard_flags", [])))
            resolver_hint_final = str(rule.get("resolver_hint_final", resolver_hint_final))
            next_question_hint = str(rule.get("next_question_hint", next_question_hint))
            next_action_hint = str(rule.get("next_action_hint", next_action_hint))
            break

    if matched_rule is None and "faulted" in normalized_text:
        matched_rule = "faulted_status"
        matched_keywords = ["faulted"]
        issue_type = "not_responding"
        likely_fault = "Faulted charger status detected"
        confidence_score = 0.74
        resolver_hint_final = "remote_ops"
        next_action_hint = "Retrieve fault detail from backend or app log before further action."

    if "over-voltage fault" in normalized_text and "visible_hazard" not in hazard_flags:
        matched_rule = matched_rule or "over_voltage_fault"
        if "over-voltage fault" not in matched_keywords:
            matched_keywords.append("over-voltage fault")
        issue_type = "no_power"
        likely_fault = "Over-voltage fault detected"
        confidence_score = max(confidence_score, 0.92)
        severity = SeverityLevel.CRITICAL
        hazard_flags.append("visible_hazard")
        resolver_hint_final = "technician"
        next_action_hint = "Disconnect supply, inspect incoming voltage path, and escalate for qualified inspection."

    return DiagnosisProviderResponse(
        provider_summary=(
            "OCR text branch interpreted visible charger/app text as the primary signal "
            f"using rule '{matched_rule or 'default_text_interpretation'}'."
        ),
        issue_type=issue_type,
        likely_fault=likely_fault,
        confidence_score=confidence_score,
        raw_ocr_text=extracted_text,
        severity=severity if matched_rule else severity_for(issue_type, basic_conditions, hazard_flags, confidence_score),
        basic_conditions=basic_conditions,
        hazard_flags=list(dict.fromkeys(hazard_flags)),
        diagnosis_source="ocr_text_interpretation",
        branch_name="ocr_text_branch",
        resolver_hint_final=resolver_hint_final,
        next_question_hint=next_question_hint,
        next_action_hint=next_action_hint,
        classifier_metadata={
            "enabled": False,
            "used": False,
            "bypassed": True,
            "bypass_reason": "screenshot_or_text_evidence",
            "confidence_policy_action": "bypass_classifier",
            "candidate_labels": [],
            "extra": {},
        },
        ocr_metadata={
            "extracted_text": extracted_text,
            "matched_rule": matched_rule,
            "matched_keywords": matched_keywords,
            "extra": {
                "ocr_assist_enabled": OCR_GEMINI_ASSIST,
            },
        },
    )
