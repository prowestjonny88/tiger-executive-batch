from __future__ import annotations

from app.core.models import ConfidenceAssessment, ConfidenceBand, DiagnosisResult


def assess_confidence(diagnosis: DiagnosisResult) -> ConfidenceAssessment:
    score = diagnosis.confidence_score
    band = diagnosis.confidence_band
    novelty_detected = diagnosis.unknown_flag or diagnosis.known_case_hit is None
    requires_follow_up = diagnosis.requires_follow_up or band == ConfidenceBand.LOW

    rationale_parts = [diagnosis.confidence_reasoning or "Confidence derived from Round 1 retrieval alignment."]
    if diagnosis.known_case_hit:
        rationale_parts.append(
            f"Matched {diagnosis.known_case_hit.canonical_file_name} with score {diagnosis.known_case_hit.match_score:.2f}."
        )
    if diagnosis.hazard_level == "high":
        rationale_parts.append("High hazard level keeps the case on the conservative path.")
    if novelty_detected:
        rationale_parts.append("Novel or weakly matched evidence requires follow-up or higher-tier review.")

    return ConfidenceAssessment(
        score=score,
        band=band,
        requires_follow_up=requires_follow_up,
        novelty_detected=novelty_detected,
        rationale=" ".join(rationale_parts),
    )

