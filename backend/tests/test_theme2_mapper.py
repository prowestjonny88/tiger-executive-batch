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


def test_unknown_output_requests_clearer_proof():
    output, _ = build_competition_output(
        IncidentInput(site_id="site-mall-01", photo_hint="unclear image"),
        _perception(Theme2VisualExtraction(confidence_score=0.2), score=0.2),
    )

    assert output.observation_result == "unknown"
    assert output.fault_type_v2 == "unknown"
    assert output.recipient_type == "unknown"
    assert output.required_proof_next
