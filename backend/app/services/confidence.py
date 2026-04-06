from __future__ import annotations

from app.core.models import ConfidenceAssessment, ConfidenceBand, DiagnosisResult


def assess_confidence(diagnosis: DiagnosisResult) -> ConfidenceAssessment:
    safety_override = bool(diagnosis.hazard_flags)
    requires_confirmation = diagnosis.confidence_band == ConfidenceBand.MEDIUM and not safety_override

    if safety_override:
        rationale = "Visible hazard evidence overrides model confidence and forces safe escalation."
    elif requires_confirmation:
        rationale = "Medium-confidence diagnosis requires 1-2 confirmation questions before low-tier resolution."
    elif diagnosis.confidence_band == ConfidenceBand.LOW:
        rationale = "Low confidence requires conservative escalation."
    else:
        rationale = "High confidence with no hazard override supports normal routing."

    return ConfidenceAssessment(
        score=diagnosis.confidence_score,
        band=diagnosis.confidence_band,
        requires_confirmation=requires_confirmation,
        safety_override=safety_override,
        rationale=rationale,
    )
