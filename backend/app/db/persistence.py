from __future__ import annotations

import json
import os
from contextlib import contextmanager
from typing import Any, Iterator

DEFAULT_POSTGRES_URL = "postgresql://omnitriage:omnitriage@localhost:5432/omnitriage"
DATABASE_URL = os.getenv("DATABASE_URL", DEFAULT_POSTGRES_URL)

try:
    import psycopg
    from psycopg.rows import dict_row

    _PSYCOPG_AVAILABLE = True
except ImportError:  # pragma: no cover
    psycopg = None
    dict_row = None
    _PSYCOPG_AVAILABLE = False


def _require_postgres() -> None:
    if not _PSYCOPG_AVAILABLE:
        raise RuntimeError("psycopg is required for the Postgres-backed runtime")


@contextmanager
def _pg_connection() -> Iterator[Any]:
    _require_postgres()
    assert psycopg is not None
    conn = psycopg.connect(DATABASE_URL)
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db() -> None:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS incidents (
                    id BIGSERIAL PRIMARY KEY,
                    site_id TEXT NOT NULL,
                    charger_id TEXT,
                    photo_evidence_json JSONB,
                    app_screenshot_evidence_json JSONB,
                    photo_hint TEXT,
                    symptom_text TEXT,
                    error_code TEXT,
                    follow_up_answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                    demo_scenario_id TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute("ALTER TABLE incidents ADD COLUMN IF NOT EXISTS app_screenshot_evidence_json JSONB")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS triage_audits (
                    id BIGSERIAL PRIMARY KEY,
                    incident_id BIGINT REFERENCES incidents(id) ON DELETE CASCADE,
                    stage TEXT NOT NULL,
                    payload_json JSONB NOT NULL,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS tickets (
                    id BIGSERIAL PRIMARY KEY,
                    ticket_id TEXT UNIQUE NOT NULL,
                    incident_id BIGINT REFERENCES incidents(id) ON DELETE SET NULL,
                    customer_profile_json JSONB NOT NULL,
                    charger_context_json JSONB NOT NULL,
                    input_component TEXT NOT NULL,
                    observation_result TEXT NOT NULL,
                    fault_type_v2 TEXT NOT NULL,
                    recipient_type TEXT NOT NULL,
                    assigned_team_id TEXT,
                    priority TEXT NOT NULL,
                    status TEXT NOT NULL,
                    ai_summary TEXT NOT NULL,
                    customer_comments TEXT,
                    required_proof_next TEXT,
                    evidence_photos_json JSONB NOT NULL DEFAULT '[]'::jsonb,
                    triage_result_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                    scheduled_at TIMESTAMPTZ,
                    scheduled_window TEXT,
                    assigned_technician TEXT,
                    technician_notes TEXT,
                    schedule_status TEXT NOT NULL DEFAULT 'not_required',
                    customer_confirmed_schedule BOOLEAN NOT NULL DEFAULT FALSE,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute("ALTER TABLE tickets ADD COLUMN IF NOT EXISTS triage_result_json JSONB NOT NULL DEFAULT '{}'::jsonb")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS ticket_events (
                    id BIGSERIAL PRIMARY KEY,
                    ticket_id TEXT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
                    event_type TEXT NOT NULL,
                    actor_role TEXT NOT NULL,
                    actor_name TEXT,
                    message TEXT NOT NULL,
                    payload_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS ticket_feedback (
                    id BIGSERIAL PRIMARY KEY,
                    ticket_id TEXT NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
                    issue_resolved TEXT NOT NULL,
                    support_rating INTEGER NOT NULL,
                    ai_guidance_helpful TEXT NOT NULL,
                    technician_rating INTEGER,
                    comment TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )


def save_incident(incident: dict[str, Any]) -> int:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO incidents (
                    site_id,
                    charger_id,
                    photo_evidence_json,
                    app_screenshot_evidence_json,
                    photo_hint,
                    symptom_text,
                    error_code,
                    follow_up_answers_json,
                    demo_scenario_id
                )
                VALUES (%s, %s, %s::jsonb, %s::jsonb, %s, %s, %s, %s::jsonb, %s)
                RETURNING id
                """,
                (
                    incident.get("site_id"),
                    incident.get("charger_id"),
                    json.dumps(incident.get("photo_evidence")) if incident.get("photo_evidence") else None,
                    json.dumps(incident.get("app_screenshot_evidence"))
                    if incident.get("app_screenshot_evidence")
                    else None,
                    incident.get("photo_hint"),
                    incident.get("symptom_text"),
                    incident.get("error_code"),
                    json.dumps(incident.get("follow_up_answers", {})),
                    incident.get("demo_scenario_id"),
                ),
            )
            row = cur.fetchone()
    return int(row["id"])


def update_incident(incident_id: int, incident: dict[str, Any]) -> bool:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                UPDATE incidents
                SET site_id = %s,
                    charger_id = %s,
                    photo_evidence_json = %s::jsonb,
                    app_screenshot_evidence_json = %s::jsonb,
                    photo_hint = %s,
                    symptom_text = %s,
                    error_code = %s,
                    follow_up_answers_json = %s::jsonb,
                    demo_scenario_id = %s
                WHERE id = %s
                """,
                (
                    incident.get("site_id"),
                    incident.get("charger_id"),
                    json.dumps(incident.get("photo_evidence")) if incident.get("photo_evidence") else None,
                    json.dumps(incident.get("app_screenshot_evidence"))
                    if incident.get("app_screenshot_evidence")
                    else None,
                    incident.get("photo_hint"),
                    incident.get("symptom_text"),
                    incident.get("error_code"),
                    json.dumps(incident.get("follow_up_answers", {})),
                    incident.get("demo_scenario_id"),
                    incident_id,
                ),
            )
            return cur.rowcount > 0


def save_audit(stage: str, payload: dict[str, Any], incident_id: int | None = None) -> int:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO triage_audits (incident_id, stage, payload_json)
                VALUES (%s, %s, %s::jsonb)
                RETURNING id
                """,
                (incident_id, stage, json.dumps(payload)),
            )
            row = cur.fetchone()
    return int(row["id"])


def _extract_incident_history(row: dict[str, Any]) -> dict[str, Any]:
    summary = dict(row)
    latest_triage_payload = summary.pop("latest_triage_payload_json", None)
    photo_evidence_raw = summary.pop("photo_evidence_json", None)
    app_screenshot_evidence_raw = summary.pop("app_screenshot_evidence_json", None)
    follow_up_answers_raw = summary.pop("follow_up_answers_json", None)

    summary["photo_evidence"] = photo_evidence_raw if isinstance(photo_evidence_raw, dict) else photo_evidence_raw
    summary["app_screenshot_evidence"] = (
        app_screenshot_evidence_raw if isinstance(app_screenshot_evidence_raw, dict) else app_screenshot_evidence_raw
    )
    if "follow_up_answers_json" in row:
        summary["follow_up_answers"] = follow_up_answers_raw if isinstance(follow_up_answers_raw, dict) else follow_up_answers_raw

    output = latest_triage_payload.get("competition_output", {}) if isinstance(latest_triage_payload, dict) else {}
    debug = latest_triage_payload.get("debug", {}) if isinstance(latest_triage_payload, dict) else {}
    summary["latest_input_component"] = output.get("input_component")
    summary["latest_observation_result"] = output.get("observation_result")
    summary["latest_fault_type_v2"] = output.get("fault_type_v2")
    summary["latest_recipient_type"] = output.get("recipient_type")
    summary["latest_assigned_team_id"] = output.get("assigned_team_id")
    summary["latest_confidence_score"] = output.get("confidence_score")
    summary["latest_action_message"] = output.get("action_message")
    summary["latest_rule_key"] = debug.get("rule_key") if isinstance(debug, dict) else None
    return summary


def list_recent_incidents(limit: int = 20) -> list[dict[str, Any]]:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT
                    incidents.id,
                    incidents.site_id,
                    incidents.charger_id,
                    incidents.photo_evidence_json,
                    incidents.app_screenshot_evidence_json,
                    incidents.photo_hint,
                    incidents.symptom_text,
                    incidents.error_code,
                    incidents.demo_scenario_id,
                    incidents.created_at,
                    (
                        SELECT stage
                        FROM triage_audits
                        WHERE triage_audits.incident_id = incidents.id
                        ORDER BY triage_audits.id DESC
                        LIMIT 1
                    ) AS latest_stage,
                    (
                        SELECT created_at
                        FROM triage_audits
                        WHERE triage_audits.incident_id = incidents.id
                        ORDER BY triage_audits.id DESC
                        LIMIT 1
                    ) AS latest_stage_at,
                    (
                        SELECT payload_json
                        FROM triage_audits
                        WHERE triage_audits.incident_id = incidents.id AND triage_audits.stage = 'triage_result'
                        ORDER BY triage_audits.id DESC
                        LIMIT 1
                    ) AS latest_triage_payload_json
                FROM incidents
                ORDER BY incidents.id DESC
                LIMIT %s
                """,
                (limit,),
            )
            rows = cur.fetchall()
    return [_extract_incident_history(row) for row in rows]


def get_incident_by_id(incident_id: int) -> dict[str, Any] | None:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT
                    incidents.id,
                    incidents.site_id,
                    incidents.charger_id,
                    incidents.photo_evidence_json,
                    incidents.app_screenshot_evidence_json,
                    incidents.photo_hint,
                    incidents.symptom_text,
                    incidents.error_code,
                    incidents.follow_up_answers_json,
                    incidents.demo_scenario_id,
                    incidents.created_at,
                    (
                        SELECT stage
                        FROM triage_audits
                        WHERE triage_audits.incident_id = incidents.id
                        ORDER BY triage_audits.id DESC
                        LIMIT 1
                    ) AS latest_stage,
                    (
                        SELECT created_at
                        FROM triage_audits
                        WHERE triage_audits.incident_id = incidents.id
                        ORDER BY triage_audits.id DESC
                        LIMIT 1
                    ) AS latest_stage_at,
                    (
                        SELECT payload_json
                        FROM triage_audits
                        WHERE triage_audits.incident_id = incidents.id AND triage_audits.stage = 'triage_result'
                        ORDER BY triage_audits.id DESC
                        LIMIT 1
                    ) AS latest_triage_payload_json
                FROM incidents
                WHERE incidents.id = %s
                """,
                (incident_id,),
            )
            row = cur.fetchone()
    if row is None:
        return None

    result = _extract_incident_history(row)
    if row.get("latest_triage_payload_json"):
        result["triage_payload"] = row["latest_triage_payload_json"]
    return result


def _extract_ticket_row(row: dict[str, Any]) -> dict[str, Any]:
    ticket = dict(row)
    ticket["customer_profile"] = ticket.pop("customer_profile_json", {}) or {}
    ticket["charger_context"] = ticket.pop("charger_context_json", {}) or {}
    ticket["evidence_photos"] = ticket.pop("evidence_photos_json", []) or []
    ticket["triage_result"] = ticket.pop("triage_result_json", {}) or {}
    return ticket


def _ticket_events(ticket_id: str) -> list[dict[str, Any]]:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT id, ticket_id, event_type, actor_role, actor_name, message, payload_json, created_at
                FROM ticket_events
                WHERE ticket_id = %s
                ORDER BY id ASC
                """,
                (ticket_id,),
            )
            return [dict(row) for row in cur.fetchall()]


def _ticket_feedback(ticket_id: str) -> list[dict[str, Any]]:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT id, ticket_id, issue_resolved, support_rating, ai_guidance_helpful,
                       technician_rating, comment, created_at
                FROM ticket_feedback
                WHERE ticket_id = %s
                ORDER BY id ASC
                """,
                (ticket_id,),
            )
            return [dict(row) for row in cur.fetchall()]


def _attach_ticket_children(ticket: dict[str, Any]) -> dict[str, Any]:
    ticket["events"] = _ticket_events(ticket["ticket_id"])
    ticket["feedback"] = _ticket_feedback(ticket["ticket_id"])
    return ticket


def _next_ticket_id(cur: Any) -> str:
    from app.services.tickets import generate_ticket_id

    prefix = generate_ticket_id(sequence=0)[:13]
    cur.execute("SELECT COUNT(*) AS count FROM tickets WHERE ticket_id LIKE %s", (f"{prefix}-%",))
    row = cur.fetchone()
    sequence = int(row["count"]) + 1
    return generate_ticket_id(sequence=sequence)


def create_ticket_record(values: dict[str, Any]) -> dict[str, Any]:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            ticket_id = _next_ticket_id(cur)
            cur.execute(
                """
                INSERT INTO tickets (
                    ticket_id,
                    incident_id,
                    customer_profile_json,
                    charger_context_json,
                    input_component,
                    observation_result,
                    fault_type_v2,
                    recipient_type,
                    assigned_team_id,
                    priority,
                    status,
                    ai_summary,
                    customer_comments,
                    required_proof_next,
                    evidence_photos_json,
                    triage_result_json,
                    schedule_status
                )
                VALUES (
                    %s, %s, %s::jsonb, %s::jsonb, %s, %s, %s, %s, %s,
                    %s, %s, %s, %s, %s, %s::jsonb, %s::jsonb, %s
                )
                RETURNING *
                """,
                (
                    ticket_id,
                    values.get("incident_id"),
                    json.dumps(values.get("customer_profile", {})),
                    json.dumps(values.get("charger_context", {})),
                    values.get("input_component"),
                    values.get("observation_result"),
                    values.get("fault_type_v2"),
                    values.get("recipient_type"),
                    values.get("assigned_team_id"),
                    values.get("priority"),
                    values.get("status"),
                    values.get("ai_summary"),
                    values.get("customer_comments"),
                    values.get("required_proof_next"),
                    json.dumps(values.get("evidence_photos", [])),
                    json.dumps(values.get("triage_result", {})),
                    values.get("schedule_status", "not_required"),
                ),
            )
            ticket = _extract_ticket_row(cur.fetchone())
            event_payloads = [
                ("ticket_created", "system", "Support ticket created.", {}),
                (
                    "triage_completed",
                    "system",
                    f"AI triage completed: {ticket['observation_result']} -> {ticket['fault_type_v2']}.",
                    {
                        "observation_result": ticket["observation_result"],
                        "fault_type_v2": ticket["fault_type_v2"],
                        "recipient_type": ticket["recipient_type"],
                    },
                ),
            ]
            if ticket.get("required_proof_next"):
                event_payloads.append(
                    (
                        "proof_requested",
                        "system",
                        str(ticket["required_proof_next"]),
                        {"required_proof_next": ticket["required_proof_next"]},
                    )
                )
            for event_type, actor_role, message, payload in event_payloads:
                cur.execute(
                    """
                    INSERT INTO ticket_events (ticket_id, event_type, actor_role, message, payload_json)
                    VALUES (%s, %s, %s, %s, %s::jsonb)
                    """,
                    (ticket_id, event_type, actor_role, message, json.dumps(payload)),
                )
    return _attach_ticket_children(ticket)


def list_ticket_records(filters: dict[str, str | None] | None = None) -> list[dict[str, Any]]:
    filters = filters or {}
    clauses: list[str] = []
    params: list[Any] = []
    filter_map = {
        "priority": "priority",
        "status": "status",
        "fault_type": "fault_type_v2",
        "component": "input_component",
        "recipient_type": "recipient_type",
        "assigned_technician": "assigned_technician",
        "installation_source": "charger_context_json ->> 'installed_by'",
        "customer_type": "charger_context_json ->> 'customer_type'",
        "customer_email": "customer_profile_json ->> 'email'",
        "customer_phone": "customer_profile_json ->> 'phone_number'",
        "whatsapp_number": "customer_profile_json ->> 'whatsapp_number'",
    }
    for key, column in filter_map.items():
        value = filters.get(key)
        if value:
            clauses.append(f"{column} = %s")
            params.append(value)
    date_submitted = filters.get("date_submitted")
    if date_submitted:
        clauses.append("created_at::date = %s::date")
        params.append(date_submitted)
    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                f"""
                SELECT *
                FROM tickets
                {where_sql}
                ORDER BY
                    CASE priority
                        WHEN 'Critical' THEN 1
                        WHEN 'High' THEN 2
                        WHEN 'Medium' THEN 3
                        ELSE 4
                    END,
                    created_at DESC
                LIMIT 100
                """,
                tuple(params),
            )
            rows = cur.fetchall()
    return [_attach_ticket_children(_extract_ticket_row(row)) for row in rows]


def get_ticket_record(ticket_id: str) -> dict[str, Any] | None:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT * FROM tickets WHERE ticket_id = %s", (ticket_id,))
            row = cur.fetchone()
    if not row:
        return None
    return _attach_ticket_children(_extract_ticket_row(row))


def append_ticket_evidence_record(
    ticket_id: str,
    evidence: dict[str, Any],
    evidence_type: str,
    actor_role: str,
    actor_name: str | None,
    message: str,
) -> dict[str, Any] | None:
    evidence_payload = {"kind": evidence_type, **evidence}
    status_changed = False
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT status FROM tickets WHERE ticket_id = %s", (ticket_id,))
            ticket_row = cur.fetchone()
            if not ticket_row:
                return None

            cur.execute(
                """
                UPDATE tickets
                SET evidence_photos_json = evidence_photos_json || %s::jsonb,
                    status = CASE WHEN status = 'waiting_customer' THEN 'assigned' ELSE status END,
                    updated_at = NOW()
                WHERE ticket_id = %s
                RETURNING *
                """,
                (json.dumps([evidence_payload]), ticket_id),
            )
            ticket = _extract_ticket_row(cur.fetchone())
            status_changed = ticket_row["status"] == "waiting_customer"
            cur.execute(
                """
                INSERT INTO ticket_events (ticket_id, event_type, actor_role, actor_name, message, payload_json)
                VALUES (%s, 'proof_uploaded', %s, %s, %s, %s::jsonb)
                """,
                (
                    ticket_id,
                    actor_role,
                    actor_name,
                    message,
                    json.dumps({"evidence_type": evidence_type, "evidence": evidence_payload}),
                ),
            )
            if status_changed:
                cur.execute(
                    """
                    INSERT INTO ticket_events (ticket_id, event_type, actor_role, actor_name, message, payload_json)
                    VALUES (%s, 'status_changed', 'system', NULL, %s, %s::jsonb)
                    """,
                    (
                        ticket_id,
                        "Customer proof uploaded. Ticket is ready for staff review.",
                        json.dumps({"status": "assigned", "reason": "proof_uploaded"}),
                    ),
                )
    return _attach_ticket_children(ticket)


def add_ticket_event_record(
    ticket_id: str,
    event_type: str,
    actor_role: str,
    actor_name: str | None,
    message: str,
    payload_json: dict[str, Any],
) -> dict[str, Any]:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO ticket_events (ticket_id, event_type, actor_role, actor_name, message, payload_json)
                VALUES (%s, %s, %s, %s, %s, %s::jsonb)
                RETURNING *
                """,
                (ticket_id, event_type, actor_role, actor_name, message, json.dumps(payload_json)),
            )
            row = cur.fetchone()
    return dict(row)


