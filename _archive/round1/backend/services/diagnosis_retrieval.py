from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from app.core.models import (
    IncidentInput,
    KbCandidateHit,
    KbRetrievalResult,
    KnownCaseHit,
    RetrievalMetadata,
    StructuredEvidence,
)
from app.db.persistence import fetch_known_case_candidates, get_known_case_index_status, init_db, upsert_known_case_index_entry
from app.services.diagnosis_fallback import infer_issue_family
from app.services.diagnosis_gate import decide_kb_gate
from app.services.embeddings import (
    EMBEDDING_DIMENSION,
    get_embedding_provider,
    get_embedding_runtime_status,
    get_exact_image_shortcut_mode,
)
from app.services.round1_dataset import round1_case_text, round1_image_path, round1_known_case_map, round1_known_cases


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


def _isoformat_or_value(value: object) -> object:
    if hasattr(value, "isoformat"):
        return value.isoformat()  # type: ignore[attr-defined]
    return value


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


def _compatible_evidence_types(evidence_type: str) -> list[str]:
    if evidence_type == "hardware_photo":
        return ["hardware_photo", "symptom_heavy_photo", "mixed_photo"]
    if evidence_type == "symptom_heavy_photo":
        return ["symptom_heavy_photo", "hardware_photo", "mixed_photo"]
    if evidence_type == "mixed_photo":
        return ["mixed_photo", "hardware_photo", "symptom_heavy_photo"]
    if evidence_type == "screenshot":
        return ["screenshot"]
    if evidence_type == "symptom_report":
        return ["symptom_report", "symptom_heavy_photo", "screenshot", "unknown"]
    return ["hardware_photo", "symptom_heavy_photo", "screenshot", "mixed_photo", "unknown"]


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
    *,
    match_score: float,
    compatibility_score: float,
    text_score: float,
    image_score: float,
    notes: list[str],
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
        match_reason="pgvector_hybrid_retrieval",
        component_primary=case.component_primary,
        visible_abnormalities=case.visible_abnormalities,
        retrieval_source=case.retrieval_source,
        text_score=round(max(text_score, 0.0), 4),
        image_score=round(max(image_score, 0.0), 4),
        compatibility_notes=notes,
    )


def _perception_contradicts_case(evidence: StructuredEvidence, case: KnownCaseHit) -> bool:
    if evidence.evidence_type == "screenshot" and case.evidence_type != "screenshot":
        return True
    if evidence.visible_abnormalities and case.visible_abnormalities:
        overlap = set(evidence.visible_abnormalities) & set(case.visible_abnormalities)
        if not overlap:
            return True
    return False


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


def _ensure_known_case_index(provider_name: str, provider_mode: str) -> dict[str, object]:
    init_db()
    status = get_known_case_index_status()
    cases = round1_known_cases()
    if (
        status.get("row_count") == len(cases)
        and status.get("embedding_provider") == provider_name
        and status.get("embedding_mode") == provider_mode
        and status.get("embedding_dimension") == EMBEDDING_DIMENSION
        and status.get("descriptor_schema_version")
    ):
        return status

    provider = get_embedding_provider()
    for case in cases:
        image_path = round1_image_path(case.canonical_file_name)
        descriptor_artifact = provider.image_descriptor_artifact(image_path) if image_path is not None else None
        upsert_known_case_index_entry(
            case_key=case.canonical_file_name,
            payload=case.model_dump(),
            text_embedding=provider.embed_text(round1_case_text(case)),
            image_embedding=provider.embed_image(image_path) if image_path is not None else None,
            descriptor_artifact=descriptor_artifact,
            descriptor_schema_version=provider.retrieval_descriptor_schema_version,
            evidence_type=case.evidence_type,
            issue_family=case.issue_family,
            hazard_level=case.hazard_level,
            component_primary=case.component_primary,
            abnormalities=case.visible_abnormalities,
            embedding_provider=provider.name,
            embedding_mode=provider.mode,
        )
    return get_known_case_index_status()


