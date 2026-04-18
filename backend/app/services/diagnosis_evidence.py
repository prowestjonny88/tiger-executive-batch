from __future__ import annotations

from app.core.models import IncidentInput, PerceptionResult, StructuredEvidence
from app.services.diagnosis_fallback import build_incident_text


def build_structured_evidence(incident: IncidentInput, perception: PerceptionResult) -> StructuredEvidence:
    user_symptoms = [
        item
        for item in [incident.symptom_text, incident.photo_hint]
        if item and item.strip()
    ]
    summary_parts = [
        perception.scene_summary,
        build_incident_text(incident),
        "Components: " + ", ".join(perception.components_visible) if perception.components_visible else "",
        "Abnormalities: " + ", ".join(perception.visible_abnormalities) if perception.visible_abnormalities else "",
        "OCR: " + ", ".join(perception.ocr_findings) if perception.ocr_findings else "",
    ]
    missing_evidence: list[str] = []

    if incident.photo_evidence is None:
        missing_evidence.append("clear_photo_of_asset")
    if perception.evidence_type in {"hardware_photo", "mixed_photo"} and not perception.components_visible:
        missing_evidence.append("component_identification")
    if perception.evidence_type == "screenshot" and not perception.ocr_findings:
        missing_evidence.append("error_text_capture")
    if not incident.follow_up_answers.get("power_context"):
        missing_evidence.append("upstream_power_context")

    return StructuredEvidence(
        evidence_type=perception.evidence_type,
        semantic_summary=" | ".join(part for part in summary_parts if part),
        components_visible=perception.components_visible,
        visible_abnormalities=perception.visible_abnormalities,
        ocr_findings=perception.ocr_findings,
        hazard_signals=perception.hazard_signals,
        user_symptoms=user_symptoms,
        user_error_code=incident.error_code,
        follow_up_context=incident.follow_up_answers,
        missing_evidence=missing_evidence,
        incomplete=perception.mode == "text_only" or bool(missing_evidence) or perception.requires_follow_up,
    )
