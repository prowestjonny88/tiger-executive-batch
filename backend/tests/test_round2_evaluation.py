from __future__ import annotations

import sys
from pathlib import Path
import shutil

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from app.core.models import CompetitionOutput, IncidentInput, Theme2DebugInfo, Theme2PerceptionAssessment, Theme2TriageResult, Theme2VisualExtraction  # noqa: E402
from app.services.theme2_triage import run_theme2_triage  # noqa: E402
from scripts.check_round2_eval_coverage import build_coverage_report, main as coverage_main  # noqa: E402
import scripts.evaluate_round2_cases as eval_script  # noqa: E402
from scripts.extract_round2_video_frames import frame_output_path, parse_seconds  # noqa: E402
from scripts.evaluate_round2_cases import build_photo_hint, evaluate, incident_for  # noqa: E402
from scripts.round2_eval_utils import normalize_brand_model, normalize_serial  # noqa: E402


def _script_test_dir(name: str) -> Path:
    path = Path(__file__).parent / "test-uploads" / "round2-evaluation" / name
    shutil.rmtree(path, ignore_errors=True)
    path.mkdir(parents=True)
    return path


def test_blind_eval_hint_does_not_leak_expected_labels():
    case = {
        "case_id": "leak_check",
        "case_type": "image",
        "relative_path": "EVDB (MCB,RCCB)/Single Phase/example.jpg",
        "input_component_expected": "evdb",
        "observation_expected": "evdb_single_phase",
        "fault_type_expected": "unknown",
        "recipient_expected": "customer",
    }

    hint = build_photo_hint(case, "blind-image-eval").lower()

    assert hint == "photo uploaded for ev charger troubleshooting."
    assert "charger red light" not in hint
    assert "evdb single phase" not in hint
    assert "isolator on" not in hint
    assert "isolator off" not in hint
    assert "evdb" not in hint
    assert "single phase" not in hint


def test_weak_label_sanity_hint_keeps_expected_labels():
    case = {
        "case_id": "weak_check",
        "relative_path": "Charger/Charger Red Light/example.jpg",
        "input_component_expected": "charger",
        "observation_expected": "charger_red_light",
    }

    hint = build_photo_hint(case, "weak-label-sanity").lower()

    assert "charger red light" in hint
    assert "charger/charger red light/example.jpg" in hint


def test_text_followup_case_builds_incident_without_image():
    case = {
        "case_id": "text_followup",
        "case_type": "text_followup",
        "relative_path": None,
        "symptom_text": "The charger has blinking red light.",
        "follow_up_answers": {"red_light_flash_count": "7 flashes"},
    }

    incident = incident_for(case, REPO_ROOT / "data" / "round2" / "images", "blind-image-eval")

    assert incident.photo_evidence is None
    assert incident.symptom_text == "The charger has blinking red light."
    assert incident.follow_up_answers == {"red_light_flash_count": "7 flashes"}


def test_blind_image_case_does_not_pass_label_notes_as_symptom_text():
    case = {
        "case_id": "blind_notes",
        "case_type": "image",
        "relative_path": "Charger/Charger Red Light/example.jpg",
        "input_component_expected": "charger",
        "observation_expected": "charger_red_light",
        "notes": "Clean auto-accepted pseudo-label from Charger Red Light folder.",
    }

    incident = incident_for(case, REPO_ROOT / "data" / "round2" / "images", "blind-image-eval")

    assert incident.symptom_text == ""
    assert incident.photo_hint is not None
    assert "red light" not in incident.photo_hint.lower()


def test_blinking_red_text_followup_eval_cases_map_to_expected_rules():
    cases = [
        ("6 flashes", "installation_issue", "after_sales_team"),
        ("7 flashes", "manual_error", "customer"),
        ("8 flashes", "charger_issue", "after_sales_team"),
        ("9 flashes", "charger_issue", "customer"),
    ]

    for flash_count, expected_fault, expected_recipient in cases:
        incident = incident_for(
            {
                "case_id": f"blinking_{flash_count[0]}",
                "case_type": "text_followup",
                "relative_path": None,
                "symptom_text": "The charger has blinking red light.",
                "follow_up_answers": {"red_light_flash_count": flash_count},
            },
            REPO_ROOT / "data" / "round2" / "images",
            "blind-image-eval",
        )

        result = run_theme2_triage(incident)

        assert result.competition_output.observation_result == "charger_blinking_red_light"
        assert result.competition_output.fault_type_v2 == expected_fault
        assert result.competition_output.recipient_type == expected_recipient


def test_evaluate_returns_failure_details_for_mismatched_case():
    report = evaluate(
        [
            {
                "case_id": "mismatch",
                "case_type": "text_followup",
                "relative_path": None,
                "input_component_expected": "charger",
                "observation_expected": "charger_red_light",
                "fault_type_expected": "charger_issue",
                "recipient_expected": "after_sales_team",
                "symptom_text": "The charger has blinking red light.",
                "follow_up_answers": {"red_light_flash_count": "7 flashes"},
            }
        ],
        REPO_ROOT / "data" / "round2" / "images",
        "blind-image-eval",
    )

    assert report["evaluated_cases"] == 1
    assert len(report["failures"]) == 1
    failure = report["failures"][0]
    assert failure["case_id"] == "mismatch"
    assert "observation" in failure["failed_fields"]
    assert failure["expected"]["observation"] == "charger_red_light"
    assert failure["actual"]["observation"] == "charger_blinking_red_light"
    assert failure["perception"]["extraction"]["indicator_status"] == "blinking_red_light"


