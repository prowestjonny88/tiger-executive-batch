from __future__ import annotations

from typing import Any

from app.core.data import load_sites, load_snippets
from app.core.models import IncidentInput, TriageResult
from app.services.confidence import assess_confidence
from app.services.diagnosis import run_diagnosis_with_debug
from app.services.guidance import build_artifact
from app.services.routing import route_incident


def run_triage(incident: IncidentInput) -> TriageResult:
    result, _ = run_triage_with_debug(incident)
    return result


def run_triage_with_debug(incident: IncidentInput) -> tuple[TriageResult, dict[str, Any]]:
    sites = {site.site_id: site for site in load_sites()}
    site = sites[incident.site_id]

    perception, evidence, kb_retrieval, diagnosis, diagnosis_debug = run_diagnosis_with_debug(incident)
    confidence = assess_confidence(diagnosis)
    routing = route_incident(incident, diagnosis, confidence, site)
    artifact = build_artifact(routing, diagnosis, load_snippets())

    result = TriageResult(
        incident=incident,
        perception=perception,
        kb_retrieval=kb_retrieval,
        diagnosis=diagnosis,
        confidence=confidence,
        routing=routing,
        artifact=artifact,
    )
    return result, {"diagnosis_debug": diagnosis_debug, "structured_evidence": evidence.model_dump()}
