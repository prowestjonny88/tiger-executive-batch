from __future__ import annotations

from dataclasses import dataclass

from app.core.models import EvidenceType, IncidentInput, RetrievalMetadata, StoredPhotoEvidence
from app.services.round1_dataset import round1_known_case_map
from app.services.diagnosis_evidence import build_structured_evidence
from app.services.diagnosis_perception import assess_perception
from app.services.diagnosis_retrieval import assess_retrieval
from app.services.embeddings import get_exact_image_shortcut_mode


@dataclass(frozen=True)
class RetrievalQuery:
    text: str
    evidence_type: EvidenceType
    image_filename: str | None = None
    image_storage_path: str | None = None


def retrieve_known_case(query: RetrievalQuery):
    exact_case = round1_known_case_map().get(query.image_filename or "")
    if exact_case is not None and not query.image_storage_path and get_exact_image_shortcut_mode() == "demo":
        return exact_case.model_copy(update={"match_score": 0.99, "match_reason": "exact_filename_match"}), RetrievalMetadata(
            provider_name="kb_exact_shortcut",
            provider_mode="deterministic_shortcut",
            query_text=query.text,
            image_embedding_used=False,
            text_embedding_used=True,
            candidate_count=len(round1_known_case_map()),
            match_state="exact_filename",
            selected_case=exact_case.canonical_file_name,
            selected_score=0.99,
            rejection_threshold=0.68,
            extra={"exact_filename": query.image_filename, "exact_image_shortcut_mode": "demo", "exact_image_shortcut_used": True},
        )

    incident = IncidentInput(
        site_id="retrieval-query",
        symptom_text=query.text,
        photo_hint=query.text,
        photo_evidence=(
            StoredPhotoEvidence(
                filename=query.image_filename or "query.jpg",
                media_type="image/jpeg",
                storage_path=query.image_storage_path or "",
                byte_size=0,
            )
            if query.image_storage_path
            else None
        ),
    )
    perception = assess_perception(incident)
    evidence = build_structured_evidence(incident, perception).model_copy(update={"evidence_type": query.evidence_type})
    assessment = assess_retrieval(incident, perception, evidence)
    hit = assessment.known_case_hit
    metadata = assessment.retrieval_metadata or RetrievalMetadata(
        provider_name="unavailable",
        provider_mode="unavailable",
        query_text=query.text,
        image_embedding_used=bool(query.image_storage_path),
        text_embedding_used=True,
        candidate_count=0,
        match_state="rejected",
    )
    return hit, metadata
