from __future__ import annotations

from app.core.models import ActionArtifact, DiagnosisResult, KnowledgeSnippet, ResolverTier, RoutingDecision


def _snippet_steps(snippets: list[KnowledgeSnippet], issue_family: str, resolver_tier: ResolverTier) -> list[str]:
    preferred = [item for item in snippets if item.issue_family == issue_family and item.resolver_tier in {resolver_tier, None}]
    if preferred:
        steps: list[str] = []
        for snippet in preferred[:2]:
            steps.extend(snippet.body)
        return steps[:4]
    return []


def build_artifact(routing: RoutingDecision, diagnosis: DiagnosisResult, snippets: list[KnowledgeSnippet]) -> ActionArtifact:
    steps = _snippet_steps(snippets, routing.issue_family, routing.resolver_tier)
    if not steps:
        steps = [routing.recommended_next_step]
        if routing.required_proof_next:
            steps.append(routing.required_proof_next)
        steps.append(routing.fallback_action)

    title = f"{routing.resolver_tier.replace('_', ' ').title()} Guidance"
    summary = f"{diagnosis.fault_type.replace('_', ' ')} mapped to {routing.issue_family.replace('_', ' ')}."
    safety_note = (
        "Preserve charger state and isolate the asset before further work."
        if routing.hazard_level == "high"
        else "Do not proceed beyond the recommended scope; escalate if the proof or result does not match."
    )

    evidence_focus = [
        diagnosis.evidence_summary,
        f"Hazard level: {diagnosis.hazard_level}",
        f"Resolver tier: {routing.resolver_tier}",
    ]
    if diagnosis.known_case_hit:
        evidence_focus.append(f"Known case match: {diagnosis.known_case_hit.canonical_file_name}")
    if routing.required_proof_next:
        evidence_focus.append(f"Proof required: {routing.required_proof_next}")

    return ActionArtifact(
        issue_family=routing.issue_family,
        resolver_tier=routing.resolver_tier,
        title=title,
        summary=summary,
        steps=steps,
        safety_note=safety_note,
        evidence_focus=evidence_focus,
    )

