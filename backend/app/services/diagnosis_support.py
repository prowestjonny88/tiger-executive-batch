from __future__ import annotations

import os
import re
from pathlib import Path

from app.core.models import (
    BasicCheckStatus,
    BasicConditionsAssessment,
    ConfidenceBand,
    IncidentInput,
    IssueType,
    SeverityLevel,
)

VALID_ISSUE_TYPES = {"no_power", "tripping_mcb_rccb", "charging_slow", "not_responding"}
VALID_STATUSES = {"ok", "problem", "unknown"}
VALID_SEVERITIES = {severity.value for severity in SeverityLevel}

DIAGNOSIS_ASSET_DIR = Path(
    os.getenv("OMNITRIAGE_DIAGNOSIS_ASSET_DIR", Path(__file__).resolve().parent / "diagnosis_assets")
)
DIAGNOSIS_CONFIG_DIR = Path(
    os.getenv("OMNITRIAGE_DIAGNOSIS_CONFIG_DIR", Path(__file__).resolve().parent / "diagnosis_config")
)
UPLOAD_ROOT = Path(os.getenv("UPLOAD_ROOT", Path(__file__).resolve().parents[2] / "uploads"))


def normalize_status(value: object) -> BasicCheckStatus:
    normalized = str(value or "unknown").strip().lower().replace(" ", "_")
    if normalized in VALID_STATUSES:
        return normalized  # type: ignore[return-value]
    return "unknown"


def make_basic_conditions(
    main_power_supply: BasicCheckStatus = "unknown",
    cable_condition: BasicCheckStatus = "unknown",
    indicator_or_error_code: BasicCheckStatus = "unknown",
    indicator_detail: str | None = None,
) -> BasicConditionsAssessment:
    detail = indicator_detail.strip() if indicator_detail else None
    return BasicConditionsAssessment(
        main_power_supply=main_power_supply,
        cable_condition=cable_condition,
        indicator_or_error_code=indicator_or_error_code,
        indicator_detail=detail or None,
    )


def text_blob(incident: IncidentInput) -> str:
    return " ".join(
        filter(
            None,
            [
                incident.photo_hint or "",
                incident.symptom_text or "",
                incident.error_code or "",
                incident.photo_evidence.filename if incident.photo_evidence else "",
                " ".join(f"{key}:{value}" for key, value in incident.follow_up_answers.items()),
            ],
        )
    ).lower()


def has_any(text: str, tokens: list[str]) -> bool:
    return any(token in text for token in tokens)


