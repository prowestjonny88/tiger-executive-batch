import json
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.core.models import (
    IncidentInput,
    KbCandidateHit,
    KbRetrievalResult,
    KnownCaseHit,
    PerceptionResult,
    RetrievalMetadata,
    StoredPhotoEvidence,
    StructuredEvidence,
)
from app.services.diagnosis import GeminiDiagnosisProvider, run_diagnosis, run_diagnosis_with_debug
from app.services.diagnosis_gemini import GeminiAssessment, ReasoningInput, should_invoke_reasoning
from app.services.diagnosis_retrieval import RetrievalAssessment
from app.services.embeddings import (
    EMBEDDING_DIMENSION,
    GeminiEmbeddingProvider,
    HashEmbeddingProvider,
    enforce_embedding_runtime_policy,
    get_embedding_runtime_status,
)
from app.services.intake import _call_gemini_intake, build_follow_up_questions


def test_gemini_intake_provider_usable():
    mock_response = MagicMock()
    mock_response.text = json.dumps(
        {
            "quality_status": "usable",
            "quality_notes": "Looks great.",
            "follow_up_questions": [],
        }
    )

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    incident = IncidentInput(site_id="site-01", photo_hint="clear")

    with patch("app.services.intake.get_gemini_client", return_value=mock_client), patch(
        "app.services.intake.GEMINI_MODEL", "gemini-3.0-flash"
    ), patch("google.genai.types.GenerateContentConfig", MagicMock(), create=True):
        status, notes, questions = _call_gemini_intake(incident, None)

    assert status == "usable"
    assert notes == "Looks great."
    assert len(questions) == 0


def test_gemini_diagnosis_provider_parses_round1_schema():
    mock_response = MagicMock()
    mock_response.text = json.dumps(
        {
            "issue_family": "tripping",
            "fault_type": "mcb_tripped",
            "evidence_summary": "Breaker handle is visibly down.",
            "hazard_level": "medium",
            "required_proof_next": "Photo of the breaker reset to ON position.",
            "resolver_tier_hint": "local_site",
        }
    )

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    incident = IncidentInput(site_id="site-01", symptom_text="Breaker is down.")

    with patch("app.services.diagnosis_gemini.get_gemini_client", return_value=mock_client), patch(
        "app.services.diagnosis_gemini.GEMINI_MODEL", "gemini-3.0-flash"
    ), patch("google.genai.types.GenerateContentConfig", MagicMock(), create=True):
        provider = GeminiDiagnosisProvider()
        result = provider.analyze(
            ReasoningInput(
                incident=incident,
                perception=PerceptionResult(
                    mode="text_only",
                    evidence_type="symptom_report",
                    scene_summary="Breaker is down.",
                    confidence_score=0.25,
                ),
                evidence=StructuredEvidence(
                    evidence_type="symptom_report",
                    human_summary="Breaker is down.",
                    retrieval_text="Breaker is down.",
                ),
                kb_candidates=[],
                gate_decision="rejected",
                missing_evidence=["clear_photo_of_asset"],
            )
        )

    assert result["issue_family"] == "tripping"
    assert result["fault_type"] == "mcb_tripped"
    assert result["resolver_tier_hint"] == "local_site"


def test_run_diagnosis_uses_gemini_payload_when_available():
    provider = MagicMock()
    provider.analyze.return_value = {
        "issue_family": "tripping",
        "fault_type": "mcb_tripped",
        "evidence_summary": "Breaker handle is down.",
        "hazard_level": "medium",
        "required_proof_next": "Photo of the breaker reset to ON position.",
        "resolver_tier_hint": "local_site",
    }

    diagnosis = run_diagnosis(
        IncidentInput(
            site_id="site-mall-01",
            photo_evidence=StoredPhotoEvidence(
                filename="breaker.jpg",
                media_type="image/jpeg",
                storage_path="uploads/incidents/breaker.jpg",
                byte_size=1024,
            ),
            symptom_text="Breaker is down.",
            photo_hint="mcb tripped in DB",
        ),
        provider=provider,
    )

    assert diagnosis.diagnosis_source in {"gemini_first_principles", "kb_contextual_reasoning"}
    assert diagnosis.branch_name == "vlm_first_reasoning_path"
    assert diagnosis.issue_family == "tripping"
    assert diagnosis.resolver_tier_proposed == "local_site"