def update_ticket_status_record(ticket_id: str, status: str) -> dict[str, Any] | None:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                UPDATE tickets
                SET status = %s, updated_at = NOW()
                WHERE ticket_id = %s
                RETURNING *
                """,
                (status, ticket_id),
            )
            row = cur.fetchone()
    return _extract_ticket_row(row) if row else None


def update_ticket_priority_record(ticket_id: str, priority: str) -> dict[str, Any] | None:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                UPDATE tickets
                SET priority = %s, updated_at = NOW()
                WHERE ticket_id = %s
                RETURNING *
                """,
                (priority, ticket_id),
            )
            row = cur.fetchone()
    return _extract_ticket_row(row) if row else None


def schedule_ticket_record(
    ticket_id: str,
    scheduled_at: str,
    scheduled_window: str,
    assigned_technician: str,
) -> dict[str, Any] | None:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                UPDATE tickets
                SET scheduled_at = %s::timestamptz,
                    scheduled_window = %s,
                    assigned_technician = %s,
                    schedule_status = 'scheduled',
                    status = 'scheduled',
                    updated_at = NOW()
                WHERE ticket_id = %s
                RETURNING *
                """,
                (scheduled_at, scheduled_window, assigned_technician, ticket_id),
            )
            row = cur.fetchone()
    return _extract_ticket_row(row) if row else None


def save_ticket_feedback_record(ticket_id: str, feedback: dict[str, Any]) -> dict[str, Any] | None:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute("SELECT 1 FROM tickets WHERE ticket_id = %s", (ticket_id,))
            if not cur.fetchone():
                return None
            cur.execute(
                """
                INSERT INTO ticket_feedback (
                    ticket_id,
                    issue_resolved,
                    support_rating,
                    ai_guidance_helpful,
                    technician_rating,
                    comment
                )
                VALUES (%s, %s, %s, %s, %s, %s)
                RETURNING *
                """,
                (
                    ticket_id,
                    feedback.get("issue_resolved"),
                    feedback.get("support_rating"),
                    feedback.get("ai_guidance_helpful"),
                    feedback.get("technician_rating"),
                    feedback.get("comment"),
                ),
            )
            row = cur.fetchone()
    return dict(row) if row else None