def infer_basic_conditions(incident: IncidentInput) -> BasicConditionsAssessment:
    text = text_blob(incident)
    power_answer = (incident.follow_up_answers.get("main_power_supply") or "").lower()
    cable_answer = (incident.follow_up_answers.get("cable_condition") or "").lower()
    indicator_answer = (incident.follow_up_answers.get("indicator_or_error_code") or "").lower()
    main_power_supply: BasicCheckStatus = "unknown"
    cable_condition: BasicCheckStatus = "unknown"
    indicator_or_error_code: BasicCheckStatus = "unknown"

    if has_any(power_answer, ["available", "present", "stable", "healthy", "ok", "good", "on"]) or has_any(
        text,
        [
            "power available",
            "display on",
            "screen on",
            "screen dim",
            "indicator on",
            "mains healthy",
            "incoming voltage ok",
            "main_power_supply:ok",
            "main_power_supply:yes",
        ],
    ):
        main_power_supply = "ok"
    elif has_any(power_answer, ["missing", "unavailable", "off", "low", "failed", "dead", "no power"]) or has_any(
        text,
        [
            "no power",
            "power unavailable",
            "incoming voltage low",
            "incoming voltage missing",
            "lights off",
            "display off",
            "main breaker off",
            "mcb off",
            "main_power_supply:no",
            "main_power_supply:problem",
        ],
    ):
        main_power_supply = "problem"

    has_negative_damage_signal = has_any(
        cable_answer,
        ["good", "normal", "looks normal", "secure", "no damage", "no visible damage"],
    ) or has_any(
        text,
        [
            "no damage",
            "no visible damage",
            "without damage",
            "cable condition good",
            "cable_condition:ok",
            "cable_condition:good",
            "visible_damage:no",
            "visible_damage:false",
        ],
    )
    has_damage_signal = has_any(
        cable_answer,
        ["loose", "hot", "warm", "damage", "overheat", "burn", "frayed"],
    ) or has_any(
        text,
        [
            "burn",
            "exposed",
            "scorch",
            "water",
            "frayed",
            "melt",
            "loose cable",
            "overheat",
            "cable damage",
            "connector damage",
            "cable_condition:problem",
        ],
    ) or ("damage" in text and not has_negative_damage_signal)
    if has_damage_signal:
        cable_condition = "problem"
    elif has_negative_damage_signal:
        cable_condition = "ok"

    indicator_detail = incident.error_code or incident.follow_up_answers.get("indicator_or_error_code_detail", "")
    if has_any(indicator_answer, ["no indicator", "none", "blank", "dead", "off"]) or has_any(
        text,
        [
            "blank screen",
            "no indicator",
            "no error code",
            "indicator_or_error_code:problem",
            "screen dead",
            "display dead",
        ],
    ):
        indicator_or_error_code = "problem"
    elif indicator_answer or indicator_detail or has_any(
        text,
        [
            "error code",
            "indicator",
            "led",
            "blink",
            "display",
            "screen",
            "indicator_or_error_code:ok",
        ],
    ):
        indicator_or_error_code = "ok"

    return make_basic_conditions(
        main_power_supply=main_power_supply,
        cable_condition=cable_condition,
        indicator_or_error_code=indicator_or_error_code,
        indicator_detail=indicator_detail or incident.error_code,
    )


def infer_issue_type(incident: IncidentInput, basic_conditions: BasicConditionsAssessment | None = None) -> IssueType:
    text = text_blob(incident)
    conditions = basic_conditions or infer_basic_conditions(incident)

    if has_any(text, ["tripping", "trip", "breaker", "mcb", "rccb", "rcd"]):
        return "tripping_mcb_rccb"
    if has_any(text, ["slow", "slower", "reduced output", "low current", "voltage drop", "vehicle limiting"]):
        return "charging_slow"
    if has_any(text, ["not responding", "unresponsive", "frozen", "hung", "stuck", "blank screen", "reset system"]):
        return "not_responding"
    if has_any(text, ["no power", "power off", "dead charger", "lights off", "incoming voltage", "no supply"]):
        return "no_power"

    if conditions.main_power_supply == "problem":
        return "no_power"
    if conditions.indicator_or_error_code == "problem":
        return "not_responding"
    if conditions.cable_condition == "problem":
        return "tripping_mcb_rccb"

    return "not_responding"


def likely_fault_for(issue_type: IssueType, conditions: BasicConditionsAssessment) -> str:
    if issue_type == "no_power":
        if conditions.main_power_supply == "problem":
            return "Main supply or breaker issue"
        return "Power supply not reaching charger"
    if issue_type == "tripping_mcb_rccb":
        if conditions.cable_condition == "problem":
            return "Loose or overheated cable connection"
        return "Breaker protection is tripping"
    if issue_type == "charging_slow":
        return "Output setting or vehicle limitation"
    if conditions.indicator_or_error_code == "problem":
        return "Control board or display not responding"
    return "System needs a controlled reset"


def severity_for(
    issue_type: IssueType,
    basic_conditions: BasicConditionsAssessment,
    hazard_flags: list[str],
    confidence_score: float,
) -> SeverityLevel:
    if hazard_flags:
        return SeverityLevel.CRITICAL
    if basic_conditions.main_power_supply == "problem" or basic_conditions.cable_condition == "problem":
        return SeverityLevel.HIGH
    if issue_type in {"tripping_mcb_rccb", "not_responding"}:
        return SeverityLevel.MODERATE
    if confidence_score >= 0.8:
        return SeverityLevel.LOW
    return SeverityLevel.MODERATE


