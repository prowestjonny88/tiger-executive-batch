import json
import sys
import types
from pathlib import Path
from typing import Any
from unittest.mock import MagicMock, patch

from app.core.models import IncidentInput, StoredPhotoEvidence
from app.services.theme2_perception import _theme2_from_data, assess_theme2_perception


TEST_UPLOAD_ROOT = Path(__file__).parent / "test-uploads"


def test_mixed_charger_red_light_wins_over_visible_isolator_off():
    result = _theme2_from_data(
        {
            "scene_summary": "EV charger with solid red light and nearby isolator switch marked OFF.",
            "components_visible": ["charger", "isolator"],
            "visible_abnormalities": ["isolator_off_open_circuit"],
            "input_component": "isolator",
            "observation_result": "isolator_off_open_circuit",
            "indicator_status": "red_light",
            "isolator_state": "off",
            "raw_visible_text": ["PROTON e.MAS charger red indicator", "isolator OFF"],
        },
        0.9,
    )

    assert result.input_component == "charger"
    assert result.observation_result == "charger_red_light"


def test_mixed_charger_no_light_allows_isolator_off_to_win():
    result = _theme2_from_data(
        {
            "scene_summary": "EV charger has no light and the nearby isolator switch is marked OFF.",
            "components_visible": ["charger", "isolator"],
            "input_component": "charger",
            "observation_result": "charger_no_light",
            "indicator_status": "no_light",
            "isolator_state": "off",
            "raw_visible_text": ["charger no light", "isolator OFF"],
        },
        0.9,
    )

    assert result.input_component == "isolator"
    assert result.observation_result == "isolator_off_open_circuit"


def test_mixed_powered_charger_does_not_force_isolator_open_circuit():
    result = _theme2_from_data(
        {
            "scene_summary": "EV charger shows a blue status light and a nearby isolator switch label appears OFF.",
            "components_visible": ["charger", "isolator"],
            "visible_abnormalities": ["isolator OFF"],
            "input_component": "isolator",
            "observation_result": "isolator_off_open_circuit",
            "indicator_status": "unknown",
            "isolator_state": "off",
            "raw_visible_text": ["charger blue indicator", "isolator OFF"],
        },
        0.9,
    )

    assert result.input_component == "charger"
    assert result.observation_result == "unknown"
    assert result.isolator_state == "unknown"
    assert any("powered" in note.lower() and "isolator" in note.lower() for note in result.uncertainty_notes)


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


def _photo_incident_with_app_screenshot(response_filename: str = "theme2.jpg") -> IncidentInput:
    incident = _photo_incident(response_filename)
    screenshot_path = TEST_UPLOAD_ROOT / f"app-{response_filename}"
    screenshot_path.write_bytes(b"\xff\xd8theme2-app-screenshot\xff\xd9")
    incident.app_screenshot_evidence = StoredPhotoEvidence(
        filename=screenshot_path.name,
        media_type="image/jpeg",
        storage_path=str(screenshot_path),
        byte_size=screenshot_path.stat().st_size,
    )
    return incident


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
            "bounding_boxes": [
                {
                    "id": "charger-unit",
                    "label": "Charger unit",
                    "x": 24,
                    "y": 12,
                    "width": 52,
                    "height": 74,
                }
            ],
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
    assert result.extraction.mcb_current_amp is None
    assert result.extraction.rccb_current_amp is None
    assert result.extraction.rccb_type_evidence == "unknown"
    assert len(result.extraction.bounding_boxes) == 1
    assert result.extraction.bounding_boxes[0].label == "Charger unit"
    assert result.extraction.bounding_boxes[0].source == "vlm"


