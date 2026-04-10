from app.core.models import IncidentInput
from app.services.diagnosis import run_diagnosis
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
