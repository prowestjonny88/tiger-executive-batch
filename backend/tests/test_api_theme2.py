import os
import shutil
from pathlib import Path

import pytest

os.environ["DATABASE_URL"] = "postgresql://omnitriage:omnitriage@localhost:5432/omnitriage"
os.environ["UPLOAD_ROOT"] = str(Path(__file__).parent / "test-uploads")

pytest.importorskip("psycopg")
import psycopg
from fastapi.testclient import TestClient

from app.db.persistence import init_db
from app.main import app

shutil.rmtree(Path(os.environ["UPLOAD_ROOT"]), ignore_errors=True)

try:
    with psycopg.connect(os.environ["DATABASE_URL"], connect_timeout=1) as _conn:
        pass
    init_db()
except psycopg.OperationalError as exc:
    pytest.skip(f"Postgres integration tests require reachable DATABASE_URL: {exc}", allow_module_level=True)

client = TestClient(app)

SMALL_PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zl9sAAAAASUVORK5CYII="
)


def _reset_postgres() -> None:
    with psycopg.connect(os.environ["DATABASE_URL"]) as conn:
        with conn.cursor() as cur:
            cur.execute("TRUNCATE triage_audits, incidents RESTART IDENTITY CASCADE")
        conn.commit()


def setup_function() -> None:
    _reset_postgres()


def test_health_endpoint_exposes_theme2_runtime():
    response = client.get("/api/v1/health")

    assert response.status_code == 200
    payload = response.json()
    assert payload["runtime_mode"] == "theme2_round2_clean"
    assert payload["round1_runtime_enabled"] is False
    assert payload["rule_version"] == "2026-05-theme2-round2-v1"


def test_preview_then_triage_reuses_same_incident_id_and_returns_clean_contract():
    preview = client.post(
        "/api/v1/intake/preview",
        json={
            "site_id": "site-mall-01",
            "charger_id": "rex-ac-01",
            "photo_hint": "charger red light",
            "symptom_text": "Customer reports charger red light.",
            "error_code": "",
        },
    )
    assert preview.status_code == 200
    incident_id = preview.json()["incident_id"]

    triage = client.post(
        "/api/v1/triage",
        json={
            "incident_id": incident_id,
            "site_id": "site-mall-01",
            "charger_id": "rex-ac-01",
            "photo_hint": "charger red light",
            "symptom_text": "Customer reports charger red light.",
            "error_code": "",
        },
    )

    assert triage.status_code == 200
    payload = triage.json()
    assert payload["incident_id"] == incident_id
    assert payload["competition_output"]["observation_result"] == "charger_red_light"
    assert payload["competition_output"]["fault_type_v2"] == "charger_issue"
    assert payload["competition_output"]["recipient_type"] == "after_sales_team"
    assert "kb_retrieval" not in payload
    assert "diagnosis" not in payload
    assert "routing" not in payload
    assert "artifact" not in payload


def test_recent_incidents_endpoint_includes_theme2_summary():
    triage = client.post(
        "/api/v1/triage",
        json={
            "site_id": "site-mall-01",
            "photo_hint": "isolator off open circuit",
            "symptom_text": "The isolator switch is off.",
        },
    )
    incident_id = triage.json()["incident_id"]

    incidents = client.get("/api/v1/incidents")

    assert incidents.status_code == 200
    latest = incidents.json()[0]
    assert latest["id"] == incident_id
    assert latest["latest_input_component"] == "isolator"
    assert latest["latest_observation_result"] == "isolator_off_open_circuit"
    assert latest["latest_fault_type_v2"] == "power_cut"
    assert latest["latest_recipient_type"] == "customer"


def test_incident_detail_replay_includes_theme2_triage_payload():
    triage = client.post(
        "/api/v1/triage",
        json={
            "site_id": "site-mall-01",
            "photo_hint": "charger blinking red light",
            "symptom_text": "The red indicator blinks 7 flashes.",
            "follow_up_answers": {"red_light_flash_count": "7 flashes"},
        },
    )
    incident_id = triage.json()["incident_id"]

    incident = client.get(f"/api/v1/incidents/{incident_id}")

    assert incident.status_code == 200
    payload = incident.json()["triage_payload"]
    assert payload["competition_output"]["fault_type_v2"] == "manual_error"
    assert payload["debug"]["error_log_key"] == "red_light_flashes_7"


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
    assert uploaded_photo["storage_provider"] == "local"
    assert uploaded_photo["storage_key"].startswith("incidents/")
    assert uploaded_photo["display_url"].startswith("/uploads/incidents/")

    stored_file = Path(os.environ["UPLOAD_ROOT"]) / "incidents" / Path(uploaded_photo["storage_path"]).name
    assert stored_file.exists()

    evidence = client.get(f"/api/v1/evidence/{uploaded_photo['storage_key']}")
    assert evidence.status_code == 200
    assert evidence.headers["content-type"].startswith("image/png")

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
