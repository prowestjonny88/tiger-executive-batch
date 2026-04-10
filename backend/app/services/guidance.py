from __future__ import annotations

from app.core.models import ActionArtifact, DiagnosisResult, KnowledgeSnippet, WorkflowDecision


def _pick_relevant_snippets(
    snippets: list[KnowledgeSnippet],
    issue_type: str,
    text: str,
) -> list[KnowledgeSnippet]:
    text = text.lower()
    matches = [
        snippet
        for snippet in snippets
        if snippet.issue_type == issue_type and any(keyword.lower() in text for keyword in snippet.keywords)
    ]
    if matches:
        return matches[:2]
    return [snippet for snippet in snippets if snippet.issue_type == issue_type][:1]


def build_artifact(
    workflow: WorkflowDecision,
    diagnosis: DiagnosisResult,
    snippets: list[KnowledgeSnippet],
) -> ActionArtifact:
    relevant = _pick_relevant_snippets(
        snippets,
        workflow.issue_type,
        " ".join([diagnosis.evidence_summary, diagnosis.likely_fault, diagnosis.raw_provider_output]),
    )

    base_steps = [step for snippet in relevant for step in snippet.body]
    if not base_steps:
        base_steps = workflow.branch_actions

    titles = {
        "no_power": "No Power SOP",
        "tripping_mcb_rccb": "Tripping MCB/RCCB SOP",
        "charging_slow": "Charging Slow SOP",
        "not_responding": "Not Responding SOP",
    }

    safety_note = (
        "Escalate and keep the charger isolated if any step reveals hazard, overheating, or exposed conductors."
        if workflow.outcome == "escalate" or diagnosis.hazard_flags
        else "Stop the SOP immediately and escalate if the charger condition becomes unsafe or abnormal."
    )

    return ActionArtifact(
        issue_type=workflow.issue_type,
        title=titles[workflow.issue_type],
        summary=diagnosis.likely_fault,
        steps=base_steps,
        safety_note=safety_note,
        evidence_focus=[
            diagnosis.evidence_summary,
            f"Main power supply: {diagnosis.basic_conditions.main_power_supply}",
            f"Cable condition: {diagnosis.basic_conditions.cable_condition}",
            f"Indicator / error code: {diagnosis.basic_conditions.indicator_or_error_code}",
            *diagnosis.hazard_flags,
        ],
    )
