from __future__ import annotations

from app.core.models import IncidentInput, SeverityLevel
from app.services.diagnosis_contracts import DiagnosisProviderResponse
from app.services.diagnosis_support import (
    extract_visible_hazard_flags,
    infer_basic_conditions,
    infer_issue_type,
    issue_type_from_issue_type_detail,
    likely_fault_for,
    severity_for,
    text_blob,
)
from app.services.gemini_client import get_gemini_client


def analyze_symptom_branch(incident: IncidentInput) -> DiagnosisProviderResponse:
    basic_conditions = infer_basic_conditions(incident)
    text = text_blob(incident)
    issue_type = infer_issue_type(incident, basic_conditions)
    detail_issue_type = issue_type_from_issue_type_detail(incident.follow_up_answers.get("issue_type_detail"))
    if detail_issue_type is not None:
        issue_type = detail_issue_type

    hazard_flags = extract_visible_hazard_flags(text, basic_conditions)
    likely_fault = likely_fault_for(issue_type, basic_conditions)
    confidence_score = 0.76
    next_question_hint = None
    next_action_hint = "Use follow-up answers as the primary signal and collect any missing organizer basic checks."
    diagnosis_source = "symptom_multimodal_heuristic"

    if "charger no pulse" in text or "no pulse" in text or "not charging" in text:
        issue_type = "not_responding"
        likely_fault = "Session did not start or pulse was not detected"
        confidence_score = 0.82 if basic_conditions.indicator_or_error_code != "unknown" else 0.72
        next_question_hint = "Confirm whether the screen is on and whether an error code is visible."
    elif "screen off" in text or "no display" in text or "display off" in text:
        issue_type = "no_power" if basic_conditions.main_power_supply == "problem" else "not_responding"
        likely_fault = "Display or control path appears inactive"
        confidence_score = 0.79
        next_question_hint = "Confirm incoming power and whether any indicator LED remains active."
    elif "charging stopped suddenly" in text or "stopped suddenly" in text:
        issue_type = "tripping_mcb_rccb" if basic_conditions.cable_condition == "problem" else issue_type
        likely_fault = "Charging interrupted unexpectedly"
        confidence_score = 0.74
        next_question_hint = "Confirm breaker state and whether overheating or looseness is visible."

    if hazard_flags:
        confidence_score = max(confidence_score, 0.9)

    if get_gemini_client() is not None:
        diagnosis_source = "symptom_multimodal_hybrid"

    severity = severity_for(issue_type, basic_conditions, hazard_flags, confidence_score)
    if "visible_hazard" in hazard_flags:
        severity = SeverityLevel.CRITICAL

    return DiagnosisProviderResponse(
        provider_summary="Symptom multimodal branch used symptom text, follow-up answers, and optional error-code context.",
        issue_type=issue_type,
        likely_fault=likely_fault,
        confidence_score=confidence_score,
        raw_ocr_text=incident.error_code or "",
        severity=severity,
        basic_conditions=basic_conditions,
        hazard_flags=hazard_flags,
        diagnosis_source=diagnosis_source,
        branch_name="symptom_multimodal_branch",
        next_question_hint=next_question_hint,
        next_action_hint=next_action_hint,
        classifier_metadata={
            "enabled": False,
            "used": False,
            "bypassed": True,
            "bypass_reason": "symptom_heavy_case",
            "confidence_policy_action": "bypass_classifier",
            "candidate_labels": [],
            "extra": {},
        },
        ocr_metadata=None,
    )
