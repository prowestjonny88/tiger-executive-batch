from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from app.core.models import ChargerContext, CustomerProfile, TicketFromTriageRequest, TicketStatusUpdateRequest
from app.services import tickets


def _customer() -> CustomerProfile:
    return CustomerProfile(
        full_name="Ng Hong Jon",
        phone_number="+60123456789",
        whatsapp_number="+60123456789",
        email="jon@example.com",
        preferred_contact_method="whatsapp",
    )


def _context(**overrides) -> ChargerContext:
    data = {
        "installation_address": "Kuala Lumpur",
        "customer_type": "home",
        "installed_by": "rexharge",
        "installer_name": "ChargerDoc",
        "charger_serial_number": "SN-001",
        "charger_brand_model": "Proton e.MAS",
        "symptom_text": "Red light visible",
        "error_code": "",
    }
    data.update(overrides)
    return ChargerContext(**data)


def _triage_output(**output_overrides):
    output = {
        "input_component": "charger",
        "observation_result": "charger_red_light",
        "fault_type_v2": "charger_issue",
        "recipient_type": "after_sales_team",
        "assigned_team_id": "AS_TEAM_01",
        "action_message": "Screenshot the app and send to after-sales team.",
        "required_proof_next": "EV app screenshot if available.",
        "confidence_score": 0.95,
        "evidence_notes": [],
        "source": "theme2_rule_mapper",
    }
    output.update(output_overrides)
    return {
        "incident_id": 7,
        "incident": {
            "site_id": "site-mall-01",
            "photo_evidence": {
                "filename": "charger.jpg",
                "media_type": "image/jpeg",
                "storage_path": "/uploads/charger.jpg",
                "byte_size": 1234,
            },
        },
        "perception": {"hazard_signals": [], "extraction": {"bounding_boxes": []}},
        "competition_output": output,
        "follow_up_prompts": [{"question_id": "charger_app_screenshot", "prompt": "Add screenshot"}],
    }


def test_generate_ticket_id_uses_required_format():
    assert tickets.generate_ticket_id(datetime(2026, 6, 4, tzinfo=timezone.utc), 7) == "RXT-20260604-0007"


def test_priority_and_status_derive_from_theme2_output():
    triage = _triage_output()

    assert tickets.derive_priority_from_triage(triage, _context()) == "High"
    assert tickets.derive_initial_ticket_status(triage) == "waiting_customer"


def test_wrong_or_missing_evdb_specs_are_critical():
    triage = _triage_output(
        input_component="evdb",
        observation_result="wrong_component_specs",
        fault_type_v2="protection_issue",
        recipient_type="after_sales_team",
        required_proof_next=None,
    )
    triage["follow_up_prompts"] = []

    assert tickets.derive_priority_from_triage(triage, _context()) == "Critical"
    assert tickets.derive_initial_ticket_status(triage) == "assigned"


def test_third_party_installation_is_high_priority_review():
    triage = _triage_output(recipient_type="customer", fault_type_v2="power_cut", observation_result="isolator_off_open_circuit")

    assert tickets.derive_priority_from_triage(triage, _context(installed_by="third_party")) == "High"


def test_create_ticket_from_triage_builds_record(monkeypatch):
    captured = {}

    def fake_create_ticket_record(values):
        captured.update(values)
        return {"ticket_id": "RXT-20260604-0001", "status": values["status"], "priority": values["priority"]}

    monkeypatch.setattr("app.db.persistence.create_ticket_record", fake_create_ticket_record)

    result = tickets.create_ticket_from_triage(
        TicketFromTriageRequest(
            incident_id=7,
            triage_result=_triage_output(),
            customer_profile=_customer(),
            charger_context=_context(),
            customer_comments="Customer uploaded red-light evidence.",
        )
    )

    assert result["ticket_id"] == "RXT-20260604-0001"
    assert captured["input_component"] == "charger"
    assert captured["evidence_photos"][0]["filename"] == "charger.jpg"
    assert captured["triage_result"]["competition_output"]["observation_result"] == "charger_red_light"


def test_status_update_writes_timeline_event(monkeypatch):
    events = []

    monkeypatch.setattr("app.db.persistence.update_ticket_status_record", lambda ticket_id, status: {"ticket_id": ticket_id, "status": status})
    monkeypatch.setattr("app.db.persistence.get_ticket_record", lambda ticket_id: {"ticket_id": ticket_id, "status": "scheduled", "events": events})
    monkeypatch.setattr(
        "app.db.persistence.add_ticket_event_record",
        lambda **kwargs: events.append(kwargs) or kwargs,
    )

    result = tickets.update_ticket_status(
        "RXT-20260604-0001",
        TicketStatusUpdateRequest(status="scheduled", actor_role="staff", actor_name="Demo Staff", note="Scheduled visit."),
    )

    assert result is not None
    assert events[0]["event_type"] == "status_changed"
    assert events[0]["payload_json"]["status"] == "scheduled"


def test_ticket_schema_and_routes_are_additive_source_contract():
    repo_root = Path(__file__).resolve().parents[2]
    persistence_source = (repo_root / "backend" / "app" / "db" / "persistence.py").read_text(encoding="utf-8")
    main_source = (repo_root / "backend" / "app" / "main.py").read_text(encoding="utf-8")

    assert "CREATE TABLE IF NOT EXISTS tickets" in persistence_source
    assert "CREATE TABLE IF NOT EXISTS ticket_events" in persistence_source
    assert "CREATE TABLE IF NOT EXISTS ticket_feedback" in persistence_source
    assert "/api/v1/triage" in main_source
    assert "/api/v1/tickets/from-triage" in main_source
    assert "/api/v1/tickets/{ticket_id}/status" in main_source
    assert "/api/v1/tickets/{ticket_id}/schedule" in main_source
    assert "/api/v1/tickets/{ticket_id}/feedback" in main_source
