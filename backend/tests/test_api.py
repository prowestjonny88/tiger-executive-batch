import os
import shutil
from pathlib import Path

os.environ["DATABASE_URL"] = str(Path(__file__).parent / "test-omnitriage.sqlite3")
os.environ["UPLOAD_ROOT"] = str(Path(__file__).parent / "test-uploads")

from fastapi.testclient import TestClient

from app.db.persistence import init_db
from app.main import app


shutil.rmtree(Path(os.environ["UPLOAD_ROOT"]), ignore_errors=True)
init_db()
client = TestClient(app)

SMALL_PNG_BASE64 = (
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Zl9sAAAAASUVORK5CYII="
)


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


def test_preview_generates_organizer_follow_up_questions():
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
    assert "main_power_supply" in question_ids
    assert "cable_condition" in question_ids
    assert "indicator_or_error_code" in question_ids


def test_preview_then_triage_reuses_same_incident_id():
    preview = client.post(
        "/api/v1/intake/preview",
        json={
            "site_id": "site-mall-01",
            "charger_id": "rex-ac-01",
            "photo_hint": "screen frozen, buttons unresponsive",
            "symptom_text": "The charger remains powered but does not respond to input.",
            "error_code": "UI-09",
        },
    )
    assert preview.status_code == 200
    preview_data = preview.json()

    triage = client.post(
        "/api/v1/triage",
        json={
            "incident_id": preview_data["incident_id"],
            "site_id": "site-mall-01",
            "charger_id": "rex-ac-01",
            "photo_hint": "screen frozen, buttons unresponsive",
            "symptom_text": "The charger remains powered but does not respond to input.",
            "error_code": "UI-09",
            "follow_up_answers": {
                "main_power_supply": "Power is available.",
                "cable_condition": "Cable looks good.",
                "indicator_or_error_code": "UI-09 is shown on the frozen display.",
            },
        },
    )
    assert triage.status_code == 200
    triage_data = triage.json()
    assert triage_data["incident_id"] == preview_data["incident_id"]
    assert triage_data["diagnosis"]["issue_type"] == "not_responding"
    assert triage_data["workflow"]["outcome"] == "resolved"


def test_sites_and_demo_scenarios_endpoints_return_seeded_contracts():
    sites = client.get("/api/v1/sites")
    scenarios = client.get("/api/v1/demo/scenarios")

    assert sites.status_code == 200
    assert scenarios.status_code == 200
    assert any(site["site_id"] == "site-mall-01" for site in sites.json())
    assert any(scenario["scenario_id"] == "demo-no-power" for scenario in scenarios.json())


def test_recent_incidents_endpoint_includes_latest_triage_summary():
    preview = client.post(
        "/api/v1/intake/preview",
        json={
            "site_id": "site-condo-01",
            "charger_id": "rex-ac-09",
            "photo_hint": "display on, reduced output",
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
            "photo_hint": "display on, reduced output",
            "symptom_text": "Charging is much slower than expected.",
            "error_code": "SLOW-11",
            "follow_up_answers": {
                "main_power_supply": "Main supply is available.",
                "cable_condition": "Cable is in good condition.",
                "indicator_or_error_code": "Display shows SLOW-11 and reduced current.",
            },
        },
    )

    incidents = client.get("/api/v1/incidents")

    assert incidents.status_code == 200
    latest = incidents.json()[0]
    assert latest["id"] == incident_id
    assert latest["latest_stage"] == "triage_result"
    assert latest["latest_issue_type"] == "charging_slow"
    assert latest["latest_outcome"] == "resolved"
    assert latest["latest_fault"] == "Output setting or vehicle limitation"
    assert latest["latest_confidence_band"] in {"high", "medium"}


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
            "follow_up_answers": {
                "main_power_supply": "Supply is missing at the charger.",
                "cable_condition": "Cable is normal.",
                "indicator_or_error_code": "No indicator is visible.",
            },
        },
    )

    incident = client.get(f"/api/v1/incidents/{incident_id}")
    assert incident.status_code == 200
    payload = incident.json()["triage_payload"]
    assert payload["diagnosis"]["issue_type"] == "no_power"
    assert payload["workflow"]["outcome"] in {"resolved", "escalate"}


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
    assert preview_data["quality"]["quality_status"] == "retake_required"

    incidents = client.get("/api/v1/incidents")
    latest = incidents.json()[0]
    assert latest["photo_evidence"]["filename"] == "charger-screen.png"
