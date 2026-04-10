from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any

DB_PATH = Path(os.getenv("DATABASE_URL", Path(__file__).resolve().parents[2] / "omnitriage.sqlite3"))


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with _connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS incidents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                site_id TEXT NOT NULL,
                charger_id TEXT,
                photo_evidence_json TEXT,
                photo_hint TEXT,
                symptom_text TEXT,
                error_code TEXT,
                follow_up_answers_json TEXT NOT NULL,
                demo_scenario_id TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS triage_audits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                incident_id INTEGER,
                stage TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (incident_id) REFERENCES incidents(id)
            );
            """
        )
        incident_columns = {row["name"] for row in conn.execute("PRAGMA table_info(incidents)").fetchall()}
        if "photo_evidence_json" not in incident_columns:
            conn.execute("ALTER TABLE incidents ADD COLUMN photo_evidence_json TEXT")


def save_incident(incident: dict[str, Any]) -> int:
    with _connect() as conn:
        cursor = conn.execute(
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
        row_id = cursor.lastrowid
        return 0 if row_id is None else int(row_id)


def update_incident(incident_id: int, incident: dict[str, Any]) -> bool:
    with _connect() as conn:
        cursor = conn.execute(
            """
            UPDATE incidents
            SET site_id = ?, charger_id = ?, photo_evidence_json = ?, photo_hint = ?, symptom_text = ?, error_code = ?, follow_up_answers_json = ?, demo_scenario_id = ?
            WHERE id = ?
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
        return cursor.rowcount > 0


def save_audit(stage: str, payload: dict[str, Any], incident_id: int | None = None) -> int:
    with _connect() as conn:
        cursor = conn.execute(
            "INSERT INTO triage_audits (incident_id, stage, payload_json) VALUES (?, ?, ?)",
            (incident_id, stage, json.dumps(payload)),
        )
        row_id = cursor.lastrowid
        return 0 if row_id is None else int(row_id)


def _derive_legacy_issue_type(payload: dict[str, Any]) -> str:
    diagnosis = payload.get("diagnosis", {})
    text = " ".join(
        str(item)
        for item in [
            diagnosis.get("internal_issue_category", ""),
            diagnosis.get("likely_fault", ""),
            diagnosis.get("evidence_summary", ""),
            diagnosis.get("raw_provider_output", ""),
        ]
    ).lower()

    if any(token in text for token in ["mcb", "rccb", "breaker", "trip"]):
        return "tripping_mcb_rccb"
    if any(token in text for token in ["slow", "voltage drop", "low current", "vehicle limitation"]):
        return "charging_slow"
    if any(token in text for token in ["power", "supply", "lights off", "dead"]):
        return "no_power"
    return "not_responding"


def _normalize_triage_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("workflow") and payload.get("diagnosis", {}).get("issue_type"):
        return payload

    diagnosis = payload.get("diagnosis", {})
    routing = payload.get("routing", {})
    artifact = payload.get("artifact", {})
    issue_type = _derive_legacy_issue_type(payload)
    hazard_flags = diagnosis.get("hazard_flags", [])
    outcome = "escalate" if routing.get("resolver_tier") in {"remote_ops", "technician"} or hazard_flags else "resolved"

    return {
        **payload,
        "diagnosis": {
            **diagnosis,
            "issue_type": issue_type,
            "basic_conditions": {
                "main_power_supply": "unknown",
                "cable_condition": "problem" if hazard_flags else "unknown",
                "indicator_or_error_code": "ok" if diagnosis.get("raw_ocr_text") or diagnosis.get("evidence_summary") else "unknown",
                "indicator_detail": diagnosis.get("raw_ocr_text") or None,
            },
        },
        "workflow": {
            "issue_type": issue_type,
            "branch_actions": artifact.get("steps") or [routing.get("next_action"), routing.get("fallback_action")],
            "outcome": outcome,
            "rationale": routing.get("rationale") or "Legacy triage record normalized into organizer decision-tree format.",
            "next_action": routing.get("next_action") or "Review the legacy incident details.",
            "fallback_action": routing.get("fallback_action") or "Escalate if the issue remains unresolved.",
        },
        "artifact": {
            **artifact,
            "issue_type": issue_type,
        },
    }


def _extract_incident_history(row: sqlite3.Row) -> dict[str, Any]:
    summary: dict[str, Any] = dict(row)
    latest_triage_payload_raw = summary.pop("latest_triage_payload_json", None)
    photo_evidence_raw = summary.pop("photo_evidence_json", None)

    summary["photo_evidence"] = json.loads(photo_evidence_raw) if photo_evidence_raw else None

    if latest_triage_payload_raw:
        latest_triage_payload = _normalize_triage_payload(json.loads(latest_triage_payload_raw))
        workflow = latest_triage_payload.get("workflow", {})
        diagnosis = latest_triage_payload.get("diagnosis", {})
        confidence = latest_triage_payload.get("confidence", {})
        summary["latest_issue_type"] = diagnosis.get("issue_type")
        summary["latest_outcome"] = workflow.get("outcome")
        summary["latest_fault"] = diagnosis.get("likely_fault")
        summary["latest_confidence_band"] = confidence.get("band")
    else:
        summary["latest_issue_type"] = None
        summary["latest_outcome"] = None
        summary["latest_fault"] = None
        summary["latest_confidence_band"] = None

    return summary


def list_recent_incidents(limit: int = 20) -> list[dict[str, Any]]:
    with _connect() as conn:
        rows = conn.execute(
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
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
    return [_extract_incident_history(row) for row in rows]


def get_incident_by_id(incident_id: int) -> dict[str, Any] | None:
    """Return a single incident with its full triage audit for the replay endpoint."""
    with _connect() as conn:
        row = conn.execute(
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
            WHERE incidents.id = ?
            """,
            (incident_id,),
        ).fetchone()
        if row is None:
            return None

    result = _extract_incident_history(row)
    # Also attach follow_up_answers and full triage payload for replay
    follow_up_raw = dict(row).get("follow_up_answers_json")
    result["follow_up_answers"] = json.loads(follow_up_raw) if follow_up_raw else {}
    
    triage_raw = dict(row).get("latest_triage_payload_json")
    if triage_raw:
        result["triage_payload"] = _normalize_triage_payload(json.loads(triage_raw))
        
    return result