def assess_retrieval(incident: IncidentInput, perception, evidence: StructuredEvidence) -> RetrievalAssessment:
    provider = get_embedding_provider()
    runtime_status = get_embedding_runtime_status(provider)
    index_status = _ensure_known_case_index(provider.name, provider.mode)
    query_text = evidence.retrieval_text or incident.site_id
    query_text_vector = provider.embed_text(query_text)
    query_image_path = _resolve_query_image_path(incident.photo_evidence.storage_path) if incident.photo_evidence else None
    query_descriptor_artifact = provider.image_descriptor_artifact(query_image_path) if query_image_path is not None else None
    query_image_vector = provider.embed_image(query_image_path) if query_image_path is not None else None
    exact_image_fingerprint_enabled = bool(runtime_status["exact_image_fingerprint_enabled"]) and query_image_vector is not None
    semantic_image_enabled = bool(runtime_status["semantic_image_enabled"]) and query_image_vector is not None
    exact_image_shortcut_mode = get_exact_image_shortcut_mode()

    exact_case = None
    if incident.photo_evidence and incident.photo_evidence.filename:
        exact_case = round1_known_case_map().get(incident.photo_evidence.filename)

    raw_rows = fetch_known_case_candidates(
        query_text_embedding=query_text_vector,
        query_image_embedding=query_image_vector,
        evidence_types=_compatible_evidence_types(evidence.evidence_type),
        limit=6,
    )

    candidates: list[KbCandidateHit] = []
    exact_image_shortcut_used = False
    structured_compatibility_confirmed = False
    shortcut_block_reason: str | None = None
    for row in raw_rows:
        payload = row.get("payload_json") or {}
        case = KnownCaseHit.model_validate(payload)
        text_score = float(row.get("text_score") or 0.0)
        image_score = float(row.get("image_score") or 0.0)
        semantic_bonus, compatibility_score, notes = _compatible_bonus(evidence, case)
        image_weight = 0.42 if semantic_image_enabled and evidence.evidence_type != "screenshot" else 0.08
        if evidence.evidence_type == "screenshot":
            image_weight = 0.03 if semantic_image_enabled else 0.01
        text_weight = 1.0 - image_weight
        score = max(min((text_score * text_weight) + (image_score * image_weight) + semantic_bonus, 1.0), 0.0)
        exact_filename_match = exact_case is not None and case.canonical_file_name == exact_case.canonical_file_name
        exact_fingerprint_match = exact_image_fingerprint_enabled and image_score >= 0.999
        contradiction = _perception_contradicts_case(evidence, case)
        shortcut_compatible = compatibility_score >= 0.55 and not contradiction
        if exact_filename_match or exact_fingerprint_match:
            if exact_image_shortcut_mode == "off":
                if shortcut_block_reason is None:
                    shortcut_block_reason = "Exact-image shortcuts are disabled by runtime policy."
                notes.append("Exact-image shortcut was available but disabled by policy.")
            elif exact_image_shortcut_mode == "guarded" and not shortcut_compatible:
                if shortcut_block_reason is None:
                    shortcut_block_reason = (
                        "Exact-image shortcut was blocked because structured evidence did not confirm the match."
                    )
                notes.append("Exact-image shortcut was blocked until structured evidence compatibility was confirmed.")
            else:
                score = max(score, 0.99 if exact_filename_match else 0.93)
                compatibility_score = max(compatibility_score, 0.9 if exact_filename_match else 0.82)
                exact_image_shortcut_used = True
                structured_compatibility_confirmed = shortcut_compatible
                notes.append(
                    "Exact filename shortcut matched the KB image."
                    if exact_filename_match
                    else "Exact-image fingerprint matched the KB case."
                )
        elif semantic_image_enabled and image_score >= 0.9 and evidence.evidence_type in {"hardware_photo", "symptom_heavy_photo", "mixed_photo"}:
            score = max(score, 0.9)
            compatibility_score = max(compatibility_score, 0.8)
            notes.append("Semantic image similarity strongly matched the KB case.")
        elif semantic_image_enabled and image_score >= 0.75 and evidence.evidence_type in {"hardware_photo", "symptom_heavy_photo", "mixed_photo"}:
            score = max(score, 0.72)
            compatibility_score = max(compatibility_score, 0.7)
            notes.append("Semantic image similarity materially supported the KB case.")
        elif query_image_vector is not None and image_score >= 0.9:
            notes.append("Strong image signal detected, but candidate trust still depends on structured evidence.")
        candidates.append(
            _candidate_from_case(
                case,
                match_score=score,
                compatibility_score=compatibility_score,
                text_score=text_score,
                image_score=image_score,
                notes=notes,
            )
        )

    candidates.sort(key=lambda item: (item.match_score, item.compatibility_score), reverse=True)
    top_candidates = candidates[:3]
    primary = top_candidates[0] if top_candidates else None
    gate_decision, gate_basis, accept_threshold, weak_threshold, gate_notes, margin, stable_neighborhood, consensus = decide_kb_gate(
        evidence,
        top_candidates,
        query_image_vector is not None,
    )
    if primary is not None:
        primary.compatibility_notes.extend(note for note in gate_notes if note not in primary.compatibility_notes)
    runtime_warnings = runtime_status.get("warnings")
    warnings = [str(warning) for warning in runtime_warnings] if isinstance(runtime_warnings, list) else []
    image_signal_trust = (
        "semantic"
        if semantic_image_enabled
        else "exact_image_shortcut_only"
        if exact_image_fingerprint_enabled
        else "disabled"
    )
    gate_basis_detail = (
        "Accepted with semantic image agreement and structured evidence."
        if gate_decision == "accepted" and semantic_image_enabled and primary is not None and (primary.image_score or 0.0) >= 0.75
        else "Accepted with structured evidence support plus an exact-image shortcut."
        if gate_decision == "accepted" and exact_image_shortcut_used
        else "Accepted from structured evidence and KB compatibility."
        if gate_decision == "accepted"
        else "Candidate set informed reasoning, but no case was strong enough to anchor directly."
        if gate_decision == "contextual_only"
        else "No candidate cleared compatibility and confidence requirements."
    )

    kb_retrieval = KbRetrievalResult(
        query_text=query_text,
        provider_name=provider.name,
        provider_mode=provider.mode,
        gate_decision=gate_decision,
        gate_basis=gate_basis,
        candidate_count=len(candidates),
        primary_candidate=primary,
        candidates=top_candidates,
        rejection_threshold=accept_threshold,
        weak_threshold=weak_threshold,
        image_embedding_used=query_image_vector is not None,
        text_embedding_used=True,
        top_family_consensus=consensus,  # type: ignore[arg-type]
        score_margin_top2=round(margin, 4) if margin is not None else None,
        stable_neighborhood=stable_neighborhood,
        compatibility_notes=gate_notes,
        extra={
            "query_image_path": str(query_image_path) if query_image_path is not None else None,
            "query_retrieval_descriptor": query_descriptor_artifact,
            "perception_mode": perception.mode,
            "retrieval_backend": "postgres_pgvector",
            "index_row_count": index_status.get("row_count"),
            "index_latest_created_at": _isoformat_or_value(index_status.get("latest_created_at")),
            "embedding_dimension": EMBEDDING_DIMENSION,
            "retrieval_descriptor_schema_version": runtime_status["retrieval_descriptor_schema_version"],
            "image_mode": runtime_status["image_mode"],
            "retrieval_signal_mode": runtime_status["retrieval_signal_mode"],
            "exact_image_fingerprint_enabled": runtime_status["exact_image_fingerprint_enabled"],
            "exact_image_shortcut_mode": exact_image_shortcut_mode,
            "exact_image_shortcut_used": exact_image_shortcut_used,
            "structured_compatibility_confirmed": structured_compatibility_confirmed,
            "shortcut_block_reason": shortcut_block_reason,
            "embedding_provider_name": runtime_status["provider_name"],
            "embedding_provider_mode": runtime_status["provider_mode"],
            "image_signal_trust": image_signal_trust,
            "gate_basis_detail": gate_basis_detail,
            "warnings": warnings,
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
            "gate_basis": gate_basis,
            "gate_basis_detail": gate_basis_detail,
            "retrieval_backend": "postgres_pgvector",
            "score_margin_top2": round(margin, 4) if margin is not None else None,
            "top_family_consensus": consensus,
            "retrieval_descriptor_schema_version": runtime_status["retrieval_descriptor_schema_version"],
            "image_mode": runtime_status["image_mode"],
            "retrieval_signal_mode": runtime_status["retrieval_signal_mode"],
            "exact_image_fingerprint_enabled": runtime_status["exact_image_fingerprint_enabled"],
            "exact_image_shortcut_mode": exact_image_shortcut_mode,
            "exact_image_shortcut_used": exact_image_shortcut_used,
            "structured_compatibility_confirmed": structured_compatibility_confirmed,
            "shortcut_block_reason": shortcut_block_reason,
            "image_signal_trust": image_signal_trust,
            "warnings": warnings,
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
