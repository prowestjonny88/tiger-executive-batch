from __future__ import annotations

import json
import logging
import time
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.staticfiles import StaticFiles

from app.core.data import load_demo_scenarios, load_sites
from app.core.models import IncidentInput, UploadedPhotoPayload
from app.db.persistence import init_db, save_audit, save_incident, update_incident
from app.services.intake import assess_image_quality, build_follow_up_questions, get_upload_root, store_uploaded_photo
from app.services.history import get_incident_history_by_id, list_incident_history
from app.services.triage import run_triage_with_debug

app = FastAPI(title="OmniTriage API", version="0.1.0")
app.mount("/uploads", StaticFiles(directory=get_upload_root(), check_dir=False), name="uploads")
request_logger = logging.getLogger("omnitriage.request")


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


@app.middleware("http")
async def log_requests(request: Request, call_next):
    request_id = request.headers.get("x-request-id") or uuid.uuid4().hex
    started_at = time.perf_counter()
    try:
        response = await call_next(request)
    except Exception:
        duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
        request_logger.exception(
            json.dumps(
                {
                    "event": "request_failed",
                    "request_id": request_id,
                    "method": request.method,
                    "path": request.url.path,
                    "client": request.client.host if request.client else None,
                    "duration_ms": duration_ms,
                }
            )
        )
        raise

    duration_ms = round((time.perf_counter() - started_at) * 1000, 2)
    response.headers["X-Request-ID"] = request_id
    request_logger.info(
        json.dumps(
            {
                "event": "request_completed",
                "request_id": request_id,
                "method": request.method,
                "path": request.url.path,
                "status_code": response.status_code,
                "client": request.client.host if request.client else None,
                "duration_ms": duration_ms,
            }
        )
    )
    return response


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
    return list_incident_history()


@app.get("/api/v1/incidents/{incident_id}")
def get_incident(incident_id: int):
    incident = get_incident_history_by_id(incident_id)
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
    incident.incident_id = incident_id
    result, debug = run_triage_with_debug(incident)
    diagnosis_debug = {
        **debug["diagnosis_debug"],
        "incident_id": incident_id,
    }
    save_audit(
        "triage_perception_attempt",
        {
            "incident_id": incident_id,
            "provider_attempted": result.perception.provider_attempted,
            "fallback_used": result.perception.fallback_used,
            "error_type": result.perception.error_type,
            "error_message": result.perception.error_message,
            "mode": result.perception.mode,
            "confidence_score": result.perception.confidence_score,
        },
        incident_id,
    )
    save_audit("triage_gemini_attempt", diagnosis_debug, incident_id)
    save_audit("triage_result", result.model_dump(), incident_id)
    return {"incident_id": incident_id, **result.model_dump()}
