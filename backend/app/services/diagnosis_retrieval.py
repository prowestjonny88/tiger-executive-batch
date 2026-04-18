from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.core.models import (
    IncidentInput,
    KbCandidateHit,
    KbRetrievalResult,
    KnownCaseHit,
    PerceptionResult,
    RetrievalMetadata,
    StructuredEvidence,
)
from app.services.diagnosis_fallback import infer_issue_family
from app.services.diagnosis_gate import decide_kb_gate
from app.services.embeddings import cosine_similarity, get_embedding_provider
from app.services.round1_dataset import round1_case_text_index, round1_image_path, round1_known_cases


@dataclass(frozen=True)
class RetrievalAssessment:
    issue_family_hint: str
    evidence_type: str
    query_text: str
    kb_retrieval: KbRetrievalResult
    known_case_hit: KnownCaseHit | None
    retrieval_metadata: RetrievalMetadata | None
    strong_retrieval: bool
    default_summary: str


@lru_cache(maxsize=8)
def _cached_text_vectors(provider_name: str, provider_mode: str) -> dict[str, list[float]]:
    provider = get_embedding_provider()
    return {filename: provider.embed_text(indexed_text) for filename, indexed_text in round1_case_text_index().items()}


@lru_cache(maxsize=8)
def _cached_image_vectors(provider_name: str, provider_mode: str) -> dict[str, list[float]]:
    provider = get_embedding_provider()
    vectors: dict[str, list[float]] = {}
    for case in round1_known_cases():
        image_path = round1_image_path(case.canonical_file_name)
        if image_path is not None:
            vectors[case.canonical_file_name] = provider.embed_image(image_path)
    return vectors


def _resolve_query_image_path(storage_path: str | None) -> Path | None:
    if not storage_path:
        return None
    candidate = Path(storage_path)
    if candidate.is_absolute() and candidate.exists():
        return candidate
    backend_root = Path(__file__).resolve().parents[2]
    repo_root = backend_root.parent
    for base in (backend_root, repo_root):
        resolved = base / storage_path
        if resolved.exists():
            return resolved
    return None


def _compatible_bonus(evidence: StructuredEvidence, case: KnownCaseHit) -> tuple[float, float, list[str]]:
    score = 0.0
    compatibility = 0.4
    notes: list[str] = []

    if evidence.evidence_type == case.evidence_type:
        score += 0.08
        compatibility += 0.2
        notes.append("Evidence type aligned.")
    elif evidence.evidence_type == "mixed_photo" and case.evidence_type in {"hardware_photo", "symptom_heavy_photo"}:
        score += 0.04
        compatibility += 0.1
    elif evidence.evidence_type == "symptom_report":
        notes.append("Text-only evidence limits KB compatibility confidence.")
    else:
        compatibility -= 0.18
        notes.append("Evidence type is only partially compatible.")

    if case.component_primary and case.component_primary in evidence.components_visible:
        score += 0.08
        compatibility += 0.15
        notes.append("Primary component matched visual evidence.")

    overlap = set(evidence.visible_abnormalities) & set(case.visible_abnormalities)
    if overlap:
        score += min(0.14, 0.04 * len(overlap))
        compatibility += 0.15
        notes.append("Visible abnormality pattern aligned.")
    elif evidence.visible_abnormalities and case.visible_abnormalities:
        compatibility -= 0.08
        notes.append("Abnormality pattern mismatch reduced confidence.")

    ocr_overlap = {item.lower() for item in evidence.ocr_findings} & {
        token.lower() for token in [case.canonical_file_name, case.fault_type, case.issue_family, case.visual_observation]
    }
    if ocr_overlap:
        score += 0.04
        compatibility += 0.05
        notes.append("OCR findings supported the candidate.")

    if evidence.hazard_signals and case.hazard_level == "high":
        score += 0.04
        compatibility += 0.05
        notes.append("Hazard implication aligned.")

    compatibility = max(min(compatibility, 1.0), 0.0)
    return score, compatibility, notes


def _candidate_from_case(
    case: KnownCaseHit,
    match_score: float,
    compatibility_score: float,
    text_score: float,
    image_score: float,
    notes: list[str],
    match_reason: str,
) -> KbCandidateHit:
    return KbCandidateHit(
        canonical_file_name=case.canonical_file_name,
        match_score=max(min(match_score, 1.0), 0.0),
        compatibility_score=compatibility_score,
        fault_type=case.fault_type,
        issue_family=case.issue_family,
        evidence_type=case.evidence_type,
        hazard_level=case.hazard_level,
        resolver_tier=case.resolver_tier,
        recommended_next_step=case.recommended_next_step,
        required_proof_next=case.required_proof_next,
        visual_observation=case.visual_observation,
        engineering_rationale=case.engineering_rationale,
        match_reason=match_reason,
        component_primary=case.component_primary,
        visible_abnormalities=case.visible_abnormalities,
        retrieval_source=case.retrieval_source,
        text_score=round(max(text_score, 0.0), 4),
        image_score=round(max(image_score, 0.0), 4),
        compatibility_notes=notes,
    )


def _kb_to_known_case(candidate: KbCandidateHit | None) -> KnownCaseHit | None:
    if candidate is None:
        return None
    return KnownCaseHit(
        canonical_file_name=candidate.canonical_file_name,
        match_score=candidate.match_score,
        fault_type=candidate.fault_type,
        issue_family=candidate.issue_family,
        evidence_type=candidate.evidence_type,
        hazard_level=candidate.hazard_level,
        resolver_tier=candidate.resolver_tier,
        recommended_next_step=candidate.recommended_next_step,
        required_proof_next=candidate.required_proof_next,
        visual_observation=candidate.visual_observation,
        engineering_rationale=candidate.engineering_rationale,
        match_reason=candidate.match_reason,
        component_primary=candidate.component_primary,
        visible_abnormalities=candidate.visible_abnormalities,
        retrieval_source=candidate.retrieval_source,
    )


