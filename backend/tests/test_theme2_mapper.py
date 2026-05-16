import pytest

from app.core.models import IncidentInput, Theme2PerceptionAssessment, Theme2VisualExtraction
from app.services.theme2_mapper import build_competition_output


def _perception(theme2: Theme2VisualExtraction, score: float | None = None) -> Theme2PerceptionAssessment:
    return Theme2PerceptionAssessment(
        mode="heuristic",
        evidence_type="hardware_photo",
        scene_summary="Theme 2 perception.",
        confidence_score=score if score is not None else theme2.confidence_score,
        extraction=theme2,
    )


def test_charger_red_light_maps_to_after_sales_team():
    output, meta = build_competition_output(
        IncidentInput(site_id="site-mall-01", photo_hint="charger red light"),
        _perception(Theme2VisualExtraction(input_component="charger", observation_result="charger_red_light", confidence_score=0.9)),
    )

    assert output.fault_type_v2 == "charger_issue"
    assert output.recipient_type == "after_sales_team"
    assert output.assigned_team_id == "AS_TEAM_01"
    assert meta["rule_key"] == "charger_red_light"


def test_charger_no_light_maps_to_customer_supply_issue():
    output, _ = build_competition_output(
        IncidentInput(site_id="site-mall-01", photo_hint="charger no light"),
        _perception(Theme2VisualExtraction(input_component="charger", observation_result="charger_no_light", confidence_score=0.8)),
    )

    assert output.fault_type_v2 == "supply_issue"
    assert output.recipient_type == "customer"
    assert output.assigned_team_id is None


def test_isolator_off_maps_to_customer_power_cut():
    output, _ = build_competition_output(
        IncidentInput(site_id="site-mall-01", photo_hint="isolator off open circuit"),
        _perception(
            Theme2VisualExtraction(
                input_component="isolator",
                observation_result="isolator_off_open_circuit",
                isolator_state="off",
                confidence_score=0.84,
            )
        ),
    )

    assert output.fault_type_v2 == "power_cut"
    assert output.recipient_type == "customer"


def test_missing_mcb_rccb_maps_to_after_sales_protection_issue():
    output, _ = build_competition_output(
        IncidentInput(site_id="site-mall-01", photo_hint="EVDB missing RCCB"),
        _perception(
            Theme2VisualExtraction(
                input_component="evdb",
                observation_result="evdb_single_phase",
                mcb_visible=True,
                rccb_visible=False,
                confidence_score=0.86,
            )
        ),
    )

    assert output.observation_result == "missing_mcb_rccb"
    assert output.fault_type_v2 == "protection_issue"
    assert output.recipient_type == "after_sales_team"
    assert output.assigned_team_id == "AS_TEAM_01"


def test_wrong_rccb_type_maps_to_after_sales_protection_issue():
    output, _ = build_competition_output(
        IncidentInput(site_id="site-mall-01", photo_hint="EVDB RCCB Type AC"),
        _perception(
            Theme2VisualExtraction(
                input_component="evdb",
                observation_result="evdb_single_phase",
                rccb_type="type_ac",
                confidence_score=0.86,
            )
        ),
    )

    assert output.observation_result == "wrong_component_specs"
    assert output.fault_type_v2 == "protection_issue"
    assert output.recipient_type == "after_sales_team"


def test_serial_brand_visible_preserves_nulls_when_unreadable():
    output, _ = build_competition_output(
        IncidentInput(site_id="site-mall-01", photo_hint="charger serial label visible"),
        _perception(
            Theme2VisualExtraction(
                input_component="charger",
                observation_result="charger_serial_brand_visible",
                charger_serial_number=None,
                charger_brand_model=None,
                confidence_score=0.72,
            )
        ),
    )

    assert output.fault_type_v2 == "identification_only"
    assert output.recipient_type == "none"
    assert output.charger_serial_number is None
    assert output.charger_brand_model is None
    assert "not readable" in " ".join(output.evidence_notes).lower()


