from __future__ import annotations

from app.core.models import ConfidenceAssessment, ConfidenceBand, DiagnosisResult


def assess_confidence(diagnosis: DiagnosisResult) -> ConfidenceAssessment:
    safety_override = bool(diagnosis.hazard_flags)
    requires_confirmation = (
        diagnosis.confidence_band == ConfidenceBand.MEDIUM or diagnosis.unknown_flag
    ) and not safety_override

    if safety_override:
        rationale = "Visible hazard evidence overrides model confidence and forces immediate escalation."
    elif requires_confirmation:
        rationale = "Organizer basic checks remain incomplete or medium-confidence, so confirmation is required."
    elif diagnosis.confidence_band == ConfidenceBand.LOW:
        rationale = "Low-confidence diagnosis requires conservative escalation."
    else:
        rationale = "Confidence is sufficient to apply the organizer decision tree directly."

    return ConfidenceAssessment(
        score=diagnosis.confidence_score,
        band=diagnosis.confidence_band,
        requires_confirmation=requires_confirmation,
        safety_override=safety_override,
        rationale=rationale,
    )
