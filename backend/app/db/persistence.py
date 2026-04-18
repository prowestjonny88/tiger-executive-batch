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
            cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS incidents (
                    id BIGSERIAL PRIMARY KEY,
                    site_id TEXT NOT NULL,
                    charger_id TEXT,
                    photo_evidence_json JSONB,
                    photo_hint TEXT,
                    symptom_text TEXT,
                    error_code TEXT,
                    follow_up_answers_json JSONB NOT NULL DEFAULT '{}'::jsonb,
                    demo_scenario_id TEXT,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
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
                CREATE TABLE IF NOT EXISTS known_case_index (
                    case_key TEXT PRIMARY KEY,
                    payload_json JSONB NOT NULL,
                    embedding vector(32),
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
                    photo_hint,
                    symptom_text,
                    error_code,
                    follow_up_answers_json,
                    demo_scenario_id
                )
                VALUES (%s, %s, %s::jsonb, %s, %s, %s, %s::jsonb, %s)
                RETURNING id
                """,
                (
                    incident.get("site_id"),
                    incident.get("charger_id"),
                    json.dumps(incident.get("photo_evidence")) if incident.get("photo_evidence") else None,
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


def save_known_case_snapshot(case_key: str, payload: dict[str, Any], embedding: list[float] | None = None) -> None:
    embedding_literal = None if embedding is None else "[" + ",".join(f"{value:.8f}" for value in embedding) + "]"
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO known_case_index (case_key, payload_json, embedding)
                VALUES (%s, %s::jsonb, %s)
                ON CONFLICT (case_key)
                DO UPDATE SET payload_json = EXCLUDED.payload_json, embedding = EXCLUDED.embedding
                """,
                (case_key, json.dumps(payload), embedding_literal),
            )


def _extract_incident_history(row: dict[str, Any]) -> dict[str, Any]:
    summary = dict(row)
    latest_triage_payload_raw = summary.pop("latest_triage_payload_json", None)
    photo_evidence_raw = summary.pop("photo_evidence_json", None)
    follow_up_answers_raw = summary.pop("follow_up_answers_json", None)

    summary["photo_evidence"] = photo_evidence_raw if isinstance(photo_evidence_raw, dict) else photo_evidence_raw
    summary["follow_up_answers"] = follow_up_answers_raw if isinstance(follow_up_answers_raw, dict) else follow_up_answers_raw

    if latest_triage_payload_raw:
        latest_triage_payload = latest_triage_payload_raw
        diagnosis = latest_triage_payload.get("diagnosis", {})
        routing = latest_triage_payload.get("routing", {})
        confidence = latest_triage_payload.get("confidence", {})
        retrieval = diagnosis.get("retrieval_metadata") or {}
        kb_retrieval = latest_triage_payload.get("kb_retrieval") or {}
        summary["latest_issue_family"] = diagnosis.get("issue_family")
        summary["latest_resolver_tier"] = routing.get("resolver_tier")
        summary["latest_fault"] = diagnosis.get("fault_type") or diagnosis.get("likely_fault")
        summary["latest_confidence_band"] = confidence.get("band") or diagnosis.get("confidence_band")
        summary["latest_hazard_level"] = diagnosis.get("hazard_level")
        summary["latest_diagnosis_source"] = diagnosis.get("diagnosis_source")
        summary["latest_retrieval_provider"] = retrieval.get("provider_name")
        summary["latest_known_case"] = (
            (kb_retrieval.get("primary_candidate") or {}).get("canonical_file_name")
            or (diagnosis.get("known_case_hit") or {}).get("canonical_file_name")
        )
        summary["latest_kb_gate_decision"] = kb_retrieval.get("gate_decision")
    else:
        summary["latest_issue_family"] = None
        summary["latest_resolver_tier"] = None
        summary["latest_fault"] = None
        summary["latest_confidence_band"] = None
        summary["latest_hazard_level"] = None
        summary["latest_diagnosis_source"] = None
        summary["latest_retrieval_provider"] = None
        summary["latest_known_case"] = None
        summary["latest_kb_gate_decision"] = None

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
