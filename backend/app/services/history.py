from __future__ import annotations

from app.db.persistence import get_incident_by_id as get_live_incident_by_id
from app.db.persistence import list_recent_incidents as list_live_incidents


def list_incident_history(limit: int = 20, include_legacy: bool = False) -> list[dict]:
    return list_live_incidents(limit)


def get_incident_history_by_id(incident_id: int, include_legacy: bool = False) -> dict | None:
    return get_live_incident_by_id(incident_id)