def test_run_diagnosis_with_debug_records_gemini_success():
    provider = MagicMock()
    provider.analyze.return_value = {
        "issue_family": "tripping",
        "fault_type": "mcb_tripped",
        "evidence_summary": "Breaker handle is down.",
        "hazard_level": "medium",
        "required_proof_next": "Photo of the breaker reset to ON position.",
        "resolver_tier_hint": "local_site",
    }

    perception, evidence, kb_retrieval, diagnosis, debug = run_diagnosis_with_debug(
        IncidentInput(
            incident_id=42,
            site_id="site-mall-01",
            photo_evidence=StoredPhotoEvidence(
                filename="breaker.jpg",
                media_type="image/jpeg",
                storage_path="uploads/incidents/breaker.jpg",
                byte_size=1024,
            ),
            symptom_text="Breaker is down.",
            photo_hint="mcb tripped in DB",
        ),
        provider=provider,
    )

    assert perception.mode in {"heuristic", "vlm"}
    assert evidence.evidence_type in {"hardware_photo", "symptom_heavy_photo", "mixed_photo"}
    assert kb_retrieval.gate_decision in {"accepted", "contextual_only", "rejected"}
    assert diagnosis.diagnosis_source in {"gemini_first_principles", "kb_contextual_reasoning"}
    assert diagnosis.branch_name == "vlm_first_reasoning_path"
    assert debug["attempted"] is True
    assert debug["succeeded"] is True
    assert debug["incident_id"] == 42
    assert debug["error"] is None


def test_run_diagnosis_with_debug_records_gemini_failure():
    provider = MagicMock()
    provider.analyze.side_effect = RuntimeError("proxy refused connection")

    perception, evidence, kb_retrieval, diagnosis, debug = run_diagnosis_with_debug(
        IncidentInput(
            incident_id=84,
            site_id="site-mall-01",
            symptom_text="charger no pulse and no power",
            photo_hint="display off, no lights",
        ),
        provider=provider,
    )

    assert perception.mode == "text_only"
    assert evidence.incomplete is True
    assert kb_retrieval.gate_decision in {"contextual_only", "rejected"}
    assert diagnosis.diagnosis_source == "text_only_incomplete"
    assert diagnosis.branch_name == "vlm_first_text_only_path"
    assert debug["attempted"] is False
    assert debug["succeeded"] is False
    assert debug["incident_id"] == 84
    assert debug["error"] is None


def test_build_follow_up_questions_uses_diagnosis_contract_fields():
    perception = PerceptionResult(
        mode="heuristic",
        evidence_type="screenshot",
        scene_summary="Screenshot of fault page.",
        components_visible=["app_screen"],
        visible_abnormalities=["fault_status"],
        ocr_findings=[],
        hazard_signals=[],
        uncertainty_notes=["OCR detail missing."],
        confidence_score=0.5,
        requires_follow_up=True,
    )
    evidence = StructuredEvidence(
        evidence_type="screenshot",
        human_summary="App screenshot without readable error text.",
        retrieval_text="App screenshot without readable error text.",
        components_visible=["app_screen"],
        visible_abnormalities=["fault_status"],
        ocr_findings=[],
        hazard_signals=[],
        user_symptoms=["Customer reported a fault."],
        user_error_code=None,
        follow_up_context={},
        missing_evidence=["upstream_power_context"],
        incomplete=True,
    )
    retrieval = MagicMock(spec=object)
    retrieval.kb_retrieval = KbRetrievalResult(
        query_text="fault screenshot",
        provider_name="hash_embedding_provider",
        provider_mode="deterministic_fallback",
        gate_decision="rejected",
        gate_basis="Weak screenshot context only.",
        candidate_count=0,
        candidates=[],
        image_embedding_used=False,
        text_embedding_used=True,
        top_family_consensus=[],
        stable_neighborhood=False,
        compatibility_notes=[],
    )
    synthesis = MagicMock(
        required_proof_next="Capture the exact fault detail page.",
        requires_follow_up=True,
        unknown_flag=True,
    )

    with patch("app.services.diagnosis_perception.assess_perception", return_value=perception), patch(
        "app.services.diagnosis_evidence.build_structured_evidence", return_value=evidence
    ), patch("app.services.diagnosis_retrieval.assess_retrieval", return_value=retrieval), patch(
        "app.services.diagnosis_synthesis.synthesize_diagnosis", return_value=synthesis
    ), patch(
        "app.services.diagnosis_gemini.assess_gemini",
        return_value=GeminiAssessment(
            payload=None,
            raw_provider_output="",
            attempted=False,
            succeeded=False,
            error=None,
            latency_ms=0.0,
        ),
    ):
        questions = build_follow_up_questions(
            IncidentInput(
                site_id="site-mall-01",
                symptom_text="Customer reported a problem.",
            ),
            "usable",
        )

    question_ids = {item["question_id"] for item in questions}
    assert question_ids == {"required_proof_next", "power_context", "error_text", "diagnosis_uncertainty"}


