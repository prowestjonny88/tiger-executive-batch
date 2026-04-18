from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any


LEGACY_SQLITE_PATH = Path(
    os.getenv("LEGACY_SQLITE_PATH", Path(__file__).resolve().parents[2] / "omnitriage.sqlite3")
)


def _legacy_connect() -> sqlite3.Connection | None:
    if not LEGACY_SQLITE_PATH.exists():
        return None
    conn = sqlite3.connect(LEGACY_SQLITE_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def normalize_legacy_triage_payload(payload: dict[str, Any]) -> dict[str, Any]:
    if payload.get("routing") and payload.get("diagnosis", {}).get("issue_family"):
        return payload

    diagnosis = payload.get("diagnosis", {})
    routing = payload.get("routing", {})
    workflow = payload.get("workflow", {})
    issue_family = diagnosis.get("issue_family") or diagnosis.get("issue_type") or workflow.get("issue_type") or "unknown_mixed"
    hazard_level = "high" if diagnosis.get("hazard_flags") else "medium"
    resolver_tier = routing.get("resolver_tier") or ("remote_ops" if workflow.get("outcome") == "escalate" else "driver")
    recommended_next_step = routing.get("next_action") or workflow.get("next_action") or "Review the incident and collect clearer evidence."
    fallback_action = routing.get("fallback_action") or workflow.get("fallback_action") or "Escalate to remote operations if unresolved."

    return {
        **payload,
        "perception": payload.get("perception")
        or {
            "mode": "heuristic",
            "evidence_type": diagnosis.get("evidence_type") or "unknown",
            "scene_summary": diagnosis.get("evidence_summary") or "Legacy replay perception unavailable.",
            "components_visible": [],
            "visible_abnormalities": diagnosis.get("hazard_flags", []),
            "ocr_findings": [],
            "hazard_signals": diagnosis.get("hazard_flags", []),
            "uncertainty_notes": ["Legacy record replay normalization."],
            "confidence_score": diagnosis.get("confidence_score") or payload.get("confidence", {}).get("score") or 0.5,
            "requires_follow_up": payload.get("confidence", {}).get("requires_follow_up", False),
            "provider_attempted": False,
            "fallback_used": True,
            "error_type": "legacy_normalization",
            "error_message": "Legacy replay perception unavailable.",
            "raw_provider_output": diagnosis.get("raw_provider_output"),
        },
        "kb_retrieval": payload.get("kb_retrieval")
        or {
            "query_text": diagnosis.get("evidence_summary") or "legacy replay",
            "provider_name": "legacy_replay",
            "provider_mode": "normalized",
            "gate_decision": "rejected",
            "gate_basis": "Legacy payload did not preserve KB retrieval details.",
            "candidate_count": 0,
            "primary_candidate": None,
            "candidates": [],
            "rejection_threshold": None,
            "weak_threshold": None,
            "image_embedding_used": False,
            "text_embedding_used": False,
            "top_family_consensus": [],
            "score_margin_top2": None,
            "stable_neighborhood": False,
            "compatibility_notes": [],
            "extra": {},
        },
        "diagnosis": {
            "issue_family": issue_family,
            "fault_type": diagnosis.get("fault_type") or diagnosis.get("likely_fault") or "legacy_fault",
            "evidence_type": diagnosis.get("evidence_type") or "unknown",
            "hazard_level": diagnosis.get("hazard_level") or hazard_level,
            "resolver_tier_proposed": diagnosis.get("resolver_tier_proposed") or diagnosis.get("resolver_tier") or resolver_tier,
            "likely_fault": diagnosis.get("likely_fault") or diagnosis.get("fault_type") or "Legacy triage fault",
            "evidence_summary": diagnosis.get("evidence_summary") or diagnosis.get("raw_provider_output") or "Legacy triage record.",
            "required_proof_next": diagnosis.get("required_proof_next"),
            "raw_provider_output": diagnosis.get("raw_provider_output") or "Legacy triage record normalized for replay.",
            "raw_ocr_text": diagnosis.get("raw_ocr_text"),
            "confidence_score": diagnosis.get("confidence_score") or payload.get("confidence", {}).get("score") or 0.5,
            "confidence_band": diagnosis.get("confidence_band") or payload.get("confidence", {}).get("band") or "medium",
            "unknown_flag": diagnosis.get("unknown_flag", issue_family == "unknown_mixed"),
            "requires_follow_up": payload.get("confidence", {}).get("requires_follow_up", False),
            "follow_up_prompts": [],
            "diagnosis_source": diagnosis.get("diagnosis_source") or "legacy_normalization",
            "branch_name": diagnosis.get("branch_name") or "legacy_normalization",
            "hazard_flags": diagnosis.get("hazard_flags", []),
            "known_case_hit": diagnosis.get("known_case_hit"),
            "retrieval_metadata": diagnosis.get("retrieval_metadata"),
            "confidence_reasoning": diagnosis.get("confidence_reasoning"),
            "novelty_flag": diagnosis.get("novelty_flag", True),
            "known_case_match_score": diagnosis.get("known_case_match_score"),
            "reasoning_notes": diagnosis.get("reasoning_notes", ["Legacy triage record normalized for replay."]),
        },
        "routing": {
            "issue_family": issue_family,
            "fault_type": diagnosis.get("fault_type") or diagnosis.get("likely_fault") or "legacy_fault",
            "hazard_level": diagnosis.get("hazard_level") or hazard_level,
            "resolver_tier": resolver_tier,
            "resolver_decision": "confirmed",
            "resolver_override_reason": None,
            "routing_rationale": routing.get("routing_rationale") or workflow.get("rationale") or "Legacy triage record normalized for replay/history.",
            "recommended_next_step": recommended_next_step,
            "fallback_action": fallback_action,
            "required_proof_next": diagnosis.get("required_proof_next"),
            "escalation_required": resolver_tier in {"remote_ops", "technician"},
        },
    }


def _extract_legacy_incident_history(row: dict[str, Any]) -> dict[str, Any]:
    summary = dict(row)
    latest_triage_payload_raw = summary.pop("latest_triage_payload_json", None)
    photo_evidence_raw = summary.pop("photo_evidence_json", None)
    follow_up_answers_raw = summary.pop("follow_up_answers_json", None)

    summary["photo_evidence"] = photo_evidence_raw if isinstance(photo_evidence_raw, dict) else photo_evidence_raw
    summary["follow_up_answers"] = follow_up_answers_raw if isinstance(follow_up_answers_raw, dict) else follow_up_answers_raw

    if latest_triage_payload_raw:
        latest_triage_payload = normalize_legacy_triage_payload(latest_triage_payload_raw)
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


def list_recent_legacy_incidents(limit: int = 20) -> list[dict[str, Any]]:
    legacy_conn = _legacy_connect()
    if legacy_conn is None:
        return []

    with legacy_conn as conn:
        legacy_rows = conn.execute(
            """
            SELECT
                incidents.id,
                incidents.site_id,
                incidents.charger_id,
                json(photo_evidence_json) AS photo_evidence_json,
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

    results: list[dict[str, Any]] = []
    for row in legacy_rows:
        item = dict(row)
        if item.get("photo_evidence_json"):
            item["photo_evidence_json"] = json.loads(item["photo_evidence_json"])
        if item.get("latest_triage_payload_json"):
            item["latest_triage_payload_json"] = json.loads(item["latest_triage_payload_json"])
        results.append(_extract_legacy_incident_history(item))
    return results


def get_legacy_incident_by_id(incident_id: int) -> dict[str, Any] | None:
    legacy_conn = _legacy_connect()
    if legacy_conn is None:
        return None

    with legacy_conn as conn:
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

    item = dict(row)
    if item.get("photo_evidence_json"):
        item["photo_evidence_json"] = json.loads(item["photo_evidence_json"])
    if item.get("follow_up_answers_json"):
        item["follow_up_answers_json"] = json.loads(item["follow_up_answers_json"])
    if item.get("latest_triage_payload_json"):
        item["latest_triage_payload_json"] = json.loads(item["latest_triage_payload_json"])
    result = _extract_legacy_incident_history(item)
    if item.get("latest_triage_payload_json"):
        result["triage_payload"] = normalize_legacy_triage_payload(item["latest_triage_payload_json"])
    return result