def test_blinking_red_with_flash_count_7_maps_to_manual_error_customer():
    output, meta = build_competition_output(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="charger blinking red",
            follow_up_answers={"red_light_flash_count": "7 flashes"},
        ),
        _perception(
            Theme2VisualExtraction(
                input_component="charger",
                observation_result="charger_blinking_red_light",
                indicator_status="blinking_red_light",
                confidence_score=0.8,
            )
        ),
    )

    assert output.fault_type_v2 == "manual_error"
    assert output.recipient_type == "customer"
    assert output.assigned_team_id is None
    assert meta["error_log_key"] == "red_light_flashes_7"


@pytest.mark.parametrize(
    ("flash_count", "fault_type", "recipient", "team_id"),
    [
        ("6 flashes", "installation_issue", "after_sales_team", "AS_TEAM_01"),
        ("8 flashes", "charger_issue", "after_sales_team", "AS_TEAM_01"),
        ("9 flashes", "charger_issue", "customer", None),
    ],
)
def test_blinking_red_flash_count_refinements(flash_count: str, fault_type: str, recipient: str, team_id: str | None):
    output, meta = build_competition_output(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="charger blinking red",
            follow_up_answers={"red_light_flash_count": flash_count},
        ),
        _perception(
            Theme2VisualExtraction(
                input_component="charger",
                observation_result="charger_blinking_red_light",
                indicator_status="blinking_red_light",
                confidence_score=0.8,
            )
        ),
    )

    assert output.fault_type_v2 == fault_type
    assert output.recipient_type == recipient
    assert output.assigned_team_id == team_id
    assert meta["error_log_key"] == f"red_light_flashes_{flash_count[0]}"


@pytest.mark.parametrize(
    "theme2",
    [
        Theme2VisualExtraction(input_component="evdb", observation_result="evdb_single_phase", mcb_visible=False, confidence_score=0.82),
        Theme2VisualExtraction(input_component="evdb", observation_result="evdb_three_phase", rccb_visible=False, confidence_score=0.82),
    ],
)
def test_evdb_missing_breaker_refines_to_missing_mcb_rccb(theme2: Theme2VisualExtraction):
    output, _ = build_competition_output(
        IncidentInput(site_id="site-mall-01", photo_hint="EVDB protection missing"),
        _perception(theme2),
    )

    assert output.observation_result == "missing_mcb_rccb"
    assert output.recipient_type == "after_sales_team"


@pytest.mark.parametrize(
    "theme2",
    [
        Theme2VisualExtraction(input_component="evdb", observation_result="evdb_single_phase", rccb_type="type_ac", confidence_score=0.82),
        Theme2VisualExtraction(input_component="evdb", observation_result="evdb_single_phase", evdb_phase_type="single_phase", rccb_rating="40A 4P", confidence_score=0.82),
        Theme2VisualExtraction(input_component="evdb", observation_result="evdb_three_phase", evdb_phase_type="three_phase", mcb_rating="40A 2P", confidence_score=0.82),
        Theme2VisualExtraction(input_component="evdb", observation_result="evdb_three_phase", evdb_phase_type="three_phase", mcb_rating="40A 3P", confidence_score=0.82),
        Theme2VisualExtraction(input_component="evdb", observation_result="evdb_three_phase", evdb_phase_type="three_phase", rccb_rating="40A 2P", confidence_score=0.82),
    ],
)
def test_evdb_wrong_component_specs_refinements(theme2: Theme2VisualExtraction):
    output, _ = build_competition_output(
        IncidentInput(site_id="site-mall-01", photo_hint="EVDB labels visible"),
        _perception(theme2),
    )

    assert output.observation_result == "wrong_component_specs"
    assert output.fault_type_v2 == "protection_issue"
    assert output.recipient_type == "after_sales_team"