def confidence_band(score: float) -> ConfidenceBand:
    if score >= 0.85:
        return ConfidenceBand.HIGH
    if score >= 0.60:
        return ConfidenceBand.MEDIUM
    return ConfidenceBand.LOW


def extract_visible_hazard_flags(text: str, basic_conditions: BasicConditionsAssessment) -> list[str]:
    hazard_flags: list[str] = []
    has_visible_hazard = basic_conditions.cable_condition == "problem" and has_any(
        text,
        ["burn", "exposed", "scorch", "water", "melt"],
    )
    if has_visible_hazard:
        hazard_flags.append("visible_hazard")
    return hazard_flags


def clamp_score(score: float) -> float:
    return max(0.0, min(1.0, score))


def resolve_incident_photo_path(incident: IncidentInput) -> Path | None:
    if not incident.photo_evidence or not incident.photo_evidence.storage_path:
        return None

    storage_name = Path(incident.photo_evidence.storage_path).name
    candidate_paths = [
        UPLOAD_ROOT / storage_name,
        Path(__file__).resolve().parents[2] / incident.photo_evidence.storage_path,
        Path(incident.photo_evidence.storage_path),
    ]
    for path in candidate_paths:
        if path.exists():
            return path
    return None


def _looks_like_mobile_app_screenshot(incident: IncidentInput) -> bool:
    image_path = resolve_incident_photo_path(incident)
    if image_path is None:
        return False

    try:
        from PIL import Image

        with Image.open(image_path) as image:
            image = image.convert("RGB")
            width, height = image.size
            if width <= 0 or height <= 0:
                return False

            aspect_ratio = height / width
            thumbnail = image.resize((64, 64))
            pixels = list(thumbnail.getdata())
    except Exception:  # noqa: BLE001
        return False

    light_pixels = 0
    muted_pixels = 0
    dark_pixels = 0
    for red, green, blue in pixels:
        if min(red, green, blue) >= 210:
            light_pixels += 1
        if max(red, green, blue) - min(red, green, blue) <= 35:
            muted_pixels += 1
        if max(red, green, blue) <= 70:
            dark_pixels += 1

    total_pixels = len(pixels) or 1
    light_ratio = light_pixels / total_pixels
    muted_ratio = muted_pixels / total_pixels
    dark_ratio = dark_pixels / total_pixels

    return (
        aspect_ratio >= 1.65
        and light_ratio >= 0.35
        and muted_ratio >= 0.45
        and dark_ratio <= 0.35
    )


def is_probably_screenshot_evidence(incident: IncidentInput) -> bool:
    text = text_blob(incident)
    if incident.photo_evidence and incident.photo_evidence.filename:
        filename = incident.photo_evidence.filename.lower()
        if any(token in filename for token in ["screenshot", "screen-shot", "screen_capture", "screen-capture", "apps"]):
            return True

    screenshot_tokens = [
        "screenshot",
        "app log",
        "apps error log",
        "wc apps",
        "faulted",
        "over-voltage fault",
        "display text",
        "screen capture",
        "app screen",
        "ui log",
        "log screenshot",
        "paired charger",
        "previous charging",
        "welcome home",
        "add charger",
        "charging session",
    ]
    return has_any(text, screenshot_tokens) or _looks_like_mobile_app_screenshot(incident)


def is_probably_symptom_heavy(incident: IncidentInput) -> bool:
    text = text_blob(incident)
    symptom_tokens = [
        "charger no pulse",
        "no pulse",
        "not charging",
        "charging never started",
        "charging stopped suddenly",
        "screen off",
        "no display",
        "display off",
        "screen frozen",
        "buttons unresponsive",
        "not responding",
    ]
    return has_any(text, symptom_tokens)


def issue_type_from_issue_type_detail(value: str | None) -> IssueType | None:
    normalized = re.sub(r"[^a-z]+", " ", (value or "").strip().lower()).strip()
    if not normalized:
        return None
    mapping: dict[str, IssueType] = {
        "no power": "no_power",
        "tripping mcb rccb": "tripping_mcb_rccb",
        "charging slow": "charging_slow",
        "not responding": "not_responding",
    }
    return mapping.get(normalized)
