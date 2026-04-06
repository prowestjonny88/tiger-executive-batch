from app.core.models import IncidentInput
from app.services.diagnosis import run_diagnosis
from app.services.triage import run_triage


def test_driver_connectivity_route():
    result = run_triage(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="display on, no damage",
            symptom_text="Charging never starts and LED blinks blue.",
            error_code="NET-01",
        )
    )
    assert result.routing.resolver_tier == "driver"


def test_hazard_routes_to_technician():
    result = run_triage(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="visible connector damage and burn marks",
            symptom_text="Burn smell near connector.",
            error_code="SAFE-99",
        )
    )
    assert result.routing.resolver_tier == "technician"


def test_no_visible_damage_does_not_trigger_hazard():
    diagnosis = run_diagnosis(
        IncidentInput(
            site_id="site-condo-01",
            photo_hint="screen dim, no visible damage",
            symptom_text="Screen is dim and LED blinks red intermittently.",
            error_code="OFF-12",
        )
    )
    assert diagnosis.internal_issue_category == "connectivity"
    assert diagnosis.hazard_flags == []


def test_medium_confidence_connectivity_can_route_to_local_site_resolver():
    result = run_triage(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="screen dim, no visible damage",
            symptom_text="Session stopped suddenly and LED blinks red intermittently.",
            error_code="OFF-12",
            follow_up_answers={
                "screen_on": "yes",
                "visible_damage": "no",
                "charging_state": "stopped_suddenly",
            },
        )
    )
    assert result.routing.resolver_tier == "local_site_resolver"


def test_medium_confidence_connectivity_without_local_resolver_stays_remote_ops():
    result = run_triage(
        IncidentInput(
            site_id="site-condo-01",
            photo_hint="screen dim, no visible damage",
            symptom_text="Screen is dim and LED blinks red intermittently.",
            error_code="OFF-12",
            follow_up_answers={
                "screen_on": "yes",
                "visible_damage": "no",
                "charging_state": "stopped_suddenly",
            },
        )
    )
    assert result.routing.resolver_tier == "remote_ops"
