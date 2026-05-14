from app.services.theme2_rules import (
    REQUIRED_OBSERVATIONS,
    get_after_sales_team_id,
    get_error_log_rule,
    get_theme2_rule,
    load_theme2_rules,
)


def test_theme2_rule_file_loads_with_required_observations():
    payload = load_theme2_rules()
    rules = payload["rules"]

    assert payload["version"]
    assert set(rules).issuperset(REQUIRED_OBSERVATIONS)


def test_after_sales_rules_include_team_id():
    assert get_after_sales_team_id() == "AS_TEAM_01"

    for observation in ["charger_red_light", "missing_mcb_rccb", "wrong_component_specs"]:
        rule = get_theme2_rule(observation)  # type: ignore[arg-type]
        assert rule["recipient_type"] == "after_sales_team"
        assert rule["assigned_team_id"] == "AS_TEAM_01"


def test_unknown_fallback_rule_exists():
    rule = get_theme2_rule("unknown")

    assert rule["fault_type_v2"] == "unknown"
    assert rule["recipient_type"] == "unknown"
    assert rule["required_proof_next"]


def test_blinking_red_error_log_rules_exist():
    assert get_error_log_rule("red_light_flashes_6")["fault_type_v2"] == "installation_issue"  # type: ignore[index]
    assert get_error_log_rule("red_light_flashes_7")["fault_type_v2"] == "manual_error"  # type: ignore[index]
    assert get_error_log_rule("red_light_flashes_8")["fault_type_v2"] == "charger_issue"  # type: ignore[index]
    assert get_error_log_rule("red_light_flashes_9")["fault_type_v2"] == "charger_issue"  # type: ignore[index]
