from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any
from urllib.parse import quote

from app.core.models import (
    ChargerContext,
    CustomerProfile,
    TicketFeedbackRequest,
    TicketEvidenceRequest,
    TicketFromTriageRequest,
    TicketPriority,
    TicketScheduleRequest,
    TicketStatus,
    TicketStatusUpdateRequest,
)

HAZARD_TERMS = (
    "burnt",
    "smoke",
    "melted",
    "sparking",
    "exposed conductor",
    "burning smell",
    "hot to touch",
    "water ingress",
)

DEMO_TECHNICIANS = [
    {"id": "tech-001", "name": "Ahmad", "skills": ["charger", "evdb"], "area": "Kuala Lumpur"},
    {"id": "tech-002", "name": "Mei Ling", "skills": ["charger", "isolator"], "area": "Petaling Jaya"},
]


def generate_ticket_id(now: datetime | None = None, sequence: int = 1) -> str:
    stamp = (now or datetime.now(timezone.utc)).strftime("%Y%m%d")
    return f"RXT-{stamp}-{sequence:04d}"


def _competition_output(triage_result: dict[str, Any]) -> dict[str, Any]:
    output = triage_result.get("competition_output")
    if isinstance(output, dict):
        return output
    return triage_result


def _follow_up_prompts(triage_result: dict[str, Any]) -> list[dict[str, Any]]:
    prompts = triage_result.get("follow_up_prompts")
    return prompts if isinstance(prompts, list) else []


def _perception(triage_result: dict[str, Any]) -> dict[str, Any]:
    perception = triage_result.get("perception")
    return perception if isinstance(perception, dict) else {}


def _incident(triage_result: dict[str, Any]) -> dict[str, Any]:
    incident = triage_result.get("incident")
    return incident if isinstance(incident, dict) else {}


def _contains_hazard_text(*values: object) -> bool:
    text = " ".join(str(value).lower() for value in values if value)
    return any(term in text for term in HAZARD_TERMS)


def derive_priority_from_triage(
    triage_result: dict[str, Any],
    charger_context: ChargerContext | dict[str, Any] | None = None,
    customer_comments: str | None = None,
) -> TicketPriority:
    output = _competition_output(triage_result)
    perception = _perception(triage_result)
    context = charger_context.model_dump() if isinstance(charger_context, ChargerContext) else charger_context or {}
    observation = output.get("observation_result")
    fault_type = output.get("fault_type_v2")
    recipient = output.get("recipient_type")
    notes = output.get("evidence_notes", [])
    hazards = perception.get("hazard_signals", [])

    if _contains_hazard_text(notes, hazards, customer_comments, context.get("symptom_text"), context.get("error_code")):
        return "Critical"
    if observation in {"missing_mcb_rccb", "wrong_component_specs"}:
        return "Critical"
    if "repeated" in str(customer_comments or context.get("symptom_text") or "").lower() and "trip" in str(
        customer_comments or context.get("symptom_text") or ""
    ).lower():
        return "Critical"
    if context.get("installed_by") == "third_party":
        return "High"
    if recipient == "after_sales_team":
        return "High"
    if fault_type in {"charger_issue", "installation_issue"}:
        return "High"
    if observation in {"mcb_tripped", "charger_no_light", "isolator_off_open_circuit"} or fault_type in {
        "power_cut",
        "supply_issue",
    }:
        return "Medium"
    return "Low"


def derive_initial_ticket_status(triage_result: dict[str, Any]) -> TicketStatus:
    output = _competition_output(triage_result)
    if output.get("required_proof_next") or _follow_up_prompts(triage_result):
        return "waiting_customer"
    if output.get("recipient_type") == "after_sales_team":
        return "assigned"
    return "triaged"


