from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

from app.core.models import EvidenceType, KnownCaseHit, RetrievalMetadata
from app.services.embeddings import cosine_similarity, get_embedding_provider
from app.services.round1_dataset import round1_case_text_index, round1_image_path, round1_known_case_map, round1_known_cases


@dataclass(frozen=True)
class RetrievalQuery:
    text: str
    evidence_type: EvidenceType
    image_filename: str | None = None
    image_storage_path: str | None = None


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


def _score_weights(evidence_type: EvidenceType, has_image_vector: bool) -> tuple[float, float]:
    if not has_image_vector:
        return 1.0, 0.0
    if evidence_type == "hardware_photo":
        return 0.2, 0.8
    if evidence_type == "symptom_heavy_photo":
        return 0.4, 0.6
    if evidence_type == "screenshot":
        return 0.8, 0.2
    return 1.0, 0.0


def _compatible_evidence_types(evidence_type: EvidenceType) -> set[EvidenceType]:
    if evidence_type == "hardware_photo":
        return {"hardware_photo", "symptom_heavy_photo"}
    if evidence_type == "symptom_heavy_photo":
        return {"symptom_heavy_photo", "hardware_photo"}
    if evidence_type == "screenshot":
        return {"screenshot"}
    if evidence_type == "symptom_report":
        return {"symptom_report", "symptom_heavy_photo", "screenshot"}
    return {"symptom_report", "screenshot", "unknown"}


def _score_thresholds(evidence_type: EvidenceType, has_image_vector: bool) -> tuple[float, float]:
    if evidence_type == "hardware_photo":
        return (0.68, 0.52) if has_image_vector else (0.78, 0.60)
    if evidence_type == "symptom_heavy_photo":
        return (0.62, 0.48) if has_image_vector else (0.64, 0.50)
    if evidence_type == "screenshot":
        return (0.64, 0.50)
    if evidence_type == "symptom_report":
        return (0.54, 0.42)
    return (0.58, 0.45)


def _query_signal_bonus(query_text: str, case: KnownCaseHit, evidence_type: EvidenceType) -> float:
    text = query_text.lower()
    bonus = 0.0
    if any(token in text for token in ["wc apps", "faulted", "over-voltage", "error log", "app screen"]):
        if case.evidence_type == "screenshot":
            bonus += 0.12
        else:
            bonus -= 0.20
    if any(token in text for token in ["mcb", "rccb", "trip", "breaker"]):
        if case.issue_family == "tripping":
            bonus += 0.08
        else:
            bonus -= 0.12
    if any(token in text for token in ["no power", "no pulse", "lights off", "display off", "dead"]):
        if case.issue_family == "no_power":
            bonus += 0.08
        else:
            bonus -= 0.10
    if any(token in text for token in ["slow", "reduced output", "vehicle limitation", "voltage drop"]):
        if case.issue_family == "charging_slow":
            bonus += 0.08
        else:
            bonus -= 0.10
    if any(token in text for token in ["not responding", "frozen", "faulted"]):
        if case.issue_family == "not_responding":
            bonus += 0.08
        else:
            bonus -= 0.10
    if evidence_type == "screenshot" and case.evidence_type != "screenshot":
        bonus -= 0.25
    return bonus


