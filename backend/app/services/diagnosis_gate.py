from __future__ import annotations

from app.core.models import EvidenceType, KbCandidateHit, KbGateDecision, StructuredEvidence


def score_thresholds(evidence_type: EvidenceType, has_image_vector: bool) -> tuple[float, float]:
    if evidence_type == "hardware_photo":
        return (0.72, 0.56) if has_image_vector else (0.78, 0.60)
    if evidence_type == "symptom_heavy_photo":
        return (0.66, 0.52) if has_image_vector else (0.70, 0.54)
    if evidence_type == "screenshot":
        return (0.70, 0.56)
    if evidence_type == "symptom_report":
        return (0.58, 0.46)
    return (0.62, 0.50)


def compatibility_penalty(evidence: StructuredEvidence, candidate: KbCandidateHit) -> tuple[float, list[str]]:
    notes: list[str] = []
    penalty = 0.0

    if evidence.evidence_type == "screenshot" and candidate.evidence_type != "screenshot":
        penalty += 0.28
        notes.append("Candidate evidence type conflicts with screenshot-first perception.")
    if evidence.evidence_type in {"hardware_photo", "mixed_photo"} and candidate.evidence_type == "screenshot":
        penalty += 0.22
        notes.append("Screenshot candidate conflicts with hardware-photo perception.")
    if evidence.visible_abnormalities and candidate.visible_abnormalities:
        overlap = set(evidence.visible_abnormalities) & set(candidate.visible_abnormalities)
        if not overlap:
            penalty += 0.12
            notes.append("Visible abnormality pattern does not align tightly with the candidate.")
    if evidence.components_visible and candidate.component_primary:
        if candidate.component_primary not in evidence.components_visible:
            penalty += 0.08
            notes.append("Primary candidate component is not clearly visible in the evidence.")

    return penalty, notes


def decide_kb_gate(
    evidence: StructuredEvidence,
    primary_candidate: KbCandidateHit | None,
    has_image_vector: bool,
) -> tuple[KbGateDecision, str, float, float, list[str]]:
    accept_threshold, weak_threshold = score_thresholds(evidence.evidence_type, has_image_vector)
    if primary_candidate is None:
        return "rejected", "No compatible KB candidate was retrieved.", accept_threshold, weak_threshold, []

    penalty, notes = compatibility_penalty(evidence, primary_candidate)
    effective_score = max(primary_candidate.match_score - penalty, 0.0)

    if effective_score >= accept_threshold and primary_candidate.compatibility_score >= 0.55:
        return "accepted", "Primary KB candidate passed score and compatibility thresholds.", accept_threshold, weak_threshold, notes
    if effective_score >= weak_threshold:
        return "contextual_only", "Primary KB candidate is relevant context but not strong enough to anchor the diagnosis.", accept_threshold, weak_threshold, notes
    return "rejected", "Nearest KB candidate did not pass the decision gate.", accept_threshold, weak_threshold, notes
