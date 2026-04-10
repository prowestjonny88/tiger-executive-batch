from __future__ import annotations

from app.core.models import (
    BasicConditionsAssessment,
    ConfidenceAssessment,
    DiagnosisResult,
    IncidentInput,
    IssueType,
    SiteCapabilityProfile,
    WorkflowDecision,
)


BRANCH_ACTIONS: dict[IssueType, list[str]] = {
    "no_power": [
        "Check DB / MCB state.",
        "Check incoming voltage.",
        "Resolve the supply issue if found, otherwise escalate.",
    ],
    "tripping_mcb_rccb": [
        "Check MCB or RCCB rating.",
        "Inspect for overheating or loose cable connections.",
        "Reduce current setting or replace the protective device if required.",
    ],
    "charging_slow": [
        "Check current output setting.",
        "Check for vehicle-side charging limitations.",
        "Check voltage drop and advise the customer accordingly.",
    ],
    "not_responding": [
        "Perform a controlled power cycle.",
        "Inspect the PCB and display/control path.",
        "Reset the system or escalate if the unit remains unresponsive.",
    ],
}


def _has_unknown_basic_checks(basic_conditions: BasicConditionsAssessment) -> bool:
    return any(
        status == "unknown"
        for status in [
            basic_conditions.main_power_supply,
            basic_conditions.cable_condition,
            basic_conditions.indicator_or_error_code,
        ]
    )


def route_incident(
    incident: IncidentInput,
    diagnosis: DiagnosisResult,
    confidence: ConfidenceAssessment,
    site: SiteCapabilityProfile,
) -> WorkflowDecision:
    branch_actions = BRANCH_ACTIONS[diagnosis.issue_type]
    basic_conditions = diagnosis.basic_conditions

    if confidence.safety_override:
        return WorkflowDecision(
            issue_type=diagnosis.issue_type,
            branch_actions=branch_actions,
            outcome="escalate",
            rationale="Visible hazard evidence requires escalation instead of branch-level troubleshooting.",
            next_action="Escalate the case and isolate the charger from further use.",
            fallback_action="Keep the unit unavailable until a qualified inspection is completed.",
        )

    if confidence.band.value == "low" or _has_unknown_basic_checks(basic_conditions):
        return WorkflowDecision(
            issue_type=diagnosis.issue_type,
            branch_actions=branch_actions,
            outcome="escalate",
            rationale="One or more organizer basic checks remain uncertain, so the case cannot be closed safely.",
            next_action="Escalate for supervised follow-up and confirm the unresolved basic checks.",
            fallback_action="If new evidence clarifies the checks, rerun the organizer branch with updated observations.",
        )

    if diagnosis.issue_type == "no_power":
        if basic_conditions.cable_condition == "problem":
            return WorkflowDecision(
                issue_type=diagnosis.issue_type,
                branch_actions=branch_actions,
                outcome="escalate",
                rationale="No-power cases with cable-condition problems require escalation instead of supply-only recovery.",
                next_action="Escalate after documenting cable-condition findings.",
                fallback_action="Do not continue power restoration attempts until the cable path is inspected.",
            )
        return WorkflowDecision(
            issue_type=diagnosis.issue_type,
            branch_actions=branch_actions,
            outcome="resolved",
            rationale="The organizer tree points to a supply-side check sequence that can be closed after verification and reporting.",
            next_action="Perform the no-power supply checks in order and close the case if power is restored.",
            fallback_action="Escalate if supply checks do not restore the charger.",
        )

    if diagnosis.issue_type == "tripping_mcb_rccb":
        if basic_conditions.cable_condition == "problem":
            return WorkflowDecision(
                issue_type=diagnosis.issue_type,
                branch_actions=branch_actions,
                outcome="escalate",
                rationale="Tripping combined with cable-condition problems suggests an unsafe branch failure and should be escalated.",
                next_action="Escalate after documenting overheating or loose-cable evidence.",
                fallback_action="Keep the charger isolated until the cause is inspected.",
            )
        return WorkflowDecision(
            issue_type=diagnosis.issue_type,
            branch_actions=branch_actions,
            outcome="resolved",
            rationale="The organizer tree supports a breaker-rating and connection check workflow before escalation.",
            next_action="Perform the tripping SOP checks and close the case if the breaker issue is corrected.",
            fallback_action="Escalate if the breaker continues to trip after the SOP.",
        )

    if diagnosis.issue_type == "charging_slow":
        return WorkflowDecision(
            issue_type=diagnosis.issue_type,
            branch_actions=branch_actions,
            outcome="resolved",
            rationale="Charging-slow cases are handled through settings, vehicle-limitation, and voltage-drop checks before escalation.",
            next_action="Perform the charging-slow checks and report the limiting factor found.",
            fallback_action="Escalate if charging output remains abnormally low after the checks.",
        )

    if basic_conditions.main_power_supply == "problem":
        return WorkflowDecision(
            issue_type=diagnosis.issue_type,
            branch_actions=branch_actions,
            outcome="escalate",
            rationale="A non-responding charger without stable power cannot be safely closed through reset steps alone.",
            next_action="Escalate and confirm supply integrity before further reset attempts.",
            fallback_action="Re-run the not-responding branch only after power is stable.",
        )

    return WorkflowDecision(
        issue_type=diagnosis.issue_type,
        branch_actions=branch_actions,
        outcome="resolved",
        rationale="The organizer tree supports a controlled reset-and-inspect sequence for non-responding chargers with stable power.",
        next_action="Perform the reset sequence and close the case if the charger responds normally again.",
        fallback_action="Escalate if the charger remains unresponsive after the reset and inspection steps.",
    )
