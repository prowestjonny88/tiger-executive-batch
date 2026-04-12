from unittest.mock import patch

from app.core.models import IncidentInput, StoredPhotoEvidence
from app.core.models import SeverityLevel
from app.services.diagnosis import run_diagnosis
from app.services.diagnosis_contracts import DiagnosisProviderResponse
from app.services.diagnosis_support import make_basic_conditions
from app.services.triage import run_triage


def test_no_power_branch_returns_resolved_workflow():
    result = run_triage(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="display off, no lights",
            symptom_text="The charger has no power and the bay appears dead.",
            follow_up_answers={
                "main_power_supply": "Incoming supply is missing.",
                "cable_condition": "Cable looks normal.",
                "indicator_or_error_code": "No indicator is visible.",
            },
        )
    )
    assert result.diagnosis.issue_type == "no_power"
    assert result.workflow.outcome == "resolved"


def test_tripping_branch_escalates_when_cable_condition_is_problem():
    result = run_triage(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="breaker trip with warm connector",
            symptom_text="The MCB trips during charging and the connector feels hot.",
            error_code="TRIP-02",
            follow_up_answers={
                "main_power_supply": "Power is available.",
                "cable_condition": "Loose connector and overheating observed.",
                "indicator_or_error_code": "TRIP-02 shown before trip.",
            },
        )
    )
    assert result.diagnosis.issue_type == "tripping_mcb_rccb"
    assert result.workflow.outcome == "escalate"


def test_charging_slow_branch_returns_resolved_workflow():
    result = run_triage(
        IncidentInput(
            site_id="site-condo-01",
            photo_hint="display on, reduced output",
            symptom_text="Charging is much slower than usual for the same vehicle.",
            error_code="SLOW-11",
            follow_up_answers={
                "main_power_supply": "Main supply is available.",
                "cable_condition": "Cable and connector are good.",
                "indicator_or_error_code": "Display shows reduced current and SLOW-11.",
            },
        )
    )
    assert result.diagnosis.issue_type == "charging_slow"
    assert result.workflow.outcome == "resolved"


def test_not_responding_branch_returns_resolved_workflow_when_power_is_stable():
    result = run_triage(
        IncidentInput(
            site_id="site-condo-01",
            photo_hint="screen frozen, buttons unresponsive",
            symptom_text="The charger remains powered but the controls do not respond.",
            error_code="UI-09",
            follow_up_answers={
                "main_power_supply": "Main power is available.",
                "cable_condition": "Cable and connector are normal.",
                "indicator_or_error_code": "Screen is frozen on UI-09.",
            },
        )
    )
    assert result.diagnosis.issue_type == "not_responding"
    assert result.workflow.outcome == "resolved"


def test_unknown_basic_checks_force_escalation():
    result = run_triage(
        IncidentInput(
            site_id="site-condo-01",
            photo_hint="unclear image",
            symptom_text="Charger issue reported but observations are incomplete.",
        )
    )
    assert result.workflow.outcome == "escalate"


def test_visible_hazard_forces_escalation():
    result = run_triage(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="burn marks and exposed cable damage",
            symptom_text="There is a burnt smell near the connector.",
            error_code="SAFE-99",
        )
    )
    assert result.workflow.outcome == "escalate"
    assert "visible_hazard" in result.diagnosis.hazard_flags


def test_vlm_failure_falls_back_to_organizer_heuristic_classification():
    diagnosis = run_diagnosis(
        IncidentInput(
            site_id="site-condo-01",
            photo_hint="display on, reduced output",
            symptom_text="Charging is very slow today.",
        )
    )
    assert diagnosis.issue_type == "charging_slow"


def test_ocr_branch_selected_for_screenshot_text_cases():
    diagnosis = run_diagnosis(
        IncidentInput(
            site_id="site-condo-01",
            photo_hint="WC Apps screenshot shows charger faulted status",
            symptom_text="App screen captured after failed session.",
            error_code="Faulted",
        )
    )
    assert diagnosis.branch_name == "ocr_text_branch"
    assert diagnosis.diagnosis_source == "ocr_text_interpretation"
    assert diagnosis.ocr_metadata is not None
    assert diagnosis.ocr_metadata.matched_rule == "faulted_status"


