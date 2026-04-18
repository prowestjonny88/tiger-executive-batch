import os
import shutil
from pathlib import Path

import pytest

os.environ["DATABASE_URL"] = "postgresql://omnitriage:omnitriage@localhost:5432/omnitriage"
os.environ["LEGACY_SQLITE_PATH"] = str(Path(__file__).parent / "missing-legacy.sqlite3")
os.environ["UPLOAD_ROOT"] = str(Path(__file__).parent / "test-uploads")

pytest.importorskip("psycopg")
import psycopg
from fastapi.testclient import TestClient

from app.db.persistence import init_db
from app.main import app


shutil.rmtree(Path(os.environ["UPLOAD_ROOT"]), ignore_errors=True)
init_db()
client = TestClient(app)

SMALL_PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zl9sAAAAASUVORK5CYII="
)


def _reset_postgres() -> None:
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE triage_audits, incidents, known_case_index RESTART IDENTITY CASCADE")
        conn.commit()


def setup_function() -> None:
    _reset_postgres()


def test_preview_rejects_unknown_site():
    response = client.post(
        "/api/v1/intake/preview",
        json={
            "site_id": "missing-site",
            "photo_hint": "screen dim",
            "symptom_text": "charger offline",
            "error_code": "OFF-12",
        },
    )
    assert response.status_code == 404


def test_health_endpoint_exposes_runtime_mode():
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert payload["retrieval_backend"] == "postgres_pgvector"
    assert payload["embedding_provider"] in {"hash_embedding_provider", "gemini_embedding_provider"}
    assert payload["exact_image_shortcut_mode"] in {"demo", "guarded", "off"}
    assert "warnings" in payload


def test_preview_generates_round1_follow_up_questions():
    preview = client.post(
        "/api/v1/intake/preview",
        json={
            "site_id": "site-mall-01",
            "charger_id": "rex-ac-01",
            "photo_hint": "unclear, dark image",
            "symptom_text": "Charger problem reported but details are limited.",
            "error_code": "",
        },
    )

    assert preview.status_code == 200
    question_ids = {item["question_id"] for item in preview.json()["follow_up_questions"]}
    assert "photo_request" in question_ids
    assert "required_proof_next" in question_ids or "power_context" in question_ids


