from __future__ import annotations

import json
import os
from contextlib import contextmanager
from typing import Any, Iterator

from app.services.embeddings import EMBEDDING_DIMENSION

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
                f"""
                CREATE TABLE IF NOT EXISTS known_case_index (
                    case_key TEXT PRIMARY KEY,
                    payload_json JSONB NOT NULL,
                    embedding vector(32),
                    text_embedding vector({EMBEDDING_DIMENSION}),
                    image_embedding vector({EMBEDDING_DIMENSION}),
                    evidence_type TEXT,
                    issue_family TEXT,
                    hazard_level TEXT,
                    component_primary TEXT,
                    abnormalities_json JSONB NOT NULL DEFAULT '[]'::jsonb,
                    embedding_provider TEXT,
                    embedding_mode TEXT,
                    embedding_dimension INTEGER,
                    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                )
                """
            )
            cur.execute(f"ALTER TABLE known_case_index ADD COLUMN IF NOT EXISTS text_embedding vector({EMBEDDING_DIMENSION})")
            cur.execute(f"ALTER TABLE known_case_index ADD COLUMN IF NOT EXISTS image_embedding vector({EMBEDDING_DIMENSION})")
            cur.execute("ALTER TABLE known_case_index ADD COLUMN IF NOT EXISTS evidence_type TEXT")
            cur.execute("ALTER TABLE known_case_index ADD COLUMN IF NOT EXISTS issue_family TEXT")
            cur.execute("ALTER TABLE known_case_index ADD COLUMN IF NOT EXISTS hazard_level TEXT")
            cur.execute("ALTER TABLE known_case_index ADD COLUMN IF NOT EXISTS component_primary TEXT")
            cur.execute("ALTER TABLE known_case_index ADD COLUMN IF NOT EXISTS abnormalities_json JSONB NOT NULL DEFAULT '[]'::jsonb")
            cur.execute("ALTER TABLE known_case_index ADD COLUMN IF NOT EXISTS embedding_provider TEXT")
            cur.execute("ALTER TABLE known_case_index ADD COLUMN IF NOT EXISTS embedding_mode TEXT")
            cur.execute("ALTER TABLE known_case_index ADD COLUMN IF NOT EXISTS embedding_dimension INTEGER")


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


def upsert_known_case_index_entry(
    case_key: str,
    payload: dict[str, Any],
    *,
    text_embedding: list[float],
    image_embedding: list[float] | None,
    evidence_type: str,
    issue_family: str,
    hazard_level: str,
    component_primary: str | None,
    abnormalities: list[str],
    embedding_provider: str,
    embedding_mode: str,
) -> None:
    text_literal = "[" + ",".join(f"{value:.8f}" for value in text_embedding) + "]"
    image_literal = None if image_embedding is None else "[" + ",".join(f"{value:.8f}" for value in image_embedding) + "]"
    legacy_embedding_literal = None
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                INSERT INTO known_case_index (
                    case_key,
                    payload_json,
                    embedding,
                    text_embedding,
                    image_embedding,
                    evidence_type,
                    issue_family,
                    hazard_level,
                    component_primary,
                    abnormalities_json,
                    embedding_provider,
                    embedding_mode,
                    embedding_dimension
                )
                VALUES (%s, %s::jsonb, %s, %s, %s, %s, %s, %s, %s, %s::jsonb, %s, %s, %s)
                ON CONFLICT (case_key)
                DO UPDATE SET
                    payload_json = EXCLUDED.payload_json,
                    embedding = EXCLUDED.embedding,
                    text_embedding = EXCLUDED.text_embedding,
                    image_embedding = EXCLUDED.image_embedding,
                    evidence_type = EXCLUDED.evidence_type,
                    issue_family = EXCLUDED.issue_family,
                    hazard_level = EXCLUDED.hazard_level,
                    component_primary = EXCLUDED.component_primary,
                    abnormalities_json = EXCLUDED.abnormalities_json,
                    embedding_provider = EXCLUDED.embedding_provider,
                    embedding_mode = EXCLUDED.embedding_mode,
                    embedding_dimension = EXCLUDED.embedding_dimension
                """,
                (
                    case_key,
                    json.dumps(payload),
                    legacy_embedding_literal,
                    text_literal,
                    image_literal,
                    evidence_type,
                    issue_family,
                    hazard_level,
                    component_primary,
                    json.dumps(abnormalities),
                    embedding_provider,
                    embedding_mode,
                    EMBEDDING_DIMENSION,
                ),
            )


def get_known_case_index_status() -> dict[str, Any]:
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT
                    COUNT(*)::INT AS row_count,
                    MAX(created_at) AS latest_created_at,
                    MAX(embedding_provider) AS embedding_provider,
                    MAX(embedding_mode) AS embedding_mode,
                    MAX(embedding_dimension) AS embedding_dimension
                FROM known_case_index
                """
            )
            row = cur.fetchone()
    return dict(row or {})


