import json
import sys
import types
from pathlib import Path
from unittest.mock import MagicMock, patch

from app.core.models import IncidentInput, StoredPhotoEvidence
from app.services.theme2_perception import assess_theme2_perception


TEST_UPLOAD_ROOT = Path(__file__).parent / "test-uploads"


def _photo_incident(response_filename: str = "theme2.jpg") -> IncidentInput:
    TEST_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    image_path = TEST_UPLOAD_ROOT / response_filename
    image_path.write_bytes(b"\xff\xd8theme2-test\xff\xd9")
    return IncidentInput(
        site_id="site-mall-01",
        photo_evidence=StoredPhotoEvidence(
            filename=response_filename,
            media_type="image/jpeg",
            storage_path=str(image_path),
            byte_size=image_path.stat().st_size,
        ),
        photo_hint="charger red light",
    )


def _fake_genai_modules() -> dict[str, object]:
    fake_types = types.SimpleNamespace(
        GenerateContentConfig=MagicMock(),
        Part=types.SimpleNamespace(from_bytes=MagicMock(return_value="image-part")),
    )
    fake_genai = types.SimpleNamespace(types=fake_types)
    return {"google.genai": fake_genai, "google.genai.types": fake_types}


def test_gemini_perception_parses_theme2_fields():
    mock_response = MagicMock()
    mock_response.text = json.dumps(
        {
            "evidence_type": "hardware_photo",
            "scene_summary": "Charger indicator is red.",
            "components_visible": ["charger"],
            "visible_abnormalities": ["red_indicator"],
            "ocr_findings": ["SN 260301982", "Proton eMAS"],
            "hazard_signals": [],
            "uncertainty_notes": [],
            "confidence_score": 0.91,
            "input_component": "charger",
            "observation_result": "charger_red_light",
            "charger_serial_number": "260301982",
            "charger_brand_model": "Proton eMAS",
            "indicator_status": "red_light",
            "raw_visible_text": ["SN 260301982", "Proton eMAS"],
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ):
        result = assess_theme2_perception(_photo_incident())

    assert result.extraction.input_component == "charger"
    assert result.extraction.observation_result == "charger_red_light"
    assert result.extraction.charger_serial_number == "260301982"
    assert result.extraction.charger_brand_model == "Proton eMAS"
    assert result.extraction.indicator_status == "red_light"


def test_bad_gemini_theme2_enums_normalize_to_unknown():
    mock_response = MagicMock()
    mock_response.text = json.dumps(
        {
            "evidence_type": "hardware_photo",
            "scene_summary": "Image inspected.",
            "components_visible": [],
            "visible_abnormalities": [],
            "ocr_findings": [],
            "hazard_signals": [],
            "uncertainty_notes": [],
            "confidence_score": 0.67,
            "input_component": "wallbox",
            "observation_result": "red",
            "indicator_status": "purple",
            "evdb_phase_type": "two_phase",
            "rccb_type": "type_b",
            "isolator_state": "halfway",
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ):
        result = assess_theme2_perception(_photo_incident("theme2-bad-enums.jpg"))

    assert result.extraction.input_component == "unknown"
    assert result.extraction.observation_result == "unknown"
    assert result.extraction.indicator_status == "unknown"
    assert result.extraction.evdb_phase_type == "unknown"
    assert result.extraction.rccb_type == "unknown"
    assert result.extraction.isolator_state == "unknown"


def test_heuristic_perception_produces_theme2_extraction_without_gemini():
    result = assess_theme2_perception(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="isolator off open circuit",
            symptom_text="charger has no light",
        )
    )

    assert result.mode == "text_only"
    assert result.extraction.input_component == "isolator"
    assert result.extraction.observation_result == "isolator_off_open_circuit"
    assert result.extraction.isolator_state == "off"
