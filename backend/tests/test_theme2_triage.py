from app.core.models import IncidentInput
from app.services.theme2_triage import run_theme2_triage


def test_theme2_triage_returns_clean_contract_for_text_demo():
    result = run_theme2_triage(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="charger red light",
            symptom_text="Customer reports charger red light.",
        )
    )

    assert result.competition_output.input_component == "charger"
    assert result.competition_output.observation_result == "charger_red_light"
    assert result.competition_output.fault_type_v2 == "charger_issue"
    assert result.competition_output.recipient_type == "after_sales_team"
    assert result.debug.rule_key == "charger_red_light"


def test_theme2_triage_followup_for_blinking_red_without_flash_count():
    result = run_theme2_triage(
        IncidentInput(
            site_id="site-mall-01",
            photo_hint="charger blinking red light",
            symptom_text="The charger has a blinking red indicator.",
        )
    )

    question_ids = {item.question_id for item in result.follow_up_prompts}
    assert "red_light_flash_count" in question_ids


def test_theme2_triage_low_confidence_unknown_requests_clearer_proof():
    result = run_theme2_triage(IncidentInput(site_id="site-mall-01", photo_hint="unclear evidence"))

    assert result.competition_output.observation_result == "unknown"
    assert result.competition_output.required_proof_next
    question_ids = {item.question_id for item in result.follow_up_prompts}
    assert "clear_theme2_photo" in question_ids