def assess_retrieval(incident: IncidentInput, perception: PerceptionResult, evidence: StructuredEvidence) -> RetrievalAssessment:
    provider = get_embedding_provider()
    text_vectors = _cached_text_vectors(provider.name, provider.mode)
    image_vectors = _cached_image_vectors(provider.name, provider.mode)
    query_text = evidence.semantic_summary or incident.site_id
    query_vector = provider.embed_text(query_text)
    query_image_path = _resolve_query_image_path(incident.photo_evidence.storage_path) if incident.photo_evidence else None
    query_image_vector = provider.embed_image(query_image_path) if query_image_path is not None else None

    candidates: list[KbCandidateHit] = []
    for case in round1_known_cases():
        text_score = cosine_similarity(query_vector, text_vectors.get(case.canonical_file_name, []))
        image_score = (
            cosine_similarity(query_image_vector, image_vectors.get(case.canonical_file_name, []))
            if query_image_vector is not None
            else 0.0
        )
        image_weight = 0.55 if query_image_vector is not None and evidence.evidence_type != "screenshot" else 0.15
        if evidence.evidence_type == "screenshot":
            image_weight = 0.05
        text_weight = 1.0 - image_weight
        semantic_bonus, compatibility_score, notes = _compatible_bonus(evidence, case)
        score = (text_score * text_weight) + (image_score * image_weight) + semantic_bonus
        if incident.photo_evidence and incident.photo_evidence.filename == case.canonical_file_name:
            score = max(score, 0.99)
            compatibility_score = max(compatibility_score, 0.9)
            notes.append("Exact filename shortcut matched the KB image.")
        elif image_score >= 0.9 and evidence.evidence_type in {"hardware_photo", "symptom_heavy_photo", "mixed_photo"}:
            score = max(score, 0.9)
            compatibility_score = max(compatibility_score, 0.8)
            notes.append("High image similarity strongly matched the KB case.")
        elif image_score >= 0.75 and evidence.evidence_type in {"hardware_photo", "symptom_heavy_photo", "mixed_photo"}:
            score = max(score, 0.72)
            compatibility_score = max(compatibility_score, 0.7)
            notes.append("Image similarity materially supported the KB case.")
        score = max(min(score, 1.0), 0.0)
        match_reason = "hybrid_semantic_retrieval" if query_image_vector is not None else "semantic_text_retrieval"
        candidates.append(
            _candidate_from_case(
                case=case,
                match_score=score,
                compatibility_score=compatibility_score,
                text_score=text_score,
                image_score=image_score,
                notes=notes,
                match_reason=match_reason,
            )
        )

    candidates.sort(key=lambda item: (item.match_score, item.compatibility_score), reverse=True)
    top_candidates = candidates[:3]
    primary = top_candidates[0] if top_candidates else None
    gate_decision, gate_reason, accept_threshold, weak_threshold, gate_notes = decide_kb_gate(
        evidence,
        primary,
        query_image_vector is not None,
    )
    if primary is not None:
        primary.compatibility_notes.extend(note for note in gate_notes if note not in primary.compatibility_notes)

    kb_retrieval = KbRetrievalResult(
        query_text=query_text,
        provider_name=provider.name,
        provider_mode=provider.mode,
        gate_decision=gate_decision,
        gate_reason=gate_reason,
        candidate_count=len(candidates),
        primary_candidate=primary,
        candidates=top_candidates,
        rejection_threshold=accept_threshold,
        weak_threshold=weak_threshold,
        image_embedding_used=query_image_vector is not None,
        text_embedding_used=True,
        compatibility_notes=gate_notes,
        extra={
            "query_image_path": str(query_image_path) if query_image_path is not None else None,
            "perception_mode": perception.mode,
        },
    )

    accepted_case = _kb_to_known_case(primary) if gate_decision == "accepted" else None
    retrieval_metadata = RetrievalMetadata(
        provider_name=provider.name,
        provider_mode=provider.mode,
        query_text=query_text,
        image_embedding_used=query_image_vector is not None,
        text_embedding_used=True,
        candidate_count=len(candidates),
        match_state=(
            "accepted"
            if gate_decision == "accepted"
            else "weak"
            if gate_decision == "contextual_only"
            else "rejected"
        ),
        selected_case=accepted_case.canonical_file_name if accepted_case else None,
        selected_score=round(primary.match_score, 4) if primary is not None else None,
        rejection_threshold=accept_threshold,
        extra={
            "top_candidate": primary.canonical_file_name if primary is not None else None,
            "top_candidate_issue_family": primary.issue_family if primary is not None else None,
            "weak_threshold": weak_threshold,
            "gate_decision": gate_decision,
        },
    )

    return RetrievalAssessment(
        issue_family_hint=infer_issue_family(incident),
        evidence_type=evidence.evidence_type,
        query_text=query_text,
        kb_retrieval=kb_retrieval,
        known_case_hit=accepted_case,
        retrieval_metadata=retrieval_metadata,
        strong_retrieval=gate_decision == "accepted",
        default_summary=incident.symptom_text or incident.photo_hint or perception.scene_summary,
    )
