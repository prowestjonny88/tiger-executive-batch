from app.core.models import IncidentInput, Theme2PerceptionAssessment, Theme2VisualExtraction
from app.services.theme2_triage import build_theme2_followups, run_theme2_triage


def _perception(theme2: Theme2VisualExtraction, score: float | None = None) -> Theme2PerceptionAssessment:
    return Theme2PerceptionAssessment(
        mode="heuristic",
        evidence_type="hardware_photo",
        scene_summary="Theme 2 perception.",
        confidence_score=score if score is not None else theme2.confidence_score,
        extraction=theme2,
    )


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


def test_theme2_triage_no_photo_requests_photo():
    result = run_theme2_triage(IncidentInput(site_id="site-mall-01", photo_hint="charger no light"))

    question_ids = {item.question_id for item in result.follow_up_prompts}
    assert "photo_request" in question_ids


def test_followups_request_evdb_label_closeup_when_ratings_missing():
    prompts = build_theme2_followups(
        IncidentInput(site_id="site-mall-01", photo_hint="EVDB single phase"),
        _perception(
            Theme2VisualExtraction(
                input_component="evdb",
                observation_result="evdb_single_phase",
                evdb_phase_type="single_phase",
                confidence_score=0.75,
            )
        ),
    )

    assert "evdb_label_closeup" in {item.question_id for item in prompts}


def test_followups_request_charger_identity_closeup_when_serial_missing():
    prompts = build_theme2_followups(
        IncidentInput(site_id="site-mall-01", photo_hint="charger serial label visible"),
        _perception(
            Theme2VisualExtraction(
                input_component="charger",
                observation_result="charger_serial_brand_visible",
                charger_serial_number=None,
                charger_brand_model=None,
                confidence_score=0.75,
            )
        ),
    )

    assert "charger_identity_closeup" in {item.question_id for item in prompts}


def test_followups_do_not_request_charger_identity_closeup_when_identity_readable():
    prompts = build_theme2_followups(
        IncidentInput(site_id="site-mall-01", photo_hint="charger serial label visible"),
        _perception(
            Theme2VisualExtraction(
                input_component="charger",
                observation_result="charger_serial_brand_visible",
                charger_serial_number="260301982",
                charger_brand_model="Proton eMAS",
                confidence_score=0.75,
            )
        ),
    )

    assert "charger_identity_closeup" not in {item.question_id for item in prompts}


def test_followups_request_charger_identity_closeup_when_brand_missing():
    prompts = build_theme2_followups(
        IncidentInput(site_id="site-mall-01", photo_hint="charger serial label visible"),
        _perception(
            Theme2VisualExtraction(
                input_component="charger",
                observation_result="charger_serial_brand_visible",
                charger_serial_number="260301982",
                charger_brand_model=None,
                confidence_score=0.75,
            )
        ),
    )

    assert "charger_identity_closeup" in {item.question_id for item in prompts}


def test_followups_do_not_request_charger_identity_for_evdb_or_isolator():
    for extraction in [
        Theme2VisualExtraction(input_component="evdb", observation_result="evdb_three_phase", confidence_score=0.75),
        Theme2VisualExtraction(input_component="isolator", observation_result="isolator_on", confidence_score=0.75),
    ]:
        prompts = build_theme2_followups(
            IncidentInput(site_id="site-mall-01", photo_hint="hardware evidence"),
            _perception(extraction),
        )

        assert "charger_identity_closeup" not in {item.question_id for item in prompts}


def test_followups_request_evdb_proof_for_phase_observation():
    for observation in ["evdb_single_phase", "evdb_three_phase"]:
        prompts = build_theme2_followups(
            IncidentInput(site_id="site-mall-01", photo_hint="EVDB labels"),
            _perception(
                Theme2VisualExtraction(
                    input_component="evdb",
                    observation_result=observation,  # type: ignore[arg-type]
                    evdb_phase_type="single_phase" if observation == "evdb_single_phase" else "three_phase",
                    mcb_rating="40A",
                    rccb_rating="40A",
                    rccb_type="type_a",
                    confidence_score=0.75,
                )
            ),
        )

        assert "evdb_label_closeup" in {item.question_id for item in prompts}


def test_followups_request_isolator_switch_state_when_unknown():
    prompts = build_theme2_followups(
        IncidentInput(site_id="site-mall-01", photo_hint="isolator visible"),
        _perception(
            Theme2VisualExtraction(
                input_component="isolator",
                observation_result="unknown",
                confidence_score=0.75,
            )
        ),
    )

    assert "isolator_switch_state" in {item.question_id for item in prompts}
