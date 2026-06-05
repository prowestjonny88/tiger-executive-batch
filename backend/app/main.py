from __future__ import annotations

import json
import logging
import time
import uuid

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles

from app.core.data import load_demo_scenarios, load_sites
from app.core.models import (
    IncidentInput,
    TicketEvidenceRequest,
    TicketEventCreateRequest,
    TicketFeedbackRequest,
    TicketFromTriageRequest,
    TicketScheduleRequest,
    TicketStatusUpdateRequest,
    UploadedPhotoPayload,
)
from app.db.persistence import init_db, save_audit, save_incident, update_incident
from app.services.history import get_incident_history_by_id, list_incident_history
from app.services.intake import assess_image_quality, build_follow_up_questions, store_uploaded_photo
from app.services.storage import get_upload_root, read_evidence_object
from app.services.theme2_rules import load_theme2_rules
from app.services.theme2_triage import run_theme2_triage_with_debug
from app.services.tickets import (
    DEMO_TECHNICIANS,
    add_ticket_event,
    attach_ticket_evidence,
    create_ticket_from_triage,
    generate_whatsapp_preview,
    get_ticket_by_ticket_id,
    list_tickets,
    schedule_ticket_visit,
    submit_ticket_feedback,
    suggested_slots,
    update_ticket_status,
)

app = FastAPI(title="ChargerDoc Theme 2 API", version="0.2.0")
app.mount("/uploads", StaticFiles(directory=get_upload_root(), check_dir=False), name="uploads")
request_logger = logging.getLogger("omnitriage.request")
runtime_logger = logging.getLogger("omnitriage.runtime")


def _validated_site_ids() -> set[str]:
    return {site.site_id for site in load_sites()}


def _persist_incident(incident: IncidentInput) -> int:
    payload = incident.model_dump(exclude={"incident_id"})
    if incident.incident_id is not None:
        if not update_incident(incident.incident_id, payload):
            raise HTTPException(status_code=404, detail="Unknown incident_id")
        return incident.incident_id
    return save_incident(payload)


def _runtime_health_payload() -> dict[str, object]:
    rules = load_theme2_rules()
    return {
        "status": "ok",
        "runtime_mode": "theme2_round2_clean",
        "vlm_provider": "gemini",
        "rule_file": "data/round2/theme2_rules.json",
        "rule_version": rules.get("version"),
        "round1_runtime_enabled": False,
    }


@app.on_event("startup")
def startup() -> None:
    init_db()
    runtime_logger.info(json.dumps({"event": "runtime_startup", **_runtime_health_payload()}))


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
    return _runtime_health_payload()


@app.get("/api/v1/sites")
def sites():
    return load_sites()


@app.get("/api/v1/demo/scenarios")
def demo_scenarios():
    return load_demo_scenarios()


@app.get("/api/v1/incidents")
def incidents():
    return list_incident_history(include_legacy=False)


@app.get("/api/v1/incidents/{incident_id}")
def get_incident(incident_id: int):
    incident = get_incident_history_by_id(incident_id, include_legacy=False)
    if not incident:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.post("/api/v1/tickets/from-triage")
def create_ticket(payload: TicketFromTriageRequest):
    ticket = create_ticket_from_triage(payload)
    return {
        "ticket_id": ticket["ticket_id"],
        "status": ticket["status"],
        "priority": ticket["priority"],
        "ticket": ticket,
    }


@app.get("/api/v1/tickets")
def tickets(
    priority: str | None = None,
    status: str | None = None,
    fault_type: str | None = None,
    component: str | None = None,
    recipient_type: str | None = None,
    installation_source: str | None = None,
    assigned_technician: str | None = None,
    customer_type: str | None = None,
    customer_email: str | None = None,
    customer_phone: str | None = None,
    whatsapp_number: str | None = None,
    date_submitted: str | None = None,
):
    return {
        "tickets": list_tickets(
            {
                "priority": priority,
                "status": status,
                "fault_type": fault_type,
                "component": component,
                "recipient_type": recipient_type,
                "installation_source": installation_source,
                "assigned_technician": assigned_technician,
                "customer_type": customer_type,
                "customer_email": customer_email,
                "customer_phone": customer_phone,
                "whatsapp_number": whatsapp_number,
                "date_submitted": date_submitted,
            }
        )
    }


@app.get("/api/v1/tickets/{ticket_id}")
def get_ticket(ticket_id: str):
    ticket = get_ticket_by_ticket_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@app.patch("/api/v1/tickets/{ticket_id}/status")
def patch_ticket_status(ticket_id: str, payload: TicketStatusUpdateRequest):
    ticket = update_ticket_status(ticket_id, payload)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@app.post("/api/v1/tickets/{ticket_id}/events")
def create_ticket_event(ticket_id: str, payload: TicketEventCreateRequest):
    if not get_ticket_by_ticket_id(ticket_id):
        raise HTTPException(status_code=404, detail="Ticket not found")
    return add_ticket_event(
        ticket_id,
        payload.event_type,
        payload.actor_role,
        payload.message,
        payload.actor_name,
        payload.payload_json,
    )


@app.post("/api/v1/tickets/{ticket_id}/evidence")
def create_ticket_evidence(ticket_id: str, payload: TicketEvidenceRequest):
    ticket = attach_ticket_evidence(ticket_id, payload)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@app.post("/api/v1/tickets/{ticket_id}/schedule")
def schedule_ticket(ticket_id: str, payload: TicketScheduleRequest):
    ticket = schedule_ticket_visit(ticket_id, payload)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@app.post("/api/v1/tickets/{ticket_id}/feedback")
def create_ticket_feedback(ticket_id: str, payload: TicketFeedbackRequest):
    ticket = submit_ticket_feedback(ticket_id, payload)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket


@app.get("/api/v1/tickets/{ticket_id}/whatsapp-preview")
def ticket_whatsapp_preview(ticket_id: str):
    ticket = get_ticket_by_ticket_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return generate_whatsapp_preview(ticket)


@app.get("/api/v1/tickets/{ticket_id}/schedule-suggestions")
def ticket_schedule_suggestions(ticket_id: str):
    ticket = get_ticket_by_ticket_id(ticket_id)
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return {"technicians": DEMO_TECHNICIANS, "slots": suggested_slots(ticket["priority"])}


@app.post("/api/v1/uploads")
def upload_photo(payload: UploadedPhotoPayload):
    return store_uploaded_photo(payload)


@app.get("/api/v1/evidence/{storage_key:path}")
def evidence(storage_key: str):
    try:
        content, media_type = read_evidence_object(storage_key)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Evidence not found") from exc
    return Response(content=content, media_type=media_type)


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
    result, debug = run_theme2_triage_with_debug(incident)
    save_audit("theme2_perception", result.perception.model_dump(), incident_id)
    save_audit("theme2_mapping", {**result.competition_output.model_dump(), "debug": debug}, incident_id)
    save_audit("triage_result", result.model_dump(), incident_id)
    return {"incident_id": incident_id, **result.model_dump()}
