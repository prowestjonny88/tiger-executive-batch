from __future__ import annotations

import re
from typing import Any, cast

from app.core.models import (
    CompetitionOutput,
    IncidentInput,
    ObservationResultV2,
    Theme2PerceptionAssessment,
    Theme2VisualExtraction,
)
from app.services.theme2_rules import get_error_log_rule, get_theme2_rule, load_theme2_rules, rule_fault_type, rule_recipient

SAFETY_ESCALATION_TERMS = [
    "burnt",
    "smoke",
    "melted",
    "sparking",
    "exposed conductor",
    "burning smell",
    "hot to touch",
    "water ingress",
]

REPEATED_MCB_TRIP_TERMS = [
    "repeatedly trips",
    "trips again",
    "cannot reset",
    "reset failed",
    "burnt",
    "hot",
    "smoke",
]

NO_LIGHT_NORMAL_BREAKER_TERMS = [
    "evdb breaker normal",
    "breaker normal",
    "mcb normal",
    "breaker is on",
    "breaker checked normal",
    "evdb_breaker_checked normal",
]

NO_LIGHT_STILL_OFF_TERMS = [
    "charger still off",
    "still no light",
    "still no power",
    "charger_still_off yes",
]


def _combined_text(incident: IncidentInput, perception: Theme2PerceptionAssessment) -> str:
    parts = [
        incident.photo_hint or "",
        incident.symptom_text or "",
        incident.error_code or "",
        perception.scene_summary,
        " ".join(perception.ocr_findings),
        " ".join(perception.extraction.raw_visible_text),
        " ".join(f"{key} {value}" for key, value in incident.follow_up_answers.items()),
    ]
    return " ".join(part for part in parts if part).lower()


def detect_error_log_key(incident: IncidentInput, perception: Theme2PerceptionAssessment) -> str | None:
    text = _combined_text(incident, perception)
    flash_match = re.search(r"(?:red\s*)?(?:flash(?:es|ing)?|blink(?:s|ing)?)\D{0,12}([6-9])\b", text)
    if not flash_match:
        flash_match = re.search(r"\b([6-9])\D{0,12}(?:red\s*)?(?:flash(?:es|ing)?|blink(?:s|ing)?)", text)
    if flash_match:
        return f"red_light_flashes_{flash_match.group(1)}"
    if "ground fault" in text:
        return "red_light_flashes_6"
    if "emergency stop" in text or "e-stop" in text:
        return "red_light_flashes_7"
    if "short circuit" in text:
        return "red_light_flashes_8"
    if "over-temperature" in text or "over temperature" in text or "overheat" in text:
        return "red_light_flashes_9"
    return None


def _rating_contains(value: str | None, *tokens: str) -> bool:
    normalized = re.sub(r"\s+", "", (value or "").lower())
    return all(token.lower().replace(" ", "") in normalized for token in tokens)


def _maybe_refine_observation(theme2: Theme2VisualExtraction) -> ObservationResultV2:
    observation = theme2.observation_result
    if theme2.input_component == "evdb":
        if theme2.mcb_visible is False or theme2.rccb_visible is False:
            return "missing_mcb_rccb"
        if theme2.rccb_type == "type_ac":
            return "wrong_component_specs"
        if theme2.evdb_phase_type == "single_phase":
            if (theme2.mcb_rating and not _rating_contains(theme2.mcb_rating, "40a", "2p")) or (
                theme2.rccb_rating and not _rating_contains(theme2.rccb_rating, "40a", "2p")
            ):
                return "wrong_component_specs"
        if theme2.evdb_phase_type == "three_phase":
            if (theme2.mcb_rating and not _rating_contains(theme2.mcb_rating, "40a", "4p")) or (
                theme2.rccb_rating and not _rating_contains(theme2.rccb_rating, "40a", "4p")
            ):
                return "wrong_component_specs"
    return observation


def _evidence_notes(
    perception: Theme2PerceptionAssessment,
    observation: ObservationResultV2,
    error_log_key: str | None,
) -> list[str]:
    extraction = perception.extraction
    notes: list[str] = []
    notes.extend(extraction.uncertainty_notes)
    notes.extend(perception.uncertainty_notes[:2])
    if observation == "charger_serial_brand_visible":
        if extraction.charger_serial_number is None:
            notes.append("Charger serial number was not readable.")
        if extraction.charger_brand_model is None:
            notes.append("Charger brand/model was not readable.")
    if observation in {"evdb_single_phase", "evdb_three_phase"}:
        if not extraction.mcb_rating or not extraction.rccb_rating:
            notes.append("EVDB MCB/RCCB labels were not fully readable.")
        if extraction.rccb_type == "unknown":
            notes.append("RCCB type was not readable.")
    if perception.confidence_score < 0.55 or extraction.confidence_score < 0.55:
        notes.append("Theme 2 extraction confidence is low; request clearer proof.")
    if error_log_key:
        notes.append(f"Blinking red light refined by {error_log_key}.")
    return list(dict.fromkeys(note for note in notes if note))