def test_gemini_embedding_provider_uses_semantic_image_descriptor():
    image_path = Path(__file__).parent / "test-uploads" / "semantic-image.jpg"
    image_path.parent.mkdir(parents=True, exist_ok=True)
    image_path.write_bytes(b"\xff\xd8semantic-test\xff\xd9")

    perception_response = MagicMock()
    perception_response.text = json.dumps(
        {
            "scene_summary": "Open DB board with burnt terminal.",
            "components_visible": ["db_board", "breaker"],
            "visible_abnormalities": ["burn_mark"],
            "ocr_findings": ["C32"],
            "hazard_signals": ["overheat"],
            "retrieval_keywords": ["burnt terminal", "db board"],
        }
    )
    embedding_response = MagicMock()
    embedding_response.embeddings = [MagicMock(values=[float(index) for index in range(300)])]
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = perception_response
    mock_client.models.embed_content.return_value = embedding_response
    hash_provider = HashEmbeddingProvider()
    with patch("app.services.embeddings.get_gemini_client", return_value=mock_client), patch(
        "google.genai.types.GenerateContentConfig", MagicMock(), create=True
    ), patch("google.genai.types.Part.from_bytes", MagicMock(return_value="image-part"), create=True):
        provider = GeminiEmbeddingProvider()
        text_vector = provider.embed_text("breaker is down")
        image_vector = provider.embed_image(image_path)

    assert len(text_vector) == EMBEDDING_DIMENSION
    assert len(image_vector) == EMBEDDING_DIMENSION
    assert mock_client.models.embed_content.called
    assert mock_client.models.generate_content.called
    descriptor_artifact = provider.image_descriptor_artifact(image_path)
    assert descriptor_artifact is not None
    assert descriptor_artifact["schema_version"] == "v1"
    assert image_vector != hash_provider.embed_image(image_path)
    image_path.unlink(missing_ok=True)


def test_embedding_runtime_status_warns_for_hash_mode_outside_development():
    with patch.dict("os.environ", {"APP_ENV": "production"}, clear=False):
        status = get_embedding_runtime_status(HashEmbeddingProvider())

    warnings = status["warnings"]
    assert isinstance(warnings, list)
    assert status["provider_name"] == "hash_embedding_provider"
    assert status["image_mode"] == "exact_image_fingerprint_only"
    assert status["semantic_image_enabled"] is False
    assert "Hash embeddings are active outside development." in warnings
    assert status["retrieval_signal_mode"] == "perception_driven"
    assert status["exact_image_shortcut_mode"] == "guarded"


def test_embedding_runtime_status_reports_semantic_image_mode_when_gemini_available():
    with patch("app.services.embeddings.get_gemini_client", return_value=MagicMock()):
        status = get_embedding_runtime_status(GeminiEmbeddingProvider())

    assert status["provider_name"] == "gemini_embedding_provider"
    assert status["semantic_image_enabled"] is True
    assert status["image_mode"] == "semantic_gemini_descriptor"
    assert status["retrieval_signal_mode"] == "descriptor_driven_semantic_image"
    assert status["retrieval_descriptor_schema_version"] == "v1"


def test_embedding_policy_blocks_hash_mode_in_production_without_override():
    with patch.dict("os.environ", {"APP_ENV": "production", "OMNITRIAGE_ALLOW_HASH_EMBEDDINGS": "false"}, clear=False):
        try:
            enforce_embedding_runtime_policy(HashEmbeddingProvider())
            assert False, "Expected production hash policy to raise"
        except RuntimeError as exc:
            assert "Hash embeddings are disabled" in str(exc)


def test_should_invoke_reasoning_skips_clean_accepted_case():
    invoke, basis = should_invoke_reasoning(
        ReasoningInput(
            incident=IncidentInput(site_id="site-01"),
            perception=PerceptionResult(
                mode="vlm",
                evidence_type="hardware_photo",
                scene_summary="Clear breaker photo.",
                confidence_score=0.88,
            ),
            evidence=StructuredEvidence(
                evidence_type="hardware_photo",
                human_summary="Clear breaker photo.",
                retrieval_text="breaker clear photo",
            ),
            kb_candidates=[],
            gate_decision="accepted",
            missing_evidence=[],
        )
    )

    assert invoke is False
    assert basis == "accepted_kb_without_material_uncertainty"


