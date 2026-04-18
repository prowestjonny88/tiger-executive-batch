from __future__ import annotations

from app.db.legacy_replay import get_legacy_incident_by_id, list_recent_legacy_incidents
from app.db.persistence import get_incident_by_id as get_live_incident_by_id
from app.db.persistence import list_recent_incidents as list_live_incidents


def list_incident_history(limit: int = 20, include_legacy: bool = True) -> list[dict]:
    live_results = list_live_incidents(limit)
    if not include_legacy:
        return live_results

    merged = live_results + list_recent_legacy_incidents(limit)
    merged.sort(key=lambda item: str(item.get("created_at", "")), reverse=True)
    return merged[:limit]


def get_incident_history_by_id(incident_id: int) -> dict | None:
    live = get_live_incident_by_id(incident_id)
    if live is not None:
        return live
    return get_legacy_incident_by_id(incident_id)