def build_ai_summary(triage_result: dict[str, Any]) -> str:
    output = _competition_output(triage_result)
    observation = str(output.get("observation_result", "unknown")).replace("_", " ")
    fault = str(output.get("fault_type_v2", "unknown")).replace("_", " ")
    recipient = str(output.get("recipient_type", "unknown")).replace("_", " ")
    action = output.get("action_message") or "No action message available."
    return f"AI triage found {observation}. Fault type: {fault}. Route: {recipient}. {action}"


def _evidence_photos_from_triage(triage_result: dict[str, Any]) -> list[dict[str, Any]]:
    incident = _incident(triage_result)
    photos: list[dict[str, Any]] = []
    for key in ("photo_evidence", "app_screenshot_evidence"):
        evidence = incident.get(key)
        if isinstance(evidence, dict):
            photos.append({"kind": key, **evidence})
    return photos


def build_ticket_values(request: TicketFromTriageRequest) -> dict[str, Any]:
    output = _competition_output(request.triage_result)
    return {
        "incident_id": request.incident_id,
        "customer_profile": request.customer_profile.model_dump(),
        "charger_context": request.charger_context.model_dump(),
        "input_component": output.get("input_component", "unknown"),
        "observation_result": output.get("observation_result", "unknown"),
        "fault_type_v2": output.get("fault_type_v2", "unknown"),
        "recipient_type": output.get("recipient_type", "unknown"),
        "assigned_team_id": output.get("assigned_team_id"),
        "priority": derive_priority_from_triage(
            request.triage_result,
            request.charger_context,
            request.customer_comments,
        ),
        "status": derive_initial_ticket_status(request.triage_result),
        "ai_summary": build_ai_summary(request.triage_result),
        "customer_comments": request.customer_comments,
        "required_proof_next": output.get("required_proof_next"),
        "evidence_photos": _evidence_photos_from_triage(request.triage_result),
        "triage_result": request.triage_result,
        "schedule_status": "pending" if output.get("recipient_type") == "after_sales_team" else "not_required",
    }


def create_ticket_from_triage(request: TicketFromTriageRequest) -> dict[str, Any]:
    from app.db.persistence import create_ticket_record

    ticket = create_ticket_record(build_ticket_values(request))
    return ticket


def list_tickets(filters: dict[str, str | None]) -> list[dict[str, Any]]:
    from app.db.persistence import list_ticket_records

    return list_ticket_records(filters)


def get_ticket_by_ticket_id(ticket_id: str) -> dict[str, Any] | None:
    from app.db.persistence import get_ticket_record

    return get_ticket_record(ticket_id)


def attach_ticket_evidence(ticket_id: str, request: TicketEvidenceRequest) -> dict[str, Any] | None:
    from app.db.persistence import append_ticket_evidence_record

    filename = request.evidence.get("filename") or "uploaded evidence"
    message = request.message or f"Customer uploaded additional proof: {filename}."
    return append_ticket_evidence_record(
        ticket_id=ticket_id,
        evidence=request.evidence,
        evidence_type=request.evidence_type,
        actor_role=request.actor_role,
        actor_name=request.actor_name,
        message=message,
    )


def add_ticket_event(
    ticket_id: str,
    event_type: str,
    actor_role: str,
    message: str,
    actor_name: str | None = None,
    payload_json: dict[str, Any] | None = None,
) -> dict[str, Any]:
    from app.db.persistence import add_ticket_event_record

    return add_ticket_event_record(
        ticket_id=ticket_id,
        event_type=event_type,
        actor_role=actor_role,
        actor_name=actor_name,
        message=message,
        payload_json=payload_json or {},
    )


def update_ticket_status(ticket_id: str, request: TicketStatusUpdateRequest) -> dict[str, Any] | None:
    from app.db.persistence import update_ticket_status_record

    ticket = update_ticket_status_record(ticket_id, request.status)
    if ticket:
        add_ticket_event(
            ticket_id,
            "status_changed",
            request.actor_role,
            request.note or f"Status changed to {request.status.replace('_', ' ')}.",
            request.actor_name,
            {"status": request.status},
        )
    return get_ticket_by_ticket_id(ticket_id)


