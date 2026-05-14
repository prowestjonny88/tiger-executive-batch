from __future__ import annotations

import re
from typing import cast

from app.core.models import (
    CompetitionOutput,
    DiagnosisResult,
    InputComponent,
    IncidentInput,
    ObservationResultV2,
    PerceptionResult,
    Theme2VisualExtraction,
)
from app.services.theme2_rules import get_error_log_rule, get_theme2_rule, rule_fault_type, rule_recipient


def _combined_text(incident: IncidentInput, perception: PerceptionResult) -> str:
    parts = [
        incident.photo_hint or "",
        incident.symptom_text or "",
        incident.error_code or "",
        perception.scene_summary,
        " ".join(perception.ocr_findings),
        " ".join(f"{key} {value}" for key, value in incident.follow_up_answers.items()),
    ]
    if perception.theme2 is not None:
        parts.extend(perception.theme2.raw_visible_text)
    return " ".join(part for part in parts if part).lower()


def _detect_error_log_key(incident: IncidentInput, perception: PerceptionResult) -> str | None:
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


def _fallback_observation(diagnosis: DiagnosisResult) -> ObservationResultV2:
    if diagnosis.issue_family == "tripping":
        return "mcb_tripped"
    if diagnosis.issue_family == "no_power":
        return "charger_no_light"
    return "unknown"


def _evidence_notes(
    theme2: Theme2VisualExtraction | None,
    perception: PerceptionResult,
    diagnosis: DiagnosisResult,
    error_log_key: str | None,
) -> list[str]:
    notes: list[str] = []
    if theme2 is None:
        notes.append("Theme 2 extraction unavailable; mapped from existing diagnosis fallback.")
    else:
        notes.extend(theme2.uncertainty_notes)
        if theme2.charger_serial_number is None and theme2.observation_result == "charger_serial_brand_visible":
            notes.append("Charger serial number was not readable.")
        if theme2.charger_brand_model is None and theme2.observation_result == "charger_serial_brand_visible":
            notes.append("Charger brand/model was not readable.")
        if theme2.confidence_score < 0.55:
            notes.append("Theme 2 extraction confidence is low; request clearer proof.")
    if perception.uncertainty_notes:
        notes.extend(perception.uncertainty_notes[:2])
    if diagnosis.reasoning_notes:
        notes.append(diagnosis.reasoning_notes[0])
    if error_log_key:
        notes.append(f"Blinking red light refined by {error_log_key}.")
    return list(dict.fromkeys(note for note in notes if note))


def _confidence(theme2: Theme2VisualExtraction | None, diagnosis: DiagnosisResult) -> float:
    if theme2 is None:
        return round(max(min(diagnosis.confidence_score, 0.35), 0.0), 4)
    theme_score = theme2.confidence_score if theme2.confidence_score > 0 else 0.35
    return round(max(min(min(theme_score, diagnosis.confidence_score), 1.0), 0.0), 4)


def build_competition_output(
    incident: IncidentInput,
    perception: PerceptionResult,
    diagnosis: DiagnosisResult,
) -> CompetitionOutput:
    theme2 = perception.theme2
    source = "theme2_rule_mapper"
    if theme2 is None:
        observation = _fallback_observation(diagnosis)
        input_component = "unknown"
        serial_number = None
        brand_model = None
        source = "fallback"
    else:
        observation = _maybe_refine_observation(theme2)
        input_component = theme2.input_component
        serial_number = theme2.charger_serial_number
        brand_model = theme2.charger_brand_model

    error_log_key = _detect_error_log_key(incident, perception) if observation == "charger_blinking_red_light" else None
    rule = get_error_log_rule(error_log_key) or get_theme2_rule(observation)
    confidence_score = _confidence(theme2, diagnosis)
    required_proof_next = rule.get("required_proof_next") or diagnosis.required_proof_next
    if confidence_score < 0.55 and not required_proof_next:
        required_proof_next = "Retake a clear photo of the relevant charger, EVDB, or isolator evidence."

    return CompetitionOutput(
        input_component=cast(InputComponent, input_component),
        observation_result=observation,
        charger_serial_number=serial_number,
        charger_brand_model=brand_model,
        fault_type_v2=rule_fault_type(rule),
        recipient_type=rule_recipient(rule),
        assigned_team_id=str(rule["assigned_team_id"]) if rule.get("assigned_team_id") is not None else None,
        action_message=str(rule.get("action_message") or "Review the Theme 2 evidence and collect clearer proof."),
        required_proof_next=str(required_proof_next) if required_proof_next else None,
        confidence_score=confidence_score,
        evidence_notes=_evidence_notes(theme2, perception, diagnosis, error_log_key),
        source=source,  # type: ignore[arg-type]
    )
