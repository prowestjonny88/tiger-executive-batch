from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from app.services.theme2_triage import run_theme2_triage  # noqa: E402
from scripts.evaluate_round2_cases import build_photo_hint, evaluate, incident_for  # noqa: E402


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