def suggested_slots(priority: str, now: datetime | None = None) -> list[dict[str, str]]:
    base = now or datetime.now(timezone.utc)
    if priority == "Critical":
        offsets = [4, 8, 24]
    elif priority == "High":
        offsets = [24, 36, 48]
    elif priority == "Medium":
        offsets = [48, 72, 96]
    else:
        offsets = [96, 120, 144]
    return [
        {
            "scheduled_at": (base + timedelta(hours=offset)).isoformat(),
            "scheduled_window": "2:00 PM - 4:00 PM" if index % 2 else "10:00 AM - 12:00 PM",
        }
        for index, offset in enumerate(offsets)
    ]


def schedule_ticket_visit(ticket_id: str, request: TicketScheduleRequest) -> dict[str, Any] | None:
    from app.db.persistence import schedule_ticket_record

    existing_ticket = get_ticket_by_ticket_id(ticket_id)
    if not existing_ticket:
        return None
    if existing_ticket.get("status") in {"resolved", "closed", "cancelled"}:
        return existing_ticket

    ticket = schedule_ticket_record(
        ticket_id=ticket_id,
        scheduled_at=request.scheduled_at,
        scheduled_window=request.scheduled_window,
        assigned_technician=request.assigned_technician,
    )
    if ticket:
        add_ticket_event(
            ticket_id,
            "visit_scheduled",
            "staff",
            f"Visit scheduled for {request.scheduled_window} with {request.assigned_technician}.",
            request.actor_name,
            {
                "scheduled_at": request.scheduled_at,
                "scheduled_window": request.scheduled_window,
                "assigned_technician": request.assigned_technician,
            },
        )
    return get_ticket_by_ticket_id(ticket_id)


def submit_ticket_feedback(ticket_id: str, request: TicketFeedbackRequest) -> dict[str, Any] | None:
    from app.db.persistence import save_ticket_feedback_record, update_ticket_priority_record, update_ticket_status_record

    feedback = save_ticket_feedback_record(ticket_id, request.model_dump())
    if not feedback:
        return None

    add_ticket_event(
        ticket_id,
        "feedback_submitted",
        "customer",
        "Customer submitted ticket feedback.",
        None,
        request.model_dump(),
    )

    if request.issue_resolved == "yes" and request.support_rating >= 3:
        update_ticket_status_record(ticket_id, "closed")
        add_ticket_event(ticket_id, "ticket_closed", "system", "Ticket closed after positive customer feedback.")
    else:
        update_ticket_status_record(ticket_id, "reopened")
        update_ticket_priority_record(ticket_id, "High")
        add_ticket_event(
            ticket_id,
            "negative_feedback_reopen",
            "system",
            "Ticket reopened because feedback requires review.",
            None,
            {"priority": "High"},
        )
    return get_ticket_by_ticket_id(ticket_id)


def generate_whatsapp_preview(ticket: dict[str, Any]) -> dict[str, Any]:
    profile = ticket.get("customer_profile") or {}
    phone = str(profile.get("whatsapp_number") or profile.get("phone_number") or "").replace("+", "").replace(" ", "")
    message = (
        f"Hi {profile.get('full_name', 'there')}, your ChargerDoc ticket {ticket.get('ticket_id')} is "
        f"{str(ticket.get('status', 'triaged')).replace('_', ' ')}. "
        f"Detected issue: {str(ticket.get('observation_result', 'unknown')).replace('_', ' ')}. "
        f"Next step: {ticket.get('required_proof_next') or ticket.get('ai_summary') or 'Please check your ticket page.'}"
    )
    return {
        "label": "Demo simulation only. No automated WhatsApp message is sent.",
        "message": message,
        "wa_url": f"https://wa.me/{phone}?text={quote(message)}" if phone else None,
    }
