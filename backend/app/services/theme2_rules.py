from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.core.models import FaultTypeV2, ObservationResultV2, RecipientType

RULES_PATH = Path(__file__).resolve().parents[3] / "data" / "round2" / "theme2_rules.json"

REQUIRED_OBSERVATIONS: set[str] = {
    "charger_red_light",
    "charger_blinking_red_light",
    "charger_no_light",
    "charger_serial_brand_visible",
    "evdb_single_phase",
    "evdb_three_phase",
    "mcb_tripped",
    "missing_mcb_rccb",
    "wrong_component_specs",
    "isolator_on",
    "isolator_off_open_circuit",
    "unknown",
}


def _validate_rule(name: str, rule: dict[str, Any]) -> dict[str, Any]:
    required_keys = {"fault_type_v2", "recipient_type", "action_message"}
    missing = sorted(required_keys - set(rule))
    if missing:
        raise ValueError(f"Theme 2 rule {name} missing required keys: {', '.join(missing)}")
    return rule


@lru_cache(maxsize=1)
def load_theme2_rules() -> dict[str, Any]:
    payload = json.loads(RULES_PATH.read_text(encoding="utf-8"))
    rules = payload.get("rules")
    if not isinstance(rules, dict):
        raise ValueError("Theme 2 rules file must contain a rules object")

    missing_observations = sorted(REQUIRED_OBSERVATIONS - set(rules))
    if missing_observations:
        raise ValueError(f"Theme 2 rules file missing observations: {', '.join(missing_observations)}")

    for name, rule in rules.items():
        if not isinstance(rule, dict):
            raise ValueError(f"Theme 2 rule {name} must be an object")
        _validate_rule(name, rule)

    error_log_rules = payload.get("error_log_rules", {})
    if not isinstance(error_log_rules, dict):
        raise ValueError("Theme 2 error_log_rules must be an object")
    for name, rule in error_log_rules.items():
        if not isinstance(rule, dict):
            raise ValueError(f"Theme 2 error log rule {name} must be an object")
        _validate_rule(name, rule)

    return payload


def get_theme2_rule(observation: ObservationResultV2) -> dict[str, Any]:
    rules = load_theme2_rules()["rules"]
    rule = rules.get(observation) or rules["unknown"]
    return dict(rule)


def get_error_log_rule(error_key: str | None) -> dict[str, Any] | None:
    if not error_key:
        return None
    rule = load_theme2_rules().get("error_log_rules", {}).get(error_key)
    return dict(rule) if isinstance(rule, dict) else None


def get_after_sales_team_id() -> str:
    value = load_theme2_rules().get("after_sales_team_id")
    return str(value or "AS_TEAM_01")


def rule_fault_type(rule: dict[str, Any]) -> FaultTypeV2:
    value = str(rule.get("fault_type_v2") or "unknown")
    if value in {
        "protection_issue",
        "charger_issue",
        "supply_issue",
        "installation_issue",
        "manual_error",
        "power_cut",
        "identification_only",
        "unknown",
    }:
        return value  # type: ignore[return-value]
    return "unknown"


def rule_recipient(rule: dict[str, Any]) -> RecipientType:
    value = str(rule.get("recipient_type") or "unknown")
    if value in {"customer", "after_sales_team", "none", "unknown"}:
        return value  # type: ignore[return-value]
    return "unknown"
