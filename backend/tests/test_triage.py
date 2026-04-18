from __future__ import annotations

import shutil
from os import environ
from pathlib import Path

from unittest.mock import patch

from app.core.data import load_round1_manifest, round1_images_dir
from app.core.models import IncidentInput, StoredPhotoEvidence
from app.services.diagnosis import run_diagnosis
from app.services.known_case_retrieval import RetrievalQuery, retrieve_known_case
from app.services.triage import run_triage


def _copied_round1_image(filename: str, target_name: str) -> Path:
    source = round1_images_dir() / filename
    uploaded = Path(__file__).parent / "test-uploads" / "incidents" / target_name
    uploaded.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, uploaded)
    return uploaded


def test_round1_manifest_is_available():
    manifest = load_round1_manifest()
    assert len(manifest) >= 32
    assert all(item["canonical_file_name"] for item in manifest)


def test_retrieval_returns_known_case_for_matching_hardware_photo():
    hit, metadata = retrieve_known_case(
        RetrievalQuery(
            text="burn marks and melted plastic at isolator terminal",
            evidence_type="hardware_photo",
            image_filename="Burnt Mark Issue (1).jpg",
        )
    )

    assert hit is not None
    assert hit.issue_family == "no_power"
    assert hit.resolver_tier == "technician"
    assert metadata.match_state in {"accepted", "exact_filename"}
    assert metadata.selected_case == hit.canonical_file_name


def test_no_power_case_routes_to_driver_when_non_hazardous():
    result = run_triage(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="display off, no lights, isolator may be off",
            symptom_text="charger no pulse and no power at the bay",
        )
    )

    assert result.diagnosis.issue_family == "no_power"
    assert result.diagnosis.diagnosis_source == "text_only_incomplete"
    assert result.routing.resolver_tier == "remote_ops"
    assert result.routing.escalation_required is True
    assert result.perception.mode == "text_only"


def test_screenshot_case_routes_to_remote_ops():
    result = run_triage(
        IncidentInput(
            site_id="site-condo-01",
            photo_hint="WC Apps screenshot shows charger faulted status",
            symptom_text="App screen captured after failed session.",
            error_code="Faulted",
        )
    )

    assert result.diagnosis.issue_family == "not_responding"
    assert result.diagnosis.evidence_type == "screenshot"
    assert result.routing.resolver_tier == "remote_ops"
    if result.diagnosis.known_case_hit is not None:
        assert result.diagnosis.known_case_hit.evidence_type == "screenshot"


def test_weak_retrieval_is_rejected_for_ambiguous_text_only_case():
    hit, metadata = retrieve_known_case(
        RetrievalQuery(
            text="unclear issue, details are limited and no clear fault can be confirmed",
            evidence_type="symptom_report",
        )
    )

    assert hit is None
    assert metadata.match_state in {"weak", "rejected"}
    assert metadata.selected_score is not None


def test_high_hazard_case_routes_to_technician():
    result = run_triage(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="burn marks and exposed conductor near isolator",
            symptom_text="Burnt smell and melted plastic visible.",
        )
    )

    assert result.diagnosis.hazard_level == "high"
    assert result.routing.resolver_tier == "technician"
    assert "visible_hazard" in result.diagnosis.hazard_flags


def test_unknown_mixed_non_hazard_defaults_to_remote_ops():
    result = run_triage(
        IncidentInput(
            site_id="site-condo-01",
            photo_hint="unclear image of charger area",
            symptom_text="Customer reported issue but no clear evidence yet.",
        )
    )

    assert result.diagnosis.issue_family == "unknown_mixed"
    assert result.routing.resolver_tier == "remote_ops"


def test_gemini_failure_falls_back_to_round1_retrieval():
    with patch("app.services.diagnosis_gemini.get_gemini_client", return_value=None):
        diagnosis = run_diagnosis(
            IncidentInput(
                site_id="site-mall-01",
                photo_hint="display off, no lights",
                symptom_text="charger no pulse and no power",
            )
        )

    assert diagnosis.diagnosis_source == "text_only_incomplete"
    assert diagnosis.issue_family == "no_power"


