import json
from unittest.mock import MagicMock, patch

from app.core.models import IncidentInput, SeverityLevel
from app.services.diagnosis import GeminiDiagnosisProvider
from app.services.intake import _call_gemini_intake


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


def test_gemini_intake_provider_weak():
    mock_response = MagicMock()
    mock_response.text = json.dumps(
        {
            "quality_status": "weak",
            "quality_notes": "A bit blurry.",
            "follow_up_questions": [{"question_id": "main_power_supply", "prompt": "Is the main power supply available?"}],
        }
    )

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    incident = IncidentInput(site_id="site-01", photo_hint="blurry")

    with patch("app.services.intake.get_gemini_client", return_value=mock_client), patch(
        "app.services.intake.GEMINI_MODEL", "gemini-2.0-flash"
    ), patch("google.genai.types.GenerateContentConfig", MagicMock(), create=True):
        status, notes, questions = _call_gemini_intake(incident, None)

    assert status == "weak"
    assert notes == "A bit blurry."
    assert len(questions) == 1
    assert questions[0]["question_id"] == "main_power_supply"


def test_gemini_diagnosis_provider():
    mock_response = MagicMock()
    mock_response.text = json.dumps(
        {
            "provider_summary": "Diagnosis complete.",
            "issue_type": "tripping_mcb_rccb",
            "likely_fault": "Broken plug",
            "confidence_score": 0.95,
            "raw_ocr_text": "ERR123",
            "severity": "critical",
            "basic_conditions": {
                "main_power_supply": "ok",
                "cable_condition": "problem",
                "indicator_or_error_code": "ok",
                "indicator_detail": "ERR123",
            },
            "hazard_flags": ["visible_hazard"],
        }
    )

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    incident = IncidentInput(site_id="site-01", symptom_text="Broken plug")

    with patch("app.services.diagnosis.get_gemini_client", return_value=mock_client), patch(
        "app.services.diagnosis.GEMINI_MODEL", "gemini-2.0-flash"
    ), patch("google.genai.types.GenerateContentConfig", MagicMock(), create=True):
        provider = GeminiDiagnosisProvider()
        result = provider.analyze(incident)

    assert result.provider_summary == "Diagnosis complete."
    assert result.issue_type == "tripping_mcb_rccb"
    assert result.likely_fault == "Broken plug"
    assert result.confidence_score == 0.95
    assert result.raw_ocr_text == "ERR123"
    assert result.severity == SeverityLevel.CRITICAL
    assert result.basic_conditions.cable_condition == "problem"
    assert "visible_hazard" in result.hazard_flags


def test_gemini_diagnosis_fallback_on_parse_error():
    mock_response = MagicMock()
    mock_response.text = "NOT JSON"

    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    incident = IncidentInput(site_id="site-01", symptom_text="Broken plug")

    with patch("app.services.diagnosis.get_gemini_client", return_value=mock_client), patch(
        "app.services.diagnosis.GEMINI_MODEL", "gemini-2.0-flash"
    ), patch("google.genai.types.GenerateContentConfig", MagicMock(), create=True):
        provider = GeminiDiagnosisProvider()
        result = provider.analyze(incident)

    assert result.issue_type == "not_responding"
    assert result.confidence_score == 0.45
