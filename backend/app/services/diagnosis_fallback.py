from __future__ import annotations

import re

from app.core.models import ConfidenceBand, EvidenceType, HazardLevel, IncidentInput, ResolverTier


def build_incident_text(incident: IncidentInput) -> str:
    parts = [
        incident.photo_hint or "",
        incident.symptom_text or "",
        incident.error_code or "",
        " ".join(f"{key} {value}" for key, value in incident.follow_up_answers.items()),
    ]
    return " ".join(part for part in parts if part).strip()


def infer_evidence_type(incident: IncidentInput) -> EvidenceType:
    text = build_incident_text(incident).lower()
    screenshot_tokens = [
        "wc apps",
        "screenshot",
        "screen capture",
        "error logs",
        "faulted",
        "over-voltage",
        "app screen",
    ]
    symptom_tokens = ["no pulse", "not charging", "no display", "screen off", "not responding", "frozen"]

    if any(token in text for token in screenshot_tokens):
        return "screenshot"
    if incident.photo_evidence and any(token in text for token in symptom_tokens):
        return "symptom_heavy_photo"
    if incident.photo_evidence:
        return "hardware_photo"
    if incident.symptom_text or incident.error_code:
        return "symptom_report"
    return "unknown"


def infer_issue_family(incident: IncidentInput) -> str:
    text = build_incident_text(incident).lower()
    if any(token in text for token in ["mcb", "rccb", "trip", "breaker"]):
        return "tripping"
    if any(token in text for token in ["slow", "reduced output", "vehicle limitation", "voltage drop"]):
        return "charging_slow"
    if any(token in text for token in ["no power", "no pulse", "lights off", "display off", "dead"]):
        return "no_power"
    if any(token in text for token in ["faulted", "frozen", "not responding", "error log", "app"]):
        return "not_responding"
    return "unknown_mixed"


def looks_ambiguous(text: str) -> bool:
    ambiguous_tokens = ["unclear", "not sure", "no clear", "unknown", "details are limited", "cannot confirm", "insufficient evidence"]
    return any(token in text for token in ambiguous_tokens)


def extract_raw_ocr_text(incident: IncidentInput) -> str | None:
    if incident.error_code:
        return incident.error_code
    text = " ".join([incident.photo_hint or "", incident.symptom_text or ""])
    match = re.search(r"(faulted|over-?voltage fault|ui-\d+|trip-\d+|slow-\d+)", text, flags=re.IGNORECASE)
    return match.group(1) if match else None


def follow_up_prompts(issue_family: str, evidence_type: EvidenceType, known_case_required_proof: str | None) -> list[dict[str, str]]:
    prompts: list[dict[str, str]] = []
    if evidence_type in {"symptom_report", "unknown"}:
        prompts.append({"question_id": "photo_request", "prompt": "Capture a wider photo of the charger and upstream power path."})
    if issue_family == "unknown_mixed":
        prompts.append({"question_id": "power_context", "prompt": "Confirm whether upstream power and isolator state have been checked."})
    if known_case_required_proof:
        prompts.append({"question_id": "required_proof_next", "prompt": known_case_required_proof})
    return prompts[:3]


def hazard_flags(
    hazard_level: HazardLevel,
    incident: IncidentInput,
    known_case_fault: str | None,
    known_case_abnormalities: list[str] | None = None,
) -> list[str]:
    flags: list[str] = []
    if hazard_level == "high":
        flags.append("high_hazard")
    text = build_incident_text(incident).lower()
    if any(token in text for token in ["burn", "melt", "exposed", "illegal wiring", "shock", "smell"]):
        flags.append("visible_hazard")
    if known_case_fault and "ground" in known_case_fault:
        flags.append("grounding_risk")
    if known_case_abnormalities:
        flags.extend(item.strip() for item in known_case_abnormalities if item.strip())
    return sorted(set(flags))


def has_explicit_visual_hazard(incident: IncidentInput) -> bool:
    text = build_incident_text(incident).lower()
    return any(token in text for token in ["burn", "melt", "exposed", "illegal wiring", "shock", "smell"])


def confidence_band(score: float) -> ConfidenceBand:
    if score >= 0.8:
        return ConfidenceBand.HIGH
    if score >= 0.55:
        return ConfidenceBand.MEDIUM
    return ConfidenceBand.LOW


def fallback_resolver(issue_family: str, hazard_level: HazardLevel) -> ResolverTier:
    if hazard_level == "high":
        return "technician"
    if issue_family == "unknown_mixed":
        return "remote_ops"
    if issue_family == "tripping":
        return "local_site"
    if issue_family == "no_power":
        return "driver"
    return "remote_ops"


_HAZARD_RANK: dict[HazardLevel, int] = {"low": 0, "medium": 1, "high": 2}


def max_hazard_level(*levels: str | None) -> HazardLevel:
    best: HazardLevel = "low"
    for level in levels:
        normalized = str(level or "").strip().lower()
        if normalized in _HAZARD_RANK and _HAZARD_RANK[normalized] > _HAZARD_RANK[best]:
            best = normalized  # type: ignore[assignment]
    return best


def build_confidence_reasoning(
    diagnosis_source: str,
    retrieval_metadata,
    known_case_hit,
    used_gemini: bool,
) -> str:
    parts: list[str] = []
    if known_case_hit is not None:
        parts.append(
            f"Accepted known-case match {known_case_hit.canonical_file_name} "
            f"at {known_case_hit.match_score:.2f} via {known_case_hit.match_reason}."
        )
    elif retrieval_metadata and retrieval_metadata.selected_score is not None:
        threshold = f"{retrieval_metadata.rejection_threshold:.2f}" if retrieval_metadata.rejection_threshold is not None else "n/a"
        parts.append(
            "No known case was accepted; "
            f"best retrieval score was {retrieval_metadata.selected_score:.2f} "
            f"with state {retrieval_metadata.match_state} against threshold {threshold}."
        )
    else:
        parts.append("No known-case retrieval signal was available.")

    if used_gemini:
        if diagnosis_source == "gemini_vlm_primary":
            parts.append("Gemini provided the primary structured diagnosis.")
        else:
            parts.append("Gemini was used to enrich the accepted retrieval result.")
    else:
        parts.append("Deterministic retrieval and fallback policy determined the diagnosis.")
    return " ".join(parts)
