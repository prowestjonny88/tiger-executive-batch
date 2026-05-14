from __future__ import annotations

import json
import sqlite3
from pathlib import Path

from app.db import legacy_replay
from app.services.history import get_incident_history_by_id


TEST_ROOT = Path(__file__).parent / "test-legacy-db"


def _seed_legacy_db(db_path: Path) -> None:
    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE incidents (
                id INTEGER PRIMARY KEY,
                site_id TEXT NOT NULL,
                charger_id TEXT,
                photo_evidence_json TEXT,
                photo_hint TEXT,
                symptom_text TEXT,
                error_code TEXT,
                follow_up_answers_json TEXT,
                demo_scenario_id TEXT,
                created_at TEXT
            )
            """
        )
        cur.execute(
            """
            CREATE TABLE triage_audits (
                id INTEGER PRIMARY KEY,
                incident_id INTEGER,
                stage TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT
            )
            """
        )
        cur.execute(
            """
            INSERT INTO incidents (
                id, site_id, charger_id, photo_evidence_json, photo_hint, symptom_text,
                error_code, follow_up_answers_json, demo_scenario_id, created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                999,
                "legacy-site",
                "legacy-charger",
                json.dumps({"filename": "legacy.jpg"}),
                "legacy hint",
                "legacy symptom",
                "",
                json.dumps({"power_context": "checked"}),
                None,
                "2026-04-18T12:00:00Z",
            ),
        )
        cur.execute(
            """
            INSERT INTO triage_audits (incident_id, stage, payload_json, created_at)
            VALUES (?, ?, ?, ?)
            """,
            (
                999,
                "triage_result",
                json.dumps(
                    {
                        "diagnosis": {
                            "issue_type": "no_power",
                            "likely_fault": "legacy likely fault",
                            "hazard_flags": ["visible_hazard"],
                        },
                        "workflow": {
                            "outcome": "escalate",
                            "issue_type": "no_power",
                            "rationale": "legacy rationale",
                            "next_action": "legacy next action",
                        },
                        "confidence": {"band": "medium", "score": 0.5},
                    }
                ),
                "2026-04-18T12:05:00Z",
            ),
        )
        conn.commit()
    finally:
        conn.close()


def test_legacy_replay_normalizes_payload_and_supports_lookup(monkeypatch):
    TEST_ROOT.mkdir(exist_ok=True)
    db_path = TEST_ROOT / "legacy-1.sqlite3"
    db_path.unlink(missing_ok=True)
    _seed_legacy_db(db_path)
    monkeypatch.setattr(legacy_replay, "LEGACY_SQLITE_PATH", db_path)

    incidents = legacy_replay.list_recent_legacy_incidents(limit=5)
    assert len(incidents) == 1
    assert incidents[0]["latest_issue_family"] == "no_power"
    assert incidents[0]["latest_known_case"] is None

    incident = legacy_replay.get_legacy_incident_by_id(999)
    assert incident is not None
    assert incident["triage_payload"]["diagnosis"]["issue_family"] == "no_power"
    assert incident["triage_payload"]["routing"]["resolver_tier"] == "remote_ops"


def test_history_service_falls_back_to_legacy_lookup(monkeypatch):
    TEST_ROOT.mkdir(exist_ok=True)
    db_path = TEST_ROOT / "legacy-2.sqlite3"
    db_path.unlink(missing_ok=True)
    _seed_legacy_db(db_path)
    monkeypatch.setattr(legacy_replay, "LEGACY_SQLITE_PATH", db_path)

    incident = get_incident_history_by_id(999)
    assert incident is not None
    assert incident["site_id"] == "legacy-site"
    assert incident["triage_payload"]["routing"]["routing_rationale"] == "legacy rationale"