def test_ocr_branch_selected_for_app_screenshot_image_even_without_text_hints():
    with patch("app.services.diagnosis_support._looks_like_mobile_app_screenshot", return_value=True):
        diagnosis = run_diagnosis(
            IncidentInput(
                site_id="site-condo-01",
                photo_evidence=StoredPhotoEvidence(
                    filename="568a3aff-4595-4e3d-ae36-57b8ca10d5ea.jpg",
                    media_type="image/jpeg",
                    storage_path="uploads/incidents/568a3aff-4595-4e3d-ae36-57b8ca10d5ea.jpg",
                    byte_size=45678,
                ),
                photo_hint="Photo: 568a3aff-4595-4e3d-ae36-57b8ca10d5ea.jpg",
                symptom_text="",
                error_code="",
            )
        )

    assert diagnosis.branch_name == "ocr_text_branch"
    assert diagnosis.diagnosis_source == "ocr_text_interpretation"
    assert diagnosis.classifier_metadata is not None
    assert diagnosis.classifier_metadata.bypassed is True


def test_symptom_branch_selected_for_no_pulse_cases():
    diagnosis = run_diagnosis(
        IncidentInput(
            site_id="site-condo-01",
            symptom_text="Charger no pulse and charging never started.",
            follow_up_answers={
                "main_power_supply": "Power is available.",
                "indicator_or_error_code": "No visible error code.",
            },
        )
    )
    assert diagnosis.branch_name == "symptom_multimodal_branch"
    assert diagnosis.issue_type == "not_responding"
    assert diagnosis.classifier_metadata is not None
    assert diagnosis.classifier_metadata.bypassed is True


def test_hardware_visual_branch_selected_for_in_scope_hardware_photos():
    response = DiagnosisProviderResponse(
        provider_summary="Mock hardware classifier response.",
        issue_type="tripping_mcb_rccb",
        likely_fault="MCB trip or upstream protective device issue",
        confidence_score=0.97,
        raw_ocr_text="",
        severity=SeverityLevel.HIGH,
        basic_conditions=make_basic_conditions(
            main_power_supply="ok",
            cable_condition="problem",
            indicator_or_error_code="ok",
        ),
        branch_name="hardware_visual_branch",
        diagnosis_source="hardware_visual_classifier",
        classifier_metadata={
            "enabled": True,
            "used": True,
            "bypassed": False,
            "model_name": "facebook/dinov2-small",
            "predicted_label": "mcb_tripped",
            "predicted_probability": 0.97,
            "confidence_policy_action": "strong_fault_hint",
            "candidate_labels": ["mcb_tripped"],
            "extra": {},
        },
    )

    with patch("app.services.diagnosis.analyze_hardware_visual_branch", return_value=response):
        diagnosis = run_diagnosis(
            IncidentInput(
                site_id="site-mall-01",
                photo_evidence=StoredPhotoEvidence(
                    filename="charger.jpg",
                    media_type="image/jpeg",
                    storage_path="uploads/incidents/charger.jpg",
                    byte_size=128000,
                ),
                photo_hint="photo of breaker and charger hardware",
                symptom_text="Customer reported visible breaker trip at charger.",
            )
        )

    assert diagnosis.branch_name == "hardware_visual_branch"
    assert diagnosis.classifier_metadata is not None
    assert diagnosis.classifier_metadata.used is True
    assert diagnosis.classifier_metadata.predicted_label == "mcb_tripped"


def test_classifier_branch_failure_falls_back_safely():
    with patch("app.services.diagnosis.analyze_hardware_visual_branch", side_effect=RuntimeError("classifier offline")), patch(
        "app.services.diagnosis.get_gemini_client", return_value=None
    ):
        diagnosis = run_diagnosis(
            IncidentInput(
                site_id="site-mall-01",
                photo_evidence=StoredPhotoEvidence(
                    filename="charger.jpg",
                    media_type="image/jpeg",
                    storage_path="uploads/incidents/charger.jpg",
                    byte_size=128000,
                ),
                photo_hint="no power at charger and hardware photo attached",
                symptom_text="The charger has no power.",
            )
        )

    assert diagnosis.branch_name == "branch_orchestrator_fallback"
    assert diagnosis.issue_type == "no_power"


def test_ocr_over_voltage_rule_sets_hazard_and_escalation_signal():
    diagnosis = run_diagnosis(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="app screenshot with Over-Voltage Fault warning",
            symptom_text="WC Apps Error Logs screenshot attached.",
            error_code="Over-Voltage Fault",
        )
    )
    assert diagnosis.branch_name == "ocr_text_branch"
    assert "visible_hazard" in diagnosis.hazard_flags
    assert diagnosis.ocr_metadata is not None
    assert diagnosis.ocr_metadata.matched_rule == "over_voltage_fault"