def test_ocr_normalization_helpers_match_common_variants():
    assert normalize_serial("260 301 982") == "260301982"
    assert normalize_serial("260-301_982") == "260301982"
    assert normalize_brand_model("PROTON e.MAS") == "proton emas"
    assert normalize_brand_model("Proton-eMAS") == "proton emas"


def test_evaluate_uses_normalized_serial_and_brand_metrics(monkeypatch):
    def fake_triage(_: IncidentInput) -> Theme2TriageResult:
        extraction = Theme2VisualExtraction(
            input_component="charger",
            observation_result="charger_serial_brand_visible",
            charger_serial_number="260-301-982",
            charger_brand_model="Proton-eMAS",
            confidence_score=0.9,
        )
        return Theme2TriageResult(
            incident=IncidentInput(site_id="site-mall-01"),
            perception=Theme2PerceptionAssessment(mode="heuristic", scene_summary="identity", confidence_score=0.9, extraction=extraction),
            competition_output=CompetitionOutput(
                input_component="charger",
                observation_result="charger_serial_brand_visible",
                charger_serial_number="260-301-982",
                charger_brand_model="Proton-eMAS",
                fault_type_v2="identification_only",
                recipient_type="none",
                action_message="Identity captured.",
                confidence_score=0.9,
            ),
            follow_up_prompts=[],
            debug=Theme2DebugInfo(perception_mode="heuristic", provider_attempted=False, fallback_used=True),
        )

    monkeypatch.setattr(eval_script, "run_theme2_triage", fake_triage)

    report = evaluate(
        [
            {
                "case_id": "normalized_ocr",
                "case_type": "text_followup",
                "relative_path": None,
                "input_component_expected": "charger",
                "observation_expected": "charger_serial_brand_visible",
                "fault_type_expected": "identification_only",
                "recipient_expected": "none",
                "serial_number_expected": "260 301 982",
                "brand_model_expected": "PROTON e.MAS",
                "symptom_text": "Serial SN 260301982 and brand Proton eMAS are visible on the charger.",
                "follow_up_answers": {},
            }
        ],
        REPO_ROOT / "data" / "round2" / "images",
        "weak-label-sanity",
    )

    assert report["metrics"]["Serial exact match"]["correct"] == 1
    assert report["metrics"]["Brand/model exact match"]["correct"] == 1
    case = report["case_results"][0]
    assert case["normalized_expected"]["serial_number"] == "260301982"
    assert case["normalized_actual"]["serial_number"] == "260301982"


def test_evaluate_normalized_ocr_still_fails_different_values(monkeypatch):
    def fake_triage(_: IncidentInput) -> Theme2TriageResult:
        extraction = Theme2VisualExtraction(
            input_component="charger",
            observation_result="charger_serial_brand_visible",
            charger_serial_number="260301982",
            charger_brand_model="Proton eMAS",
            confidence_score=0.9,
        )
        return Theme2TriageResult(
            incident=IncidentInput(site_id="site-mall-01"),
            perception=Theme2PerceptionAssessment(mode="heuristic", scene_summary="identity", confidence_score=0.9, extraction=extraction),
            competition_output=CompetitionOutput(
                input_component="charger",
                observation_result="charger_serial_brand_visible",
                charger_serial_number="260301982",
                charger_brand_model="Proton eMAS",
                fault_type_v2="identification_only",
                recipient_type="none",
                action_message="Identity captured.",
                confidence_score=0.9,
            ),
            follow_up_prompts=[],
            debug=Theme2DebugInfo(perception_mode="heuristic", provider_attempted=False, fallback_used=True),
        )

    monkeypatch.setattr(eval_script, "run_theme2_triage", fake_triage)

    report = evaluate(
        [
            {
                "case_id": "different_ocr",
                "case_type": "text_followup",
                "relative_path": None,
                "input_component_expected": "charger",
                "observation_expected": "charger_serial_brand_visible",
                "fault_type_expected": "identification_only",
                "recipient_expected": "none",
                "serial_number_expected": "999999",
                "brand_model_expected": "Other Brand",
                "symptom_text": "Serial SN 260301982 and brand Proton eMAS are visible on the charger.",
                "follow_up_answers": {},
            }
        ],
        REPO_ROOT / "data" / "round2" / "images",
        "weak-label-sanity",
    )

    assert report["metrics"]["Serial exact match"]["correct"] == 0
    assert report["metrics"]["Brand/model exact match"]["correct"] == 0
    assert {"serial", "brand_model"}.issubset(set(report["failures"][0]["failed_fields"]))


def test_eval_coverage_warns_for_missing_isolator_and_ocr_ground_truth():
    report = build_coverage_report(
        [
            {
                "case_id": "charger",
                "case_type": "image",
                "input_component_expected": "charger",
                "observation_expected": "charger_red_light",
                "fault_type_expected": "charger_issue",
                "recipient_expected": "after_sales_team",
            }
        ]
    )

    warnings = " ".join(report["warnings"])
    assert "isolator" in warnings
    assert "serial_number_expected" in warnings
    assert "brand_model_expected" in warnings


def test_eval_coverage_strict_fails_but_default_passes():
    tmp_path = _script_test_dir("coverage")
    cases_path = tmp_path / "cases.json"
    cases_path.write_text("[]\n", encoding="utf-8")

    assert coverage_main(["--cases", str(cases_path)]) == 0
    assert coverage_main(["--cases", str(cases_path), "--strict"]) == 1


def test_video_frame_seconds_and_output_path_generation():
    assert parse_seconds("1,3,5") == [1, 3, 5]
    assert frame_output_path(Path("frames"), Path("Charger Red Light.mp4"), 3) == Path("frames") / "Charger Red Light_frame_003.jpg"
