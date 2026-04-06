from __future__ import annotations

from app.core.models import ActionArtifact, DiagnosisResult, KnowledgeSnippet, RoutingDecision


def _pick_relevant_snippets(
    snippets: list[KnowledgeSnippet],
    issue_category: str,
    resolver_tier: str,
    text: str,
) -> list[KnowledgeSnippet]:
    text = text.lower()
    matches = [
        snippet
        for snippet in snippets
        if snippet.issue_category == issue_category
        and snippet.resolver_tier == resolver_tier
        and any(keyword.lower() in text for keyword in snippet.keywords)
    ]
    return matches[:2]


def build_artifact(
    routing: RoutingDecision,
    diagnosis: DiagnosisResult,
    snippets: list[KnowledgeSnippet],
) -> ActionArtifact:
    relevant = _pick_relevant_snippets(
        snippets,
        diagnosis.internal_issue_category,
        routing.resolver_tier,
        " ".join([diagnosis.evidence_summary, diagnosis.likely_fault, diagnosis.raw_provider_output]),
    )

    base_steps = [step for snippet in relevant for step in snippet.body]
    if not base_steps:
        base_steps = [routing.next_action, routing.fallback_action]

    if routing.resolver_tier in {"driver", "local_site_resolver"}:
        base_steps = base_steps[:3]

    titles = {
        "driver": "Driver Action Card",
        "local_site_resolver": "Local Site SOP Card",
        "remote_ops": "Remote Ops Action Pack",
        "technician": "Technician Dispatch Packet",
    }

    return ActionArtifact(
        resolver_tier=routing.resolver_tier,
        title=titles[routing.resolver_tier],
        summary=diagnosis.likely_fault,
        steps=base_steps,
        safety_note=(
            "Do not attempt unsanctioned repair actions."
            if routing.resolver_tier != "technician"
            else "Treat this unit as safety-sensitive until inspected."
        ),
        evidence_focus=[diagnosis.evidence_summary, *diagnosis.hazard_flags],
    )