def test_known_case_filename_enables_image_embedding_path():
    uploaded = _copied_round1_image("MCB Tripped (1).jpg", "mcb-tripped.jpg")
    diagnosis = run_diagnosis(
        IncidentInput(
            site_id="site-mall-01",
            photo_evidence=StoredPhotoEvidence(
                filename="MCB Tripped (1).jpg",
                media_type="image/jpeg",
                storage_path=str(uploaded),
                byte_size=64000,
            ),
            photo_hint="photo of tripped breaker",
            symptom_text="breaker is down and charging will not start",
        )
    )

    assert diagnosis.known_case_hit is not None
    assert diagnosis.known_case_hit.issue_family == "tripping"
    assert diagnosis.retrieval_metadata is not None
    assert diagnosis.retrieval_metadata.image_embedding_used is True
    assert diagnosis.retrieval_metadata.match_state in {"accepted", "exact_filename"}
    uploaded.unlink(missing_ok=True)


def test_retrieval_matches_uploaded_copy_by_image_content():
    uploaded = _copied_round1_image("MCB Tripped (1).jpg", "uuid-upload.jpg")

    hit, metadata = retrieve_known_case(
        RetrievalQuery(
            text="uploaded photo with little context",
            evidence_type="hardware_photo",
            image_filename="8e06d2e6-uuid-upload.jpg",
            image_storage_path=str(uploaded),
        )
    )

    assert hit is not None
    assert hit.canonical_file_name == "MCB Tripped (1).jpg"
    assert hit.issue_family == "tripping"
    assert metadata.image_embedding_used is True
    uploaded.unlink(missing_ok=True)


def test_run_diagnosis_uses_uploaded_image_content_when_text_is_weak():
    uploaded = _copied_round1_image("MCB Tripped (1).jpg", "uuid-upload-weak-text.jpg")
    source = round1_images_dir() / "MCB Tripped (1).jpg"

    diagnosis = run_diagnosis(
        IncidentInput(
            site_id="site-mall-01",
            photo_evidence=StoredPhotoEvidence(
                filename="8e06d2e6-uuid-upload.jpg",
                media_type="image/jpeg",
                storage_path=str(uploaded),
                byte_size=source.stat().st_size,
            ),
            photo_hint="Photo: 8e06d2e6-uuid-upload.jpg",
            symptom_text="",
        )
    )

    assert diagnosis.known_case_hit is not None
    assert diagnosis.issue_family == "tripping"
    assert diagnosis.fault_type == "mcb_tripped"
    uploaded.unlink(missing_ok=True)


def test_known_case_visible_abnormalities_are_promoted_to_hazard_flags():
    uploaded = _copied_round1_image("Burnt Mark Issue (2).jpg", "uuid-burnt-mark.jpg")
    source = round1_images_dir() / "Burnt Mark Issue (2).jpg"

    diagnosis = run_diagnosis(
        IncidentInput(
            site_id="site-mall-01",
            photo_evidence=StoredPhotoEvidence(
                filename="8e06d2e6-burnt-mark.jpg",
                media_type="image/jpeg",
                storage_path=str(uploaded),
                byte_size=source.stat().st_size,
            ),
            photo_hint="Photo: 8e06d2e6-burnt-mark.jpg",
            symptom_text="",
        )
    )

    assert diagnosis.known_case_hit is not None
    assert diagnosis.known_case_hit.canonical_file_name == "Burnt Mark Issue (2).jpg"
    assert "burn_mark" in diagnosis.hazard_flags
    assert "melted_plastic" in diagnosis.hazard_flags
    assert "loose_termination" in diagnosis.hazard_flags
    uploaded.unlink(missing_ok=True)


def test_retrieval_metadata_surfaces_hash_warning_outside_development():
    with patch.dict(environ, {"APP_ENV": "production", "OMNITRIAGE_EMBEDDING_PROVIDER": "hash"}, clear=False):
        diagnosis = run_diagnosis(
            IncidentInput(
                site_id="site-mall-01",
                photo_hint="display off, no lights",
                symptom_text="charger no pulse and no power",
            )
        )

    assert diagnosis.retrieval_metadata is not None
    assert diagnosis.retrieval_metadata.extra is not None
    assert "Hash embeddings are active outside development." in diagnosis.retrieval_metadata.extra["warnings"]


def test_routing_only_raises_when_local_site_resolver_is_unavailable():
    result = run_triage(
        IncidentInput(
            site_id="site-condo-01",
            photo_hint="photo of tripped breaker in house DB",
            symptom_text="breaker is down and the charger stopped charging",
        )
    )

    assert result.diagnosis.issue_family == "tripping"
    assert result.routing.resolver_tier == "remote_ops"
    assert result.perception.mode == "text_only"
    assert "Base routing matrix selected remote_ops." in result.routing.routing_rationale
