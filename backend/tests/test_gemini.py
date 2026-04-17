import json
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from app.core.models import IncidentInput
from app.services.diagnosis import GeminiDiagnosisProvider, run_diagnosis, run_diagnosis_with_debug
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
        "app.services.intake.GEMINI_MODEL", "gemini-2.0-flash"
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

    with patch("app.services.diagnosis.get_gemini_client", return_value=mock_client), patch(
        "app.services.diagnosis.GEMINI_MODEL", "gemini-2.0-flash"
    ), patch("google.genai.types.GenerateContentConfig", MagicMock(), create=True):
        provider = GeminiDiagnosisProvider()
        result = provider.analyze(incident)

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
            symptom_text="Breaker is down.",
            photo_hint="mcb tripped in DB",
        ),
        provider=provider,
    )

    assert diagnosis.diagnosis_source == "gemini_vlm_primary"
    assert diagnosis.branch_name == "gemini_vlm_primary"
    assert diagnosis.issue_family == "tripping"
    assert diagnosis.resolver_tier == "local_site"


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

    diagnosis, debug = run_diagnosis_with_debug(
        IncidentInput(
            incident_id=42,
            site_id="site-mall-01",
            symptom_text="Breaker is down.",
            photo_hint="mcb tripped in DB",
        ),
        provider=provider,
    )

    assert diagnosis.diagnosis_source == "gemini_vlm_primary"
    assert diagnosis.branch_name == "gemini_vlm_primary"
    assert debug["attempted"] is True
    assert debug["succeeded"] is True
    assert debug["incident_id"] == 42
    assert debug["error"] is None


def test_run_diagnosis_with_debug_records_gemini_failure():
    provider = MagicMock()
    provider.analyze.side_effect = RuntimeError("proxy refused connection")

    diagnosis, debug = run_diagnosis_with_debug(
        IncidentInput(
            incident_id=84,
            site_id="site-mall-01",
            symptom_text="charger no pulse and no power",
            photo_hint="display off, no lights",
        ),
        provider=provider,
    )

    assert diagnosis.diagnosis_source in {"round1_package_retrieval", "heuristic_policy_fallback"}
    assert diagnosis.branch_name in {"round1_package_retrieval", "heuristic_policy_fallback"}
    assert debug["attempted"] is True
    assert debug["succeeded"] is False
    assert debug["incident_id"] == 84
    assert "proxy refused connection" in (debug["error"] or "")


def test_build_follow_up_questions_uses_diagnosis_contract_fields():
    diagnosis = SimpleNamespace(
        issue_family="unknown_mixed",
        evidence_type="screenshot",
        required_proof_next="Capture the exact fault detail page.",
        unknown_flag=True,
        requires_follow_up=True,
    )

    with patch("app.services.intake.get_gemini_client", return_value=None), patch(
        "app.services.diagnosis.run_diagnosis", return_value=diagnosis
    ):
        questions = build_follow_up_questions(
            IncidentInput(
                site_id="site-mall-01",
                symptom_text="Customer reported a problem.",
            ),
            "usable",
        )

    question_ids = {item["question_id"] for item in questions}
    assert question_ids == {"required_proof_next", "power_context", "error_text"}