def fetch_known_case_candidates(
    *,
    query_text_embedding: list[float],
    query_image_embedding: list[float] | None,
    evidence_types: list[str],
    limit: int = 5,
) -> list[dict[str, Any]]:
    text_literal = "[" + ",".join(f"{value:.8f}" for value in query_text_embedding) + "]"
    with _pg_connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            if query_image_embedding is None:
                cur.execute(
                    """
                    SELECT
                        case_key,
                        payload_json,
                        evidence_type,
                        issue_family,
                        hazard_level,
                        component_primary,
                        abnormalities_json,
                        GREATEST(0.0, 1 - (text_embedding <=> %s::vector)) AS text_score,
                        0.0 AS image_score
                    FROM known_case_index
                    WHERE evidence_type = ANY(%s)
                    ORDER BY
                        GREATEST(0.0, 1 - (text_embedding <=> %s::vector)) DESC,
                        case_key ASC
                    LIMIT %s
                    """,
                    (text_literal, evidence_types, text_literal, limit),
                )
            else:
                image_literal = "[" + ",".join(f"{value:.8f}" for value in query_image_embedding) + "]"
                cur.execute(
                    """
                    SELECT
                        case_key,
                        payload_json,
                        evidence_type,
                        issue_family,
                        hazard_level,
                        component_primary,
                        abnormalities_json,
                        GREATEST(0.0, 1 - (text_embedding <=> %s::vector)) AS text_score,
                        CASE
                            WHEN image_embedding IS NULL THEN 0.0
                            ELSE GREATEST(0.0, 1 - (image_embedding <=> %s::vector))
                        END AS image_score
                    FROM known_case_index
                    WHERE evidence_type = ANY(%s)
                    ORDER BY
                        (
                            GREATEST(0.0, 1 - (text_embedding <=> %s::vector))
                            + CASE
                                WHEN image_embedding IS NULL THEN 0.0
                                ELSE GREATEST(0.0, 1 - (image_embedding <=> %s::vector))
                              END
                        ) DESC,
                        case_key ASC
                    LIMIT %s
                    """,
                    (text_literal, image_literal, evidence_types, text_literal, image_literal, limit),
                )
            rows = cur.fetchall()
    return [dict(row) for row in rows]


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
        kb_extra = kb_retrieval.get("extra") or {}
        warnings = kb_extra.get("warnings") if isinstance(kb_extra, dict) else None
        summary["latest_issue_family"] = diagnosis.get("issue_family")
        summary["latest_resolver_tier"] = routing.get("resolver_tier")
        summary["latest_fault"] = diagnosis.get("fault_type") or diagnosis.get("likely_fault")
        summary["latest_confidence_band"] = confidence.get("band") or diagnosis.get("confidence_band")
        summary["latest_hazard_level"] = diagnosis.get("hazard_level")
        summary["latest_diagnosis_source"] = diagnosis.get("diagnosis_source")
        summary["latest_retrieval_provider"] = retrieval.get("provider_name")
        summary["latest_retrieval_provider_mode"] = kb_retrieval.get("provider_mode")
        summary["latest_retrieval_signal_mode"] = kb_extra.get("retrieval_signal_mode") if isinstance(kb_extra, dict) else None
        summary["latest_retrieval_warning"] = warnings[0] if isinstance(warnings, list) and warnings else None
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
        summary["latest_retrieval_provider_mode"] = None
        summary["latest_retrieval_signal_mode"] = None
        summary["latest_retrieval_warning"] = None
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
