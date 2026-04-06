from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

from app.core.data import load_demo_scenarios, load_sites
from app.core.models import IncidentInput, UploadedPhotoPayload
from app.db.persistence import init_db, list_recent_incidents, save_audit, save_incident, update_incident
from app.services.intake import UPLOAD_ROOT, assess_image_quality, build_follow_up_questions, store_uploaded_photo
from app.services.triage import run_triage

app = FastAPI(title="OmniTriage API", version="0.1.0")
app.mount("/uploads", StaticFiles(directory=UPLOAD_ROOT, check_dir=False), name="uploads")


def _validated_site_ids() -> set[str]:
    return {site.site_id for site in load_sites()}


def _persist_incident(incident: IncidentInput) -> int:
    payload = incident.model_dump(exclude={"incident_id"})
    if incident.incident_id is not None:
        if not update_incident(incident.incident_id, payload):
            raise HTTPException(status_code=404, detail="Unknown incident_id")
        return incident.incident_id
    return save_incident(payload)


@app.on_event("startup")
def startup() -> None:
    init_db()


@app.get("/api/v1/health")
def health():
    return {"status": "ok"}


@app.get("/api/v1/sites")
def sites():
    return load_sites()


@app.get("/api/v1/demo/scenarios")
def demo_scenarios():
    return load_demo_scenarios()


@app.get("/api/v1/incidents")
def incidents():
    return list_recent_incidents()


@app.get("/api/v1/incidents/{incident_id}")
def get_incident(incident_id: int):
    from app.db.persistence import get_incident_by_id
    incident = get_incident_by_id(incident_id)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.post("/api/v1/uploads")
def upload_photo(payload: UploadedPhotoPayload):
    return store_uploaded_photo(payload)


@app.post("/api/v1/intake/preview")
def intake_preview(incident: IncidentInput):
    if incident.site_id not in _validated_site_ids():
        raise HTTPException(status_code=404, detail="Unknown site_id")

    quality = assess_image_quality(incident.photo_hint, incident.photo_evidence, incident=incident)
    follow_up_questions = build_follow_up_questions(incident, quality.quality_status)
    incident_id = _persist_incident(incident)
    save_audit(
        "intake_preview",
        {
            "quality": quality.model_dump(),
            "follow_up_questions": follow_up_questions,
        },
        incident_id,
    )
    return {
        "incident_id": incident_id,
        "quality": quality,
        "follow_up_questions": follow_up_questions,
    }


@app.post("/api/v1/triage")
def triage(incident: IncidentInput):
    if incident.site_id not in _validated_site_ids():
        raise HTTPException(status_code=404, detail="Unknown site_id")

    incident_id = _persist_incident(incident)
    result = run_triage(incident)
    save_audit("triage_result", result.model_dump(), incident_id)
    return {"incident_id": incident_id, **result.model_dump()}