def test_should_invoke_reasoning_invokes_for_low_confidence_vlm():
    invoke, basis = should_invoke_reasoning(
        ReasoningInput(
            incident=IncidentInput(site_id="site-01"),
            perception=PerceptionResult(
                mode="vlm",
                evidence_type="hardware_photo",
                scene_summary="Unclear breaker photo.",
                confidence_score=0.52,
            ),
            evidence=StructuredEvidence(
                evidence_type="hardware_photo",
                human_summary="Unclear breaker photo.",
                retrieval_text="unclear breaker photo",
            ),
            kb_candidates=[],
            gate_decision="accepted",
            missing_evidence=[],
        )
    )

    assert invoke is True
    assert basis == "perception_low_confidence"


def test_run_diagnosis_with_debug_skips_reasoning_for_clean_accepted_case():
    retrieval = RetrievalAssessment(
        issue_family_hint="tripping",
        evidence_type="hardware_photo",
        query_text="clear breaker photo",
        kb_retrieval=KbRetrievalResult(
            query_text="clear breaker photo",
            provider_name="gemini_embedding_provider",
            provider_mode="gemini_text_image_hybrid",
            gate_decision="accepted",
            gate_basis="Accepted candidate aligned strongly.",
            candidate_count=1,
            primary_candidate=KbCandidateHit(
                canonical_file_name="MCB Tripped (1).jpg",
                match_score=0.92,
                compatibility_score=0.9,
                fault_type="mcb_tripped",
                issue_family="tripping",
                evidence_type="hardware_photo",
                hazard_level="medium",
                resolver_tier="local_site",
                recommended_next_step="Reset the breaker and retest.",
                required_proof_next="Photo of the breaker after reset.",
                visual_observation="Breaker handle is visibly down.",
                match_reason="pgvector_hybrid_retrieval",
                visible_abnormalities=["tripped_breaker"],
                retrieval_source="package_seed",
                compatibility_notes=[],
            ),
            candidates=[],
            image_embedding_used=True,
            text_embedding_used=True,
            top_family_consensus=["tripping"],
            stable_neighborhood=True,
            compatibility_notes=[],
            extra={},
        ),
        known_case_hit=KnownCaseHit(
            canonical_file_name="MCB Tripped (1).jpg",
            match_score=0.92,
            fault_type="mcb_tripped",
            issue_family="tripping",
            evidence_type="hardware_photo",
            hazard_level="medium",
            resolver_tier="local_site",
            recommended_next_step="Reset the breaker and retest.",
            required_proof_next="Photo of the breaker after reset.",
            visual_observation="Breaker handle is visibly down.",
            match_reason="pgvector_hybrid_retrieval",
            visible_abnormalities=["tripped_breaker"],
            retrieval_source="package_seed",
        ),
        retrieval_metadata=RetrievalMetadata(
            provider_name="gemini_embedding_provider",
            provider_mode="gemini_text_image_hybrid",
            query_text="clear breaker photo",
            image_embedding_used=True,
            text_embedding_used=True,
            candidate_count=1,
            match_state="accepted",
            selected_case="MCB Tripped (1).jpg",
            selected_score=0.92,
            rejection_threshold=0.68,
        ),
        strong_retrieval=True,
        default_summary="Breaker handle is visibly down.",
    )
    provider = MagicMock()

    with patch(
        "app.services.diagnosis.assess_perception",
        return_value=PerceptionResult(
            mode="vlm",
            evidence_type="hardware_photo",
            scene_summary="Breaker handle is visibly down.",
            components_visible=["breaker"],
            visible_abnormalities=["tripped_breaker"],
            ocr_findings=[],
            hazard_signals=[],
            uncertainty_notes=[],
            confidence_score=0.88,
            requires_follow_up=False,
            provider_attempted=True,
            fallback_used=False,
        ),
    ), patch(
        "app.services.diagnosis.build_structured_evidence",
        return_value=StructuredEvidence(
            evidence_type="hardware_photo",
            human_summary="Breaker handle is visibly down.",
            retrieval_text="clear breaker photo",
            components_visible=["breaker"],
            visible_abnormalities=["tripped_breaker"],
            ocr_findings=[],
            hazard_signals=[],
            missing_evidence=[],
            incomplete=False,
        ),
    ), patch("app.services.diagnosis.assess_retrieval", return_value=retrieval):
        _, _, _, diagnosis, debug = run_diagnosis_with_debug(IncidentInput(site_id="site-mall-01"), provider=provider)

    provider.analyze.assert_not_called()
    assert debug["reasoning_call_policy"] == "skipped"
    assert debug["reasoning_call_basis"] == "accepted_kb_without_material_uncertainty"
    assert diagnosis.diagnosis_source in {"kb_accepted", "kb_enriched_by_reasoning"}
