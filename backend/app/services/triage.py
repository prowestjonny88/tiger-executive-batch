from __future__ import annotations

from app.core.data import load_sites, load_snippets
from app.core.models import IncidentInput, TriageResult
from app.services.confidence import assess_confidence
from app.services.diagnosis import run_diagnosis
from app.services.guidance import build_artifact
from app.services.routing import route_incident


def run_triage(incident: IncidentInput) -> TriageResult:
    sites = {site.site_id: site for site in load_sites()}
    site = sites[incident.site_id]

    diagnosis = run_diagnosis(incident)
    confidence = assess_confidence(diagnosis)
    routing = route_incident(incident, diagnosis, confidence, site)
    artifact = build_artifact(routing, diagnosis, load_snippets())

    return TriageResult(
        incident=incident,
        diagnosis=diagnosis,
        confidence=confidence,
        routing=routing,
        artifact=artifact,
    )