def retrieve_known_case(query: RetrievalQuery) -> tuple[KnownCaseHit | None, RetrievalMetadata]:
    provider = get_embedding_provider()
    text_vectors = _cached_text_vectors(provider.name, provider.mode)
    image_vectors = _cached_image_vectors(provider.name, provider.mode)
    query_text = query.text or ""
    query_vector = provider.embed_text(query_text or f"evidence_type:{query.evidence_type}")
    candidate_count = len(text_vectors)
    selected_case: KnownCaseHit | None = None
    selected_score = 0.0
    selected_text_score = 0.0
    selected_image_score = 0.0
    match_state = "rejected"
    query_image_path = _resolve_query_image_path(query.image_storage_path)
    query_image_vector = provider.embed_image(query_image_path) if query_image_path is not None else None
    image_embedding_used = query_image_vector is not None
    text_embedding_used = True
    extra: dict[str, object] = {
        "evidence_type": query.evidence_type,
        "query_image_path": str(query_image_path) if query_image_path is not None else None,
    }

    exact_case = round1_known_case_map().get(query.image_filename or "")
    if exact_case is not None:
        text_score = cosine_similarity(query_vector, text_vectors.get(exact_case.canonical_file_name, []))
        image_score = (
            cosine_similarity(query_image_vector, image_vectors.get(exact_case.canonical_file_name, []))
            if query_image_vector is not None
            else 0.0
        )
        selected_case = exact_case.model_copy(
            update={
                "match_score": max(0.95, text_score, image_score),
                "match_reason": "exact_filename_match",
            }
        )
        selected_score = selected_case.match_score
        selected_text_score = text_score
        selected_image_score = image_score
        match_state = "exact_filename"
        extra["text_score"] = round(text_score, 4)
        extra["image_score"] = round(image_score, 4)
    else:
        compatible_evidence_types = _compatible_evidence_types(query.evidence_type)
        compatible_cases = [
            case
            for case in round1_known_cases()
            if case.evidence_type in compatible_evidence_types
        ]
        text_weight, image_weight = _score_weights(query.evidence_type, query_image_vector is not None)
        for case in compatible_cases:
            text_score = cosine_similarity(query_vector, text_vectors.get(case.canonical_file_name, []))
            image_score = (
                cosine_similarity(query_image_vector, image_vectors.get(case.canonical_file_name, []))
                if query_image_vector is not None
                else 0.0
            )
            score = (text_score * text_weight) + (image_score * image_weight) + _query_signal_bonus(query_text, case, query.evidence_type)
            score = max(min(score, 1.0), 0.0)
            if score > selected_score:
                match_reason = "image_text_similarity" if image_weight > 0 else "text_embedding_similarity"
                selected_case = case.model_copy(update={"match_score": max(score, 0.0), "match_reason": match_reason})
                selected_score = score
                selected_text_score = text_score
                selected_image_score = image_score
                extra["text_score"] = round(text_score, 4)
                extra["image_score"] = round(image_score, 4)
                extra["text_weight"] = text_weight
                extra["image_weight"] = image_weight
        accept_threshold, weak_threshold = _score_thresholds(query.evidence_type, query_image_vector is not None)
        extra["compatible_evidence_types"] = sorted(compatible_evidence_types)
        extra["weak_threshold"] = weak_threshold
        extra["accept_threshold"] = accept_threshold
        if selected_case is not None and selected_score >= accept_threshold:
            match_state = "accepted"
        elif selected_case is not None and selected_score >= weak_threshold:
            match_state = "weak"
            extra["top_candidate"] = selected_case.canonical_file_name
            extra["top_candidate_issue_family"] = selected_case.issue_family
            selected_case = None
        else:
            if selected_case is not None:
                extra["top_candidate"] = selected_case.canonical_file_name
                extra["top_candidate_issue_family"] = selected_case.issue_family
            selected_case = None
            match_state = "rejected"
        extra["selected_text_score"] = round(selected_text_score, 4)
        extra["selected_image_score"] = round(selected_image_score, 4)

    metadata = RetrievalMetadata(
        provider_name=provider.name,
        provider_mode=provider.mode,
        query_text=query_text,
        image_embedding_used=image_embedding_used,
        text_embedding_used=text_embedding_used,
        candidate_count=candidate_count,
        match_state=match_state,  # type: ignore[arg-type]
        selected_case=selected_case.canonical_file_name if selected_case else None,
        selected_score=round(selected_score, 4) if selected_score else None,
        rejection_threshold=extra.get("accept_threshold"),  # type: ignore[arg-type]
        extra=extra,
    )
    return selected_case, metadata