@pytest.mark.parametrize(
    "theme2",
    [
        Theme2VisualExtraction(
            input_component="evdb",
            observation_result="evdb_single_phase",
            evdb_phase_type="single_phase",
            mcb_rating="C40",
            rccb_rating="40A",
            rccb_type="type_a",
            confidence_score=0.82,
        ),
        Theme2VisualExtraction(
            input_component="evdb",
            observation_result="evdb_three_phase",
            evdb_phase_type="three_phase",
            mcb_rating="C40",
            rccb_rating="40A / 30mA",
            rccb_type="type_a",
            confidence_score=0.82,
        ),
    ],
)
def test_evdb_incomplete_rating_text_does_not_refine_to_wrong_specs(theme2: Theme2VisualExtraction):
    output, _ = build_competition_output(
        IncidentInput(site_id="site-mall-01", photo_hint="EVDB labels visible"),
        _perception(theme2),
    )

    assert output.observation_result == theme2.observation_result


def test_mcb_tripped_is_not_overridden_by_spec_refinement():
    output, _ = build_competition_output(
        IncidentInput(site_id="site-mall-01", photo_hint="mcb tripped"),
        _perception(
            Theme2VisualExtraction(
                input_component="evdb",
                observation_result="mcb_tripped",
                evdb_phase_type="single_phase",
                rccb_type="type_ac",
                rccb_rating="40A 4P",
                confidence_score=0.82,
            )
        ),
    )

    assert output.observation_result == "mcb_tripped"


def test_safety_signal_escalates_to_after_sales():
    output, meta = build_competition_output(
        IncidentInput(site_id="site-mall-01", photo_hint="charger no light", symptom_text="burning smell near charger"),
        _perception(Theme2VisualExtraction(input_component="charger", observation_result="charger_no_light", confidence_score=0.8)),
    )

    assert output.recipient_type == "after_sales_team"
    assert output.assigned_team_id == "AS_TEAM_01"
    assert output.action_message == "Stop using the charger and contact after-sales team."
    assert meta["override_key"] == "safety_escalation"


def test_repeated_mcb_trip_escalates_to_after_sales():
    output, meta = build_competition_output(
        IncidentInput(site_id="site-mall-01", photo_hint="mcb tripped", symptom_text="Breaker cannot reset after tripping."),
        _perception(Theme2VisualExtraction(input_component="evdb", observation_result="mcb_tripped", confidence_score=0.8)),
    )

    assert output.fault_type_v2 == "protection_issue"
    assert output.recipient_type == "after_sales_team"
    assert output.assigned_team_id == "AS_TEAM_01"
    assert meta["override_key"] == "repeated_mcb_trip_escalation"


def test_mcb_trip_does_not_escalate_from_hot_substring_in_photo_text():
    output, meta = build_competition_output(
        IncidentInput(site_id="site-mall-01", photo_hint="Photo uploaded for EV charger troubleshooting."),
        _perception(
            Theme2VisualExtraction(
                input_component="evdb",
                observation_result="mcb_tripped",
                confidence_score=0.8,
            )
        ),
    )

    assert output.recipient_type == "customer"
    assert output.assigned_team_id is None
    assert meta["override_key"] is None


def test_no_light_unresolved_after_normal_breaker_escalates_to_after_sales():
    output, meta = build_competition_output(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="charger no light",
            follow_up_answers={"evdb_breaker_checked": "normal", "charger_still_off": "yes"},
        ),
        _perception(Theme2VisualExtraction(input_component="charger", observation_result="charger_no_light", confidence_score=0.8)),
    )

    assert output.fault_type_v2 == "charger_issue"
    assert output.recipient_type == "after_sales_team"
    assert output.assigned_team_id == "AS_TEAM_01"
    assert meta["override_key"] == "no_light_unresolved_escalation"


def test_unknown_output_requests_clearer_proof():
    output, _ = build_competition_output(
        IncidentInput(site_id="site-mall-01", photo_hint="unclear image"),
        _perception(Theme2VisualExtraction(confidence_score=0.2), score=0.2),
    )

    assert output.observation_result == "unknown"
    assert output.fault_type_v2 == "unknown"
    assert output.recipient_type == "unknown"
    assert output.required_proof_next