def test_preview_then_triage_reuses_same_incident_id():
    preview = client.post(
        "/api/v1/intake/preview",
        json={
            "site_id": "site-condo-01",
            "charger_id": "rex-ac-09",
            "photo_hint": "WC Apps screenshot shows charger faulted status",
            "symptom_text": "App screen captured after failed session.",
            "error_code": "Faulted",
        },
    )
    assert preview.status_code == 200
    preview_data = preview.json()

    triage = client.post(
        "/api/v1/triage",
        json={
            "incident_id": preview_data["incident_id"],
            "site_id": "site-condo-01",
            "charger_id": "rex-ac-09",
            "photo_hint": "WC Apps screenshot shows charger faulted status",
            "symptom_text": "App screen captured after failed session.",
            "error_code": "Faulted",
        },
    )
    assert triage.status_code == 200
    triage_data = triage.json()
    assert triage_data["incident_id"] == preview_data["incident_id"]
    assert triage_data["diagnosis"]["issue_family"] == "not_responding"
    assert triage_data["routing"]["resolver_tier"] == "remote_ops"
    assert triage_data["perception"]["evidence_type"] == "screenshot"
    assert triage_data["kb_retrieval"]["gate_decision"] in {"accepted", "contextual_only", "rejected"}
    assert triage_data["diagnosis"]["branch_name"].startswith("vlm_first_") or triage_data["diagnosis"]["branch_name"] == triage_data["diagnosis"]["diagnosis_source"]

    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT payload_json
                FROM triage_audits
                WHERE incident_id = %s AND stage = 'triage_gemini_attempt'
                ORDER BY id DESC
                LIMIT 1
                """,
                (preview_data["incident_id"],),
            )
            row = cur.fetchone()

    assert row is not None
    payload = row[0]
    assert payload["attempted"] in {True, False}
    assert payload["incident_id"] == preview_data["incident_id"]
    assert payload["diagnosis_source"] in {"gemini_first_principles", "kb_contextual_reasoning", "kb_accepted", "kb_enriched_by_reasoning", "text_only_incomplete", "first_principles_fallback"}


def test_recent_incidents_endpoint_includes_latest_round1_summary():
    preview = client.post(
        "/api/v1/intake/preview",
        json={
            "site_id": "site-condo-01",
            "charger_id": "rex-ac-09",
            "photo_hint": "display on, current limited",
            "symptom_text": "Charging is much slower than expected.",
            "error_code": "SLOW-11",
        },
    )
    incident_id = preview.json()["incident_id"]

    client.post(
        "/api/v1/triage",
        json={
            "incident_id": incident_id,
            "site_id": "site-condo-01",
            "charger_id": "rex-ac-09",
            "photo_hint": "display on, current limited",
            "symptom_text": "Charging is much slower than expected.",
            "error_code": "SLOW-11",
        },
    )

    incidents = client.get("/api/v1/incidents")

    assert incidents.status_code == 200
    latest = incidents.json()[0]
    assert latest["id"] == incident_id
    assert latest["latest_stage"] == "triage_result"
    assert latest["latest_issue_family"] == "charging_slow"
    assert latest["latest_resolver_tier"] == "remote_ops"
    assert latest["latest_fault"] is not None
    assert latest["latest_hazard_level"] in {"low", "medium", "high"}
    assert latest["latest_diagnosis_source"] is not None
    assert latest["latest_exact_image_shortcut_mode"] in {"demo", "guarded", "off", None}


def test_incident_detail_replay_includes_normalized_triage_payload():
    preview = client.post(
        "/api/v1/intake/preview",
        json={
            "site_id": "site-mall-01",
            "charger_id": "rex-ac-01",
            "photo_hint": "display off, no lights",
            "symptom_text": "Charger appears unpowered.",
        },
    )
    incident_id = preview.json()["incident_id"]

    client.post(
        "/api/v1/triage",
        json={
            "incident_id": incident_id,
            "site_id": "site-mall-01",
            "charger_id": "rex-ac-01",
            "photo_hint": "display off, no lights",
            "symptom_text": "Charger appears unpowered.",
        },
    )

    incident = client.get(f"/api/v1/incidents/{incident_id}")
    assert incident.status_code == 200
    payload = incident.json()["triage_payload"]
    assert payload["perception"]["mode"] in {"vlm", "heuristic", "text_only"}
    assert payload["kb_retrieval"]["gate_decision"] in {"accepted", "contextual_only", "rejected"}
    assert payload["diagnosis"]["issue_family"] == "no_power"
    assert payload["routing"]["resolver_tier"] in {"driver", "remote_ops", "technician"}
    assert payload["diagnosis"]["retrieval_metadata"]["match_state"] in {"exact_filename", "accepted", "weak", "rejected"}


def test_upload_endpoint_persists_photo_and_preview_uses_metadata():
    upload = client.post(
        "/api/v1/uploads",
        json={
            "filename": "charger-screen.png",
            "media_type": "image/png",
            "content_base64": SMALL_PNG_BASE64,
        },
    )

    assert upload.status_code == 200
    uploaded_photo = upload.json()
    assert uploaded_photo["filename"] == "charger-screen.png"
    assert uploaded_photo["storage_path"].startswith("uploads/incidents/")

    stored_file = Path(os.environ["UPLOAD_ROOT"]) / "incidents" / Path(uploaded_photo["storage_path"]).name
    assert stored_file.exists()

    uploaded_asset = client.get(f"/{uploaded_photo['storage_path']}")
    assert uploaded_asset.status_code == 200
    assert uploaded_asset.content == stored_file.read_bytes()

    preview = client.post(
        "/api/v1/intake/preview",
        json={
            "site_id": "site-mall-01",
            "charger_id": "rex-ac-01",
            "photo_evidence": uploaded_photo,
            "symptom_text": "Driver captured the charger screen after a failed session.",
            "error_code": "",
        },
    )

    assert preview.status_code == 200
    preview_data = preview.json()
    assert preview_data["quality"]["filename"] == "charger-screen.png"
    assert preview_data["quality"]["storage_path"] == uploaded_photo["storage_path"]
