from __future__ import annotations

from typing import Any

from app.core.models import IncidentInput, Theme2DebugInfo, Theme2FollowUpPrompt, Theme2PerceptionAssessment, Theme2TriageResult
from app.services.theme2_mapper import build_competition_output, detect_error_log_key
from app.services.theme2_perception import assess_theme2_perception


def build_theme2_followups(
    incident: IncidentInput,
    perception: Theme2PerceptionAssessment,
) -> list[Theme2FollowUpPrompt]:
    answered = set(incident.follow_up_answers.keys())
    extraction = perception.extraction
    prompts: list[Theme2FollowUpPrompt] = []

    def add(question_id: str, prompt: str, reason: str) -> None:
        if question_id not in answered and all(item.question_id != question_id for item in prompts):
            prompts.append(Theme2FollowUpPrompt(question_id=question_id, prompt=prompt, reason=reason))

    if incident.photo_evidence is None or perception.mode == "text_only":
        add(
            "photo_request",
            "Please upload a clear photo of the charger indicator, EVDB breakers, or isolator switch involved.",
            "Theme 2 visual evidence is required for a reliable observation result.",
        )
    if extraction.observation_result == "unknown" or perception.confidence_score < 0.55 or extraction.confidence_score < 0.55:
        add(
            "clear_theme2_photo",
            "Retake a clear, well-lit photo showing the relevant charger, EVDB, or isolator evidence.",
            "The current evidence could not confirm an organizer Theme 2 observation with enough confidence.",
        )
    if extraction.observation_result == "charger_blinking_red_light" and detect_error_log_key(incident, perception) is None:
        add(
            "red_light_flash_count",
            "Provide the red-light flash count or an app error log screenshot.",
            "Blinking red light fault type depends on the error-log or flash-count evidence.",
        )
    if extraction.observation_result in {"evdb_single_phase", "evdb_three_phase"} and (
        not extraction.mcb_rating or not extraction.rccb_rating or extraction.rccb_type == "unknown"
    ):
        add(
            "evdb_label_closeup",
            "Please upload a closer EVDB photo showing the MCB/RCCB ratings, RCCB type, and pole count.",
            "EVDB phase detection alone does not prove breaker specification correctness.",
        )
    if extraction.input_component == "evdb" and extraction.observation_result in {"evdb_single_phase", "evdb_three_phase"}:
        add(
            "evdb_label_closeup",
            "Please upload a closer EVDB photo showing the MCB/RCCB ratings, RCCB type, and pole count.",
            "EVDB phase evidence requires readable labels before final spec confirmation.",
        )
    if extraction.input_component == "isolator" and extraction.observation_result == "unknown":
        add(
            "isolator_switch_state",
            "Please upload a clearer photo of the isolator switch position so we can confirm whether it is ON or OFF.",
            "The isolator is visible, but the switch state could not be confirmed.",
        )
    if extraction.observation_result == "charger_serial_brand_visible" and (
        not extraction.charger_serial_number or not extraction.charger_brand_model
    ):
        add(
            "charger_identity_closeup",
            "Please upload a close-up photo of the charger serial number and brand/model label.",
            "The charger identity label is visible, but the exact serial number or brand/model could not be read reliably.",
        )

    return prompts[:4]


def run_theme2_triage_with_debug(incident: IncidentInput) -> tuple[Theme2TriageResult, dict[str, Any]]:
    perception = assess_theme2_perception(incident)
    output, rule_metadata = build_competition_output(incident, perception)
    followups = build_theme2_followups(incident, perception)
    debug = Theme2DebugInfo(
        perception_mode=perception.mode,
        provider_attempted=perception.provider_attempted,
        fallback_used=perception.fallback_used,
        raw_provider_output=perception.raw_provider_output,
        rule_version=rule_metadata.get("rule_version"),
        rule_key=rule_metadata.get("rule_key"),
        error_log_key=rule_metadata.get("error_log_key"),
        extra={
            "perception_error_type": perception.error_type,
            "perception_error_message": perception.error_message,
            "follow_up_count": len(followups),
            "override_key": rule_metadata.get("override_key"),
        },
    )
    result = Theme2TriageResult(
        incident=incident,
        perception=perception,
        competition_output=output,
        follow_up_prompts=followups,
        debug=debug,
    )
    return result, debug.model_dump()


def run_theme2_triage(incident: IncidentInput) -> Theme2TriageResult:
    result, _ = run_theme2_triage_with_debug(incident)
    return result