def test_gemini_perception_parses_normalized_evdb_spec_fields():
    mock_response = MagicMock()
    mock_response.text = json.dumps(
        {
            "evidence_type": "hardware_photo",
            "scene_summary": "EVDB labels are readable.",
            "components_visible": ["evdb", "mcb", "rccb"],
            "visible_abnormalities": [],
            "ocr_findings": ["MCB C40 2P", "RCCB 40A Type AC 2P"],
            "hazard_signals": [],
            "uncertainty_notes": [],
            "confidence_score": 0.91,
            "input_component": "evdb",
            "observation_result": "evdb_single_phase",
            "evdb_phase_type": "single phase",
            "mcb_visible": True,
            "rccb_visible": True,
            "mcb_rating": "C40 2P",
            "rccb_rating": "40A 2P",
            "mcb_current_amp": 40,
            "rccb_current_amp": 40,
            "mcb_poles": "2 pole",
            "rccb_poles": "2P",
            "mcb_brand_model": "CHINT",
            "rccb_brand_model": "CHINT",
            "rccb_type": "AC",
            "rccb_type_evidence": "symbol only",
            "rccb_symbol_description": "sine-wave-only symbol",
            "evdb_spec_status": "wrong",
            "raw_visible_text": ["MCB C40 2P", "RCCB 40A Type AC 2P"],
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ):
        result = assess_theme2_perception(_photo_incident("theme2-evdb-normalized.jpg"))

    assert result.extraction.input_component == "evdb"
    assert result.extraction.evdb_phase_type == "single_phase"
    assert result.extraction.mcb_current_amp == 40
    assert result.extraction.rccb_current_amp == 40
    assert result.extraction.mcb_poles == "2p"
    assert result.extraction.rccb_poles == "2p"
    assert result.extraction.rccb_type == "type_ac"
    assert result.extraction.rccb_type_evidence == "symbol_only"
    assert result.extraction.evdb_spec_status == "wrong"


def test_gemini_evdb_tripped_signal_overrides_phase_observation():
    mock_response = MagicMock()
    mock_response.text = json.dumps(
        {
            "evidence_type": "hardware_photo",
            "scene_summary": "Single-phase EVDB with one MCB handle down.",
            "components_visible": ["evdb", "mcb", "rccb"],
            "visible_abnormalities": ["MCB tripped"],
            "ocr_findings": ["MCB C40 2P", "RCCB Type A 2P"],
            "hazard_signals": [],
            "uncertainty_notes": [],
            "confidence_score": 0.9,
            "input_component": "evdb",
            "observation_result": "evdb_single_phase",
            "evdb_phase_type": "single_phase",
            "mcb_visible": True,
            "rccb_visible": True,
            "mcb_rating": "C40 2P",
            "rccb_rating": "40A Type A 2P",
            "mcb_current_amp": 40,
            "rccb_current_amp": 40,
            "mcb_poles": "2P",
            "rccb_poles": "2P",
            "rccb_type": "Type A",
            "evdb_spec_status": "correct",
            "raw_visible_text": ["MCB tripped", "C40 2P"],
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ):
        result = assess_theme2_perception(_photo_incident("theme2-evdb-tripped-phase.jpg"))

    assert result.extraction.input_component == "evdb"
    assert result.extraction.observation_result == "mcb_tripped"


def test_secondary_evdb_trip_check_overrides_phase_result():
    primary_response = MagicMock()
    primary_response.text = json.dumps(
        {
            "evidence_type": "hardware_photo",
            "scene_summary": "Single-phase EVDB labels are readable.",
            "components_visible": ["evdb", "mcb", "rccb"],
            "visible_abnormalities": [],
            "ocr_findings": ["MCB C40 2P", "RCCB Type A 2P"],
            "hazard_signals": [],
            "uncertainty_notes": [],
            "confidence_score": 0.95,
            "input_component": "evdb",
            "observation_result": "evdb_single_phase",
            "evdb_phase_type": "single_phase",
            "mcb_visible": True,
            "rccb_visible": True,
            "mcb_rating": "C40 2P",
            "rccb_rating": "40A Type A 2P",
            "mcb_current_amp": 40,
            "rccb_current_amp": 40,
            "mcb_poles": "2P",
            "rccb_poles": "2P",
            "rccb_type": "Type A",
            "evdb_spec_status": "correct",
            "raw_visible_text": ["MCB C40 2P", "RCCB Type A 2P"],
            "bounding_boxes": [],
        }
    )
    secondary_response = MagicMock()
    secondary_response.text = json.dumps(
        {
            "evdb_visible": True,
            "mcb_or_rccb_tripped": True,
            "trip_observation": "mcb_tripped",
            "trip_evidence": ["red trip/status window visible on MCB"],
            "confidence_score": 0.86,
            "uncertainty_notes": [],
            "raw_visible_text": ["red trip/status window"],
            "bounding_boxes": [
                {"id": "mcb-trip-window", "label": "MCB trip/status window", "x": 44, "y": 33, "width": 8, "height": 5}
            ],
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = [primary_response, secondary_response]

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ):
        result = assess_theme2_perception(_photo_incident("theme2-secondary-evdb-trip.jpg"))

    assert result.extraction.input_component == "evdb"
    assert result.extraction.observation_result == "mcb_tripped"
    assert result.extraction.bounding_boxes[0].id == "mcb-trip-window"
    assert "EVDB_TRIP_SECONDARY" in (result.raw_provider_output or "")
    assert mock_client.models.generate_content.call_count == 2


def test_secondary_evdb_trip_check_preserves_phase_when_no_trip_cue():
    primary_response = MagicMock()
    primary_response.text = json.dumps(
        {
            "evidence_type": "hardware_photo",
            "scene_summary": "Single-phase EVDB labels are readable.",
            "components_visible": ["evdb", "mcb", "rccb"],
            "visible_abnormalities": [],
            "ocr_findings": ["MCB C40 2P", "RCCB Type A 2P"],
            "hazard_signals": [],
            "uncertainty_notes": [],
            "confidence_score": 0.95,
            "input_component": "evdb",
            "observation_result": "evdb_single_phase",
            "evdb_phase_type": "single_phase",
            "mcb_visible": True,
            "rccb_visible": True,
            "mcb_rating": "C40 2P",
            "rccb_rating": "40A Type A 2P",
            "mcb_current_amp": 40,
            "rccb_current_amp": 40,
            "mcb_poles": "2P",
            "rccb_poles": "2P",
            "rccb_type": "Type A",
            "evdb_spec_status": "correct",
            "raw_visible_text": ["MCB C40 2P", "RCCB Type A 2P"],
            "bounding_boxes": [],
        }
    )
    secondary_response = MagicMock()
    secondary_response.text = json.dumps(
        {
            "evdb_visible": True,
            "mcb_or_rccb_tripped": False,
            "trip_observation": "unknown",
            "trip_evidence": ["visible handles show ON"],
            "confidence_score": 0.84,
            "uncertainty_notes": [],
            "raw_visible_text": ["ON"],
            "bounding_boxes": [],
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = [primary_response, secondary_response]

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ):
        result = assess_theme2_perception(_photo_incident("theme2-secondary-evdb-no-trip.jpg"))

    assert result.extraction.input_component == "evdb"
    assert result.extraction.observation_result == "evdb_single_phase"
    assert "EVDB_TRIP_SECONDARY" in (result.raw_provider_output or "")
    assert mock_client.models.generate_content.call_count == 2


def test_red_trip_window_heuristic_overrides_phase_after_secondary_miss():
    from PIL import Image, ImageDraw

    TEST_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    image_path = TEST_UPLOAD_ROOT / "theme2-red-trip-window.jpg"
    image = Image.new("RGB", (240, 180), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((45, 35, 170, 125), outline="black", width=2)
    draw.rectangle((96, 54, 132, 61), fill=(190, 42, 40))
    image.save(image_path)

    primary_response = MagicMock()
    primary_response.text = json.dumps(
        {
            "evidence_type": "hardware_photo",
            "scene_summary": "Single-phase EVDB labels are readable.",
            "components_visible": ["evdb", "mcb", "rccb"],
            "visible_abnormalities": [],
            "ocr_findings": ["MCB C40 2P", "ON"],
            "hazard_signals": [],
            "uncertainty_notes": [],
            "confidence_score": 0.95,
            "input_component": "evdb",
            "observation_result": "evdb_single_phase",
            "evdb_phase_type": "single_phase",
            "mcb_visible": True,
            "rccb_visible": True,
            "mcb_rating": "C40 2P",
            "rccb_rating": "40A Type A 2P",
            "mcb_current_amp": 40,
            "rccb_current_amp": 40,
            "mcb_poles": "2P",
            "rccb_poles": "2P",
            "rccb_type": "Type A",
            "evdb_spec_status": "correct",
            "raw_visible_text": ["MCB C40 2P", "O-OFF marker visible near red status window"],
            "bounding_boxes": [{"id": "mcb", "label": "MCB", "x": 18, "y": 18, "width": 55, "height": 52}],
        }
    )
    secondary_response = MagicMock()
    secondary_response.text = json.dumps(
        {
            "evdb_visible": True,
            "mcb_or_rccb_tripped": False,
            "trip_observation": "unknown",
            "trip_evidence": [],
            "confidence_score": 0.9,
            "uncertainty_notes": [],
            "raw_visible_text": ["O-OFF marker visible near red status window"],
            "bounding_boxes": [],
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = [primary_response, secondary_response]

    incident = IncidentInput(
        site_id="site-mall-01",
        photo_evidence=StoredPhotoEvidence(
            filename=image_path.name,
            media_type="image/jpeg",
            storage_path=str(image_path),
            byte_size=image_path.stat().st_size,
        ),
        photo_hint="Photo uploaded for EV charger troubleshooting.",
    )

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ):
        result = assess_theme2_perception(incident)

    assert result.extraction.input_component == "evdb"
    assert result.extraction.observation_result == "mcb_tripped"
    assert result.extraction.bounding_boxes[0].id == "evdb-red-trip-window"
    assert "EVDB_RED_WINDOW_HEURISTIC: detected" in (result.raw_provider_output or "")


def test_red_label_pixels_do_not_override_phase_without_trip_text():
    from PIL import Image, ImageDraw

    TEST_UPLOAD_ROOT.mkdir(parents=True, exist_ok=True)
    image_path = TEST_UPLOAD_ROOT / "theme2-red-label-not-trip.jpg"
    image = Image.new("RGB", (240, 180), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((45, 35, 170, 125), outline="black", width=2)
    draw.rectangle((80, 52, 140, 60), fill=(190, 42, 40))
    image.save(image_path)

    primary_response = MagicMock()
    primary_response.text = json.dumps(
        {
            "evidence_type": "hardware_photo",
            "scene_summary": "Three-phase EVDB labels are readable and handles show ON.",
            "components_visible": ["evdb", "mcb", "rccb"],
            "visible_abnormalities": [],
            "ocr_findings": ["MCB C40 4P", "RCCB Type A 4P", "ON"],
            "hazard_signals": [],
            "uncertainty_notes": [],
            "confidence_score": 0.95,
            "input_component": "evdb",
            "observation_result": "evdb_three_phase",
            "evdb_phase_type": "three_phase",
            "mcb_visible": True,
            "rccb_visible": True,
            "mcb_rating": "C40 4P",
            "rccb_rating": "40A Type A 4P",
            "mcb_current_amp": 40,
            "rccb_current_amp": 40,
            "mcb_poles": "4P",
            "rccb_poles": "4P",
            "rccb_type": "Type A",
            "evdb_spec_status": "correct",
            "raw_visible_text": ["MCB C40 4P", "RCCB Type A 4P", "ON"],
            "bounding_boxes": [{"id": "evdb", "label": "EVDB", "x": 18, "y": 18, "width": 55, "height": 52}],
        }
    )
    secondary_response = MagicMock()
    secondary_response.text = json.dumps(
        {
            "evdb_visible": True,
            "mcb_or_rccb_tripped": False,
            "trip_observation": "unknown",
            "trip_evidence": [],
            "confidence_score": 0.9,
            "uncertainty_notes": [],
            "raw_visible_text": ["ON"],
            "bounding_boxes": [],
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = [primary_response, secondary_response]

    incident = IncidentInput(
        site_id="site-mall-01",
        photo_evidence=StoredPhotoEvidence(
            filename=image_path.name,
            media_type="image/jpeg",
            storage_path=str(image_path),
            byte_size=image_path.stat().st_size,
        ),
        photo_hint="Photo uploaded for EV charger troubleshooting.",
    )

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ):
        result = assess_theme2_perception(incident)

    assert result.extraction.input_component == "evdb"
    assert result.extraction.observation_result == "evdb_three_phase"
    assert "EVDB_RED_WINDOW_HEURISTIC: detected" not in (result.raw_provider_output or "")


def test_gemini_perception_merges_ev_app_screenshot_text():
    primary_response = MagicMock()
    primary_response.text = json.dumps(
        {
            "evidence_type": "hardware_photo",
            "scene_summary": "Charger indicator is blinking red.",
            "components_visible": ["charger"],
            "visible_abnormalities": ["blinking_red_indicator"],
            "ocr_findings": [],
            "hazard_signals": [],
            "uncertainty_notes": [],
            "confidence_score": 0.88,
            "input_component": "charger",
            "observation_result": "charger_blinking_red_light",
            "charger_serial_number": None,
            "charger_brand_model": None,
            "indicator_status": "blinking_red_light",
            "raw_visible_text": [],
            "bounding_boxes": [],
        }
    )
    screenshot_response = MagicMock()
    screenshot_response.text = json.dumps(
        {
            "app_status_summary": "Emergency stop detected in app.",
            "app_visible_text": ["Emergency Stop", "7 flashes"],
            "app_error_code": "E-STOP",
            "app_fault_hint": "emergency stop",
            "app_uncertainty_notes": [],
            "confidence_score": 0.9,
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = [primary_response, screenshot_response]

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ):
        result = assess_theme2_perception(_photo_incident_with_app_screenshot("theme2-app-merge.jpg"))

    combined_text = " ".join(result.ocr_findings + result.extraction.raw_visible_text).lower()
    assert result.mode == "vlm"
    assert "app fault hint: emergency stop" in combined_text
    assert "app text: 7 flashes" in combined_text
    assert "APP_SCREENSHOT" in (result.raw_provider_output or "")


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


def test_gemini_isolator_off_signal_overrides_dominant_charger():
    mock_response = MagicMock()
    mock_response.text = json.dumps(
        {
            "evidence_type": "hardware_photo",
            "scene_summary": "A charger is below two isolator switches; one isolator switch is marked OFF.",
            "components_visible": ["charger", "isolator"],
            "visible_abnormalities": ["isolator OFF"],
            "ocr_findings": ["OFF", "ON"],
            "hazard_signals": [],
            "uncertainty_notes": [],
            "confidence_score": 0.87,
            "input_component": "charger",
            "observation_result": "unknown",
            "charger_serial_number": None,
            "charger_brand_model": "PROTON e.MAS",
            "indicator_status": "unknown",
            "isolator_state": "off",
            "raw_visible_text": ["OFF", "ON"],
            "bounding_boxes": [
                {"id": "isolator-switch", "label": "Isolator switch OFF", "x": 30, "y": 10, "width": 28, "height": 26}
            ],
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ):
        result = assess_theme2_perception(_photo_incident("theme2-isolator-off-dominant-charger.jpg"))

    assert result.extraction.input_component == "isolator"
    assert result.extraction.observation_result == "isolator_off_open_circuit"
    assert result.extraction.isolator_state == "off"


def test_secondary_isolator_check_catches_off_switch_after_charger_result():
    primary_response = MagicMock()
    primary_response.text = json.dumps(
        {
            "evidence_type": "hardware_photo",
            "scene_summary": "Large charger unit is visible.",
            "components_visible": ["charger"],
            "visible_abnormalities": [],
            "ocr_findings": ["PROTON e.MAS"],
            "hazard_signals": [],
            "uncertainty_notes": [],
            "confidence_score": 0.91,
            "input_component": "charger",
            "observation_result": "charger_serial_brand_visible",
            "charger_serial_number": None,
            "charger_brand_model": "PROTON e.MAS",
            "indicator_status": "unknown",
            "raw_visible_text": ["PROTON e.MAS"],
            "bounding_boxes": [],
        }
    )
    secondary_response = MagicMock()
    secondary_response.text = json.dumps(
        {
            "isolator_visible": True,
            "isolator_state": "off",
            "isolator_observation": "isolator_off_open_circuit",
            "confidence_score": 0.88,
            "uncertainty_notes": [],
            "raw_visible_text": ["OFF"],
            "bounding_boxes": [
                {"id": "isolator-switch", "label": "Isolator OFF switch", "x": 28, "y": 10, "width": 24, "height": 20}
            ],
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = [primary_response, secondary_response]

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ):
        result = assess_theme2_perception(_photo_incident("theme2-secondary-isolator.jpg"))

    assert result.extraction.input_component == "isolator"
    assert result.extraction.observation_result == "isolator_off_open_circuit"
    assert result.extraction.isolator_state == "off"
    assert result.extraction.bounding_boxes[0].id == "isolator-switch"
    assert "ISOLATOR_SECONDARY" in (result.raw_provider_output or "")
    assert mock_client.models.generate_content.call_count == 2


def test_secondary_isolator_check_does_not_override_powered_charger():
    primary_response = MagicMock()
    primary_response.text = json.dumps(
        {
            "evidence_type": "hardware_photo",
            "scene_summary": "Large charger unit is visible with a blue status light.",
            "components_visible": ["charger", "isolator"],
            "visible_abnormalities": [],
            "ocr_findings": ["PROTON e.MAS", "blue charger indicator"],
            "hazard_signals": [],
            "uncertainty_notes": [],
            "confidence_score": 0.91,
            "input_component": "charger",
            "observation_result": "charger_serial_brand_visible",
            "charger_serial_number": None,
            "charger_brand_model": "PROTON e.MAS",
            "indicator_status": "unknown",
            "raw_visible_text": ["PROTON e.MAS", "blue status light"],
            "bounding_boxes": [],
        }
    )
    secondary_response = MagicMock()
    secondary_response.text = json.dumps(
        {
            "isolator_visible": True,
            "isolator_state": "off",
            "isolator_observation": "isolator_off_open_circuit",
            "confidence_score": 0.88,
            "uncertainty_notes": [],
            "raw_visible_text": ["OFF"],
            "bounding_boxes": [
                {"id": "isolator-switch", "label": "Isolator OFF switch", "x": 28, "y": 10, "width": 24, "height": 20}
            ],
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = [primary_response, secondary_response]

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ):
        result = assess_theme2_perception(_photo_incident("theme2-secondary-powered-charger.jpg"))

    assert result.extraction.input_component == "charger"
    assert result.extraction.observation_result == "charger_serial_brand_visible"
    assert result.requires_follow_up is True
    assert any("powered" in note.lower() and "isolator" in note.lower() for note in result.extraction.uncertainty_notes)
    assert "ISOLATOR_SECONDARY" in (result.raw_provider_output or "")
    assert mock_client.models.generate_content.call_count == 2


def test_bad_gemini_bounding_boxes_are_clamped_and_limited():
    mock_response = MagicMock()
    mock_response.text = json.dumps(
        {
            "evidence_type": "hardware_photo",
            "scene_summary": "Image inspected.",
            "components_visible": ["charger"],
            "visible_abnormalities": [],
            "ocr_findings": [],
            "hazard_signals": [],
            "uncertainty_notes": [],
            "confidence_score": 0.67,
            "input_component": "charger",
            "observation_result": "charger_serial_brand_visible",
            "bounding_boxes": [
                {"id": "label", "label": "Charger label", "x": -5, "y": 90, "width": 140, "height": 30},
                {"id": "skip"},
                {"id": "unit", "label": "Charger unit", "x": 25, "y": 10, "width": 50, "height": 70},
                {"id": "extra", "label": "Extra object", "x": 0, "y": 0, "width": 10, "height": 10},
            ],
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ):
        result = assess_theme2_perception(_photo_incident("theme2-bad-boxes.jpg"))

    assert len(result.extraction.bounding_boxes) == 3
    assert result.extraction.bounding_boxes[0].x == 0.0
    assert result.extraction.bounding_boxes[0].height == 10.0
    assert result.extraction.bounding_boxes[1].label == "Charger unit"
    assert result.extraction.bounding_boxes[2].label == "Extra object"


def test_gemini_perception_extracts_json_from_preamble_and_normalizes_common_strings():
    mock_response = MagicMock()
    mock_response.text = """
    Here is the JSON:
    {
      "evidence_type": "charger",
      "scene_summary": "Solid red indicator on charger.",
      "components_visible": "charger",
      "visible_abnormalities": "charger_red_light",
      "ocr_findings": "PROTON e.MAS, RFID",
      "hazard_signals": "solid red light indicator",
      "uncertainty_notes": "Serial number is not visible.",
      "confidence_score": 0.95,
      "input_component": "charger",
      "observation_result": "charger_red_light",
      "charger_serial_number": null,
      "charger_brand_model": "PROTON e.MAS",
      "indicator_status": "solid red light",
      "raw_visible_text": "PROTON e.MAS ((( RFID )))"
    }
    """
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ):
        result = assess_theme2_perception(_photo_incident("theme2-preamble-json.jpg"))

    assert result.mode == "vlm"
    assert result.evidence_type == "hardware_photo"
    assert result.extraction.observation_result == "charger_red_light"
    assert result.extraction.indicator_status == "red_light"
    assert result.extraction.charger_brand_model == "PROTON e.MAS"
    assert result.ocr_findings == ["PROTON e.MAS", "RFID"]


def test_gemini_perception_retries_schema_mismatch_once():
    bad_response = MagicMock()
    bad_response.text = ""
    good_response = MagicMock()
    good_response.text = json.dumps(
        {
            "evidence_type": "hardware_photo",
            "scene_summary": "Charger indicator is red.",
            "components_visible": ["charger"],
            "visible_abnormalities": ["red_indicator"],
            "ocr_findings": [],
            "hazard_signals": [],
            "uncertainty_notes": [],
            "confidence_score": 0.88,
            "input_component": "charger",
            "observation_result": "charger_red_light",
            "charger_serial_number": None,
            "charger_brand_model": None,
            "indicator_status": "red_light",
            "evdb_phase_type": "unknown",
            "mcb_visible": None,
            "rccb_visible": None,
            "mcb_rating": None,
            "rccb_rating": None,
            "rccb_type": "unknown",
            "isolator_state": "unknown",
            "raw_visible_text": [],
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.side_effect = [bad_response, good_response]

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ), patch("app.services.theme2_perception.time.sleep"):
        result = assess_theme2_perception(_photo_incident("theme2-retry.jpg"))

    assert result.mode == "vlm"
    assert result.fallback_used is False
    assert result.extraction.observation_result == "charger_red_light"
    assert mock_client.models.generate_content.call_count == 2


def test_gemini_schema_config_failure_retries_without_schema():
    good_response = MagicMock()
    good_response.text = json.dumps(
        {
            "evidence_type": "hardware_photo",
            "scene_summary": "Charger indicator is red.",
            "components_visible": ["charger"],
            "visible_abnormalities": ["red_indicator"],
            "ocr_findings": [],
            "hazard_signals": [],
            "uncertainty_notes": [],
            "confidence_score": 0.88,
            "input_component": "charger",
            "observation_result": "charger_red_light",
            "charger_serial_number": None,
            "charger_brand_model": None,
            "indicator_status": "red_light",
            "evdb_phase_type": "unknown",
            "mcb_visible": None,
            "rccb_visible": None,
            "mcb_rating": None,
            "rccb_rating": None,
            "rccb_type": "unknown",
            "isolator_state": "unknown",
            "raw_visible_text": [],
        }
    )
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = good_response
    fake_modules = _fake_genai_modules()
    typed_fake_types: Any = fake_modules["google.genai.types"]
    typed_fake_types.GenerateContentConfig.side_effect = [RuntimeError("schema unsupported"), MagicMock()]

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, fake_modules
    ):
        result = assess_theme2_perception(_photo_incident("theme2-schema-fallback.jpg"))

    assert result.mode == "vlm"
    assert result.extraction.observation_result == "charger_red_light"
    assert mock_client.models.generate_content.call_count == 1


def test_gemini_parse_failure_preserves_raw_provider_output():
    mock_response = MagicMock()
    mock_response.text = "not json"
    mock_client = MagicMock()
    mock_client.models.generate_content.return_value = mock_response

    with patch("app.services.theme2_perception.get_gemini_client", return_value=mock_client), patch.dict(
        sys.modules, _fake_genai_modules()
    ), patch("app.services.theme2_perception.time.sleep"):
        result = assess_theme2_perception(_photo_incident("theme2-parse-failure.jpg"))

    assert result.mode == "heuristic"
    assert result.fallback_used is True
    assert result.error_type == "schema_mismatch"
    assert result.raw_provider_output == "not json"
    assert mock_client.models.generate_content.call_count == 3


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
    assert result.extraction.bounding_boxes == []


def test_heuristic_text_maps_tripped_isolator_to_open_circuit():
    result = assess_theme2_perception(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="tripped isolator",
            symptom_text="The isolator looks tripped and the charger has no power.",
        )
    )

    assert result.mode == "text_only"
    assert result.extraction.input_component == "isolator"
    assert result.extraction.observation_result == "isolator_off_open_circuit"
    assert result.extraction.isolator_state == "off"


def test_generic_upload_hint_does_not_force_charger_in_heuristic_fallback():
    with patch("app.services.theme2_perception.get_gemini_client", return_value=None):
        result = assess_theme2_perception(
            IncidentInput(
                site_id="site-mall-01",
                photo_evidence=StoredPhotoEvidence(
                    filename="random.jpg",
                    media_type="image/jpeg",
                    storage_path=str(TEST_UPLOAD_ROOT / "random.jpg"),
                    byte_size=10,
                ),
                photo_hint="Photo uploaded for EV charger troubleshooting.",
            )
        )

    assert result.mode == "heuristic"
    assert result.extraction.input_component == "unknown"
    assert result.extraction.observation_result == "unknown"


def test_heuristic_photo_fallback_adds_component_bounding_box_without_gemini():
    with patch("app.services.theme2_perception.get_gemini_client", return_value=None):
        result = assess_theme2_perception(_photo_incident("theme2-heuristic-box.jpg"))

    assert result.mode == "heuristic"
    assert result.fallback_used is True
    assert result.extraction.observation_result == "charger_red_light"
    assert len(result.extraction.bounding_boxes) == 1
    assert result.extraction.bounding_boxes[0].id == "charger-unit"
    assert result.extraction.bounding_boxes[0].source == "heuristic"
