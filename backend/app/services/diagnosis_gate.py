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


def _family_consensus(candidates: list[KbCandidateHit]) -> list[str]:
    ordered: list[str] = []
    for candidate in candidates:
        if candidate.issue_family not in ordered:
            ordered.append(candidate.issue_family)
    return ordered


def decide_kb_gate(
    evidence: StructuredEvidence,
    candidates: list[KbCandidateHit],
    has_image_vector: bool,
) -> tuple[KbGateDecision, str, float, float, list[str], float | None, bool, list[str]]:
    accept_threshold, weak_threshold = score_thresholds(evidence.evidence_type, has_image_vector)
    if not candidates:
        return "rejected", "No compatible KB candidate was retrieved.", accept_threshold, weak_threshold, [], None, False, []

    primary_candidate = candidates[0]
    secondary_candidate = candidates[1] if len(candidates) > 1 else None
    penalty, notes = compatibility_penalty(evidence, primary_candidate)
    effective_score = max(primary_candidate.match_score - penalty, 0.0)
    margin = max(primary_candidate.match_score - (secondary_candidate.match_score if secondary_candidate else 0.0), 0.0)
    consensus = _family_consensus(candidates[:3])
    stable_neighborhood = len(consensus) == 1 and margin <= 0.22

    if effective_score >= accept_threshold and primary_candidate.compatibility_score >= 0.55 and margin >= 0.05:
        basis = "Top candidate passed score, compatibility, and separation thresholds."
        if stable_neighborhood:
            basis += " Nearby candidates also agreed on the same family."
        return "accepted", basis, accept_threshold, weak_threshold, notes, margin, stable_neighborhood, consensus
    if effective_score >= weak_threshold:
        basis = "Candidate set provides contextual guidance but not a trustworthy anchor."
        if stable_neighborhood:
            basis += " Top candidates clustered on the same family, so family-level context is preserved."
        return "contextual_only", basis, accept_threshold, weak_threshold, notes, margin, stable_neighborhood, consensus
    return "rejected", "Nearest KB candidates did not pass the decision gate.", accept_threshold, weak_threshold, notes, margin, stable_neighborhood, consensus