def _rule_metadata(observation: ObservationResultV2, error_log_key: str | None) -> tuple[dict[str, Any], str, str, str | None]:
    payload = load_theme2_rules()
    rule_version = str(payload.get("version") or "unknown")
    if error_log_key:
        error_rule = get_error_log_rule(error_log_key)
        if error_rule is not None:
            return error_rule, rule_version, error_log_key, error_log_key
    return get_theme2_rule(observation), rule_version, observation, None


def _after_sales_team_id() -> str:
    value = load_theme2_rules().get("after_sales_team_id")
    return str(value or "AS_TEAM_01")


def _override_rule(
    incident: IncidentInput,
    perception: Theme2PerceptionAssessment,
    observation: ObservationResultV2,
    rule: dict[str, Any],
) -> tuple[dict[str, Any], str | None]:
    text = _combined_text(incident, perception)
    team_id = _after_sales_team_id()

    if any(term in text for term in SAFETY_ESCALATION_TERMS):
        return (
            {
                **rule,
                "fault_type_v2": "protection_issue",
                "recipient_type": "after_sales_team",
                "assigned_team_id": team_id,
                "action_message": "Stop using the charger and contact after-sales team.",
                "required_proof_next": "Clear photo of the visible safety issue before further use.",
            },
            "safety_escalation",
        )

    if observation == "mcb_tripped" and any(term in text for term in REPEATED_MCB_TRIP_TERMS):
        return (
            {
                **rule,
                "fault_type_v2": "protection_issue",
                "recipient_type": "after_sales_team",
                "assigned_team_id": team_id,
                "action_message": "Stop resetting the breaker and contact after-sales team for repeated tripping review.",
                "required_proof_next": "Photo of the breaker state and any visible damage.",
            },
            "repeated_mcb_trip_escalation",
        )

    breaker_checked_normal = any(term in text for term in NO_LIGHT_NORMAL_BREAKER_TERMS)
    charger_still_off = any(term in text for term in NO_LIGHT_STILL_OFF_TERMS)
    if observation == "charger_no_light" and breaker_checked_normal and charger_still_off:
        return (
            {
                **rule,
                "fault_type_v2": "charger_issue",
                "recipient_type": "after_sales_team",
                "assigned_team_id": team_id,
                "action_message": "EVDB breaker appears normal but the charger is still off. Contact after-sales team.",
                "required_proof_next": "Photo of EVDB breaker state and charger indicator after breaker check.",
            },
            "no_light_unresolved_escalation",
        )

    return rule, None


def build_competition_output(
    incident: IncidentInput,
    perception: Theme2PerceptionAssessment,
) -> tuple[CompetitionOutput, dict[str, str | None]]:
    extraction = perception.extraction
    observation = _maybe_refine_observation(extraction)
    error_log_key = detect_error_log_key(incident, perception) if observation == "charger_blinking_red_light" else None
    rule, rule_version, rule_key, applied_error_log_key = _rule_metadata(observation, error_log_key)
    rule, override_key = _override_rule(incident, perception, observation, rule)
    confidence_score = round(max(min(min(perception.confidence_score, extraction.confidence_score or perception.confidence_score), 1.0), 0.0), 4)
    required_proof_next = rule.get("required_proof_next")
    if confidence_score < 0.55 and not required_proof_next:
        required_proof_next = "Retake a clear photo of the relevant charger, EVDB, or isolator evidence."

    output = CompetitionOutput(
        input_component=extraction.input_component,
        observation_result=cast(ObservationResultV2, observation),
        charger_serial_number=extraction.charger_serial_number,
        charger_brand_model=extraction.charger_brand_model,
        fault_type_v2=rule_fault_type(rule),
        recipient_type=rule_recipient(rule),
        assigned_team_id=str(rule["assigned_team_id"]) if rule.get("assigned_team_id") is not None else None,
        action_message=str(rule.get("action_message") or "Review the Theme 2 evidence and collect clearer proof."),
        required_proof_next=str(required_proof_next) if required_proof_next else None,
        confidence_score=confidence_score,
        evidence_notes=_evidence_notes(perception, observation, applied_error_log_key),
        source="theme2_rule_mapper" if observation != "unknown" else "fallback",
    )
    return output, {
        "rule_version": rule_version,
        "rule_key": rule_key,
        "error_log_key": applied_error_log_key,
        "override_key": override_key,
    }
