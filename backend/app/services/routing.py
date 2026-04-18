from __future__ import annotations

from app.core.models import ConfidenceAssessment, DiagnosisResult, IncidentInput, ResolverTier, RoutingDecision, SiteCapabilityProfile


def _base_resolver(
    issue_family: str,
    hazard_level: str,
    unknown_flag: bool,
    required_proof_next: str | None,
    evidence_type: str,
) -> ResolverTier:
    if hazard_level == "high":
        return "technician"
    if evidence_type == "screenshot":
        return "remote_ops"
    if unknown_flag or issue_family == "unknown_mixed":
        return "remote_ops"
    if issue_family == "tripping":
        return "local_site"
    if issue_family == "no_power":
        return "driver"
    return "remote_ops"


def _site_adjusted_resolver(
    proposed: ResolverTier,
    site: SiteCapabilityProfile,
    hazard_level: str,
) -> ResolverTier:
    if hazard_level == "high":
        return "technician"
    if proposed == "local_site" and not site.has_local_resolver:
        return "remote_ops" if site.has_remote_ops else "technician"
    if proposed == "remote_ops" and not site.has_remote_ops:
        return "technician" if not site.has_local_resolver else "local_site"
    return proposed


def route_incident(
    incident: IncidentInput,
    diagnosis: DiagnosisResult,
    confidence: ConfidenceAssessment,
    site: SiteCapabilityProfile,
) -> RoutingDecision:
    base_resolver = _base_resolver(
        diagnosis.issue_family,
        diagnosis.hazard_level,
        diagnosis.unknown_flag,
        diagnosis.required_proof_next,
        diagnosis.evidence_type,
    )
    resolver_tier = _site_adjusted_resolver(base_resolver, site, diagnosis.hazard_level)

    recommended_next_step = (
        diagnosis.known_case_hit.recommended_next_step
        if diagnosis.known_case_hit is not None
        else diagnosis.required_proof_next or "Collect clearer evidence and review remotely."
    )
    fallback_action = (
        "Escalate to technician review after preserving the charger state."
        if resolver_tier == "technician"
        else "Escalate to remote operations if the next action does not resolve the uncertainty."
    )

    rationale_parts = [
        f"Issue family: {diagnosis.issue_family}.",
        f"Fault type: {diagnosis.fault_type}.",
        f"Hazard level: {diagnosis.hazard_level}.",
        f"Evidence type: {diagnosis.evidence_type}.",
        f"Confidence band: {confidence.band.value if hasattr(confidence.band, 'value') else confidence.band}.",
        f"Base routing matrix selected {base_resolver}.",
    ]
    if diagnosis.known_case_hit is not None:
        rationale_parts.append(f"Accepted known case: {diagnosis.known_case_hit.canonical_file_name}.")
    if diagnosis.unknown_flag and diagnosis.hazard_level != "high":
        rationale_parts.append("Unknown mixed cases default to remote_ops when not hazardous.")
    if base_resolver != resolver_tier:
        if base_resolver == "local_site" and not site.has_local_resolver:
            rationale_parts.append("Local-site resolver unavailable, so the route was raised.")
        elif base_resolver == "remote_ops" and not site.has_remote_ops:
            rationale_parts.append("Remote ops unavailable, so the route was raised.")
    if diagnosis.required_proof_next:
        rationale_parts.append(f"Required proof next: {diagnosis.required_proof_next}")
    if diagnosis.reasoning_notes:
        rationale_parts.append(f"Diagnosis notes: {' '.join(diagnosis.reasoning_notes[:2])}")

    return RoutingDecision(
        issue_family=diagnosis.issue_family,
        fault_type=diagnosis.fault_type,
        hazard_level=diagnosis.hazard_level,
        resolver_tier=resolver_tier,
        routing_rationale=" ".join(rationale_parts),
        recommended_next_step=recommended_next_step,
        fallback_action=fallback_action,
        required_proof_next=diagnosis.required_proof_next,
        escalation_required=resolver_tier in {"remote_ops", "technician"},
    )
