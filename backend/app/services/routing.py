from __future__ import annotations

from app.core.models import (
    ConfidenceAssessment,
    ConfidenceBand,
    DiagnosisResult,
    IncidentInput,
    RoutingDecision,
    SeverityLevel,
    SiteCapabilityProfile,
)


def route_incident(
    incident: IncidentInput,
    diagnosis: DiagnosisResult,
    confidence: ConfidenceAssessment,
    site: SiteCapabilityProfile,
) -> RoutingDecision:
    follow_up_answers = {key: value.lower() for key, value in incident.follow_up_answers.items()}
    supports_safe_local_sop = (
        site.has_local_resolver
        and follow_up_answers.get("visible_damage") in {"no", "none", "false"}
        and follow_up_answers.get("screen_on") not in {"no", "off"}
    )

    if confidence.safety_override:
        return RoutingDecision(
            resolver_tier="technician",
            priority=SeverityLevel.CRITICAL,
            rationale="Visible hazard evidence requires immediate technician escalation.",
            next_action="Restrict charger use and dispatch a technician.",
            fallback_action="If technician dispatch is delayed, keep the charger unavailable and notify remote ops.",
        )

    if confidence.band == ConfidenceBand.LOW:
        tier = "remote_ops" if site.has_remote_ops else "technician"
        return RoutingDecision(
            resolver_tier=tier,
            priority=SeverityLevel.HIGH,
            rationale="Low-confidence cases escalate to the safest available higher tier.",
            next_action="Escalate for supervised investigation.",
            fallback_action="If remote investigation fails, dispatch a technician.",
        )

    if diagnosis.internal_issue_category == "connectivity":
        if confidence.requires_confirmation:
            if supports_safe_local_sop:
                return RoutingDecision(
                    resolver_tier="local_site_resolver",
                    priority=SeverityLevel.MODERATE,
                    rationale="Confirmation answers support a safe local SOP check by an authorized site responder.",
                    next_action="Have the local site resolver perform the approved restart and isolation checklist once.",
                    fallback_action="Escalate to remote ops if the local SOP does not restore service safely.",
                )

            return RoutingDecision(
                resolver_tier="remote_ops",
                priority=SeverityLevel.MODERATE,
                rationale="Connectivity issue is plausible, but medium confidence and missing local resolver safety margin require remote ops.",
                next_action="Run remote connectivity checks and confirm charger status.",
                fallback_action="If charger remains unreachable, dispatch a technician.",
            )

        if site.has_local_resolver:
            return RoutingDecision(
                resolver_tier="driver",
                priority=SeverityLevel.LOW,
                rationale="High-confidence low-risk connectivity issue can start with driver guidance.",
                next_action="Provide simple restart/session retry guidance.",
                fallback_action="Escalate to remote ops if the issue persists after one retry.",
            )

        return RoutingDecision(
            resolver_tier="remote_ops",
            priority=SeverityLevel.MODERATE,
            rationale="Site lacks a local resolver path, so remote ops becomes the next safe tier.",
            next_action="Verify connectivity and backend status remotely.",
            fallback_action="Dispatch technician if remote recovery fails.",
        )

    return RoutingDecision(
        resolver_tier="remote_ops",
        priority=SeverityLevel.MODERATE,
        rationale="Unclassified non-hazard case defaults to supervised remote investigation.",
        next_action="Review incident details and confirm likely failure mode.",
        fallback_action="Escalate to technician if confidence remains low.",
    )
