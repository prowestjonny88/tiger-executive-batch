from __future__ import annotations

import json
import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib

from app.core.models import IncidentInput, IssueType, SeverityLevel
from app.services.diagnosis_contracts import DiagnosisProviderResponse
from app.services.diagnosis_support import (
    DIAGNOSIS_ASSET_DIR,
    clamp_score,
    extract_visible_hazard_flags,
    infer_basic_conditions,
    likely_fault_for,
    make_basic_conditions,
    severity_for,
    text_blob,
)
from app.services.intake import UPLOAD_ROOT

CLASSIFIER_MODEL_PATH = Path(
    os.getenv("OMNITRIAGE_CLASSIFIER_MODEL_PATH", DIAGNOSIS_ASSET_DIR / "model_5class_logreg.pkl")
)
CLASSIFIER_LABEL_PATH = Path(
    os.getenv("OMNITRIAGE_CLASSIFIER_LABEL_PATH", DIAGNOSIS_ASSET_DIR / "label_encoder_5class.pkl")
)
CLASSIFIER_POLICY_PATH = Path(
    os.getenv("OMNITRIAGE_CLASSIFIER_POLICY_PATH", DIAGNOSIS_ASSET_DIR / "classifier_policy_temp.json")
)
OVERRIDE_DINO_MODEL_NAME = os.getenv("OMNITRIAGE_DINO_MODEL_NAME")
CLASSIFIER_ENABLED = os.getenv("OMNITRIAGE_CLASSIFIER_ENABLED", "true").lower() not in {"0", "false", "no"}
DINO_MODEL_BY_FEATURE_DIM = {
    384: "facebook/dinov2-small",
    768: "facebook/dinov2-base",
    1024: "facebook/dinov2-large",
    1536: "facebook/dinov2-giant",
}


def _resolve_photo_path(incident: IncidentInput) -> Path | None:
    if not incident.photo_evidence or not incident.photo_evidence.storage_path:
        return None

    candidate_paths = [
        UPLOAD_ROOT / Path(incident.photo_evidence.storage_path).name,
        Path(__file__).resolve().parents[2] / incident.photo_evidence.storage_path,
    ]
    for path in candidate_paths:
        if path.exists():
            return path
    return None


@lru_cache(maxsize=1)
def load_classifier_policy() -> dict[str, Any]:
    if not CLASSIFIER_POLICY_PATH.exists():
        return {
            "known_visual_classes": [],
            "confidence_thresholds": {"high": 0.95, "medium_min": 0.8, "low_max_exclusive": 0.8},
            "usage_rules": {
                "non_hardware_or_screenshot": "bypass_classifier",
                "hardware_high": "strong_fault_hint",
                "hardware_medium": "weak_fault_hint_needs_confirmation",
                "hardware_low": "do_not_trust_classifier_alone",
            },
        }
    return json.loads(CLASSIFIER_POLICY_PATH.read_text(encoding="utf-8"))


def classifier_runtime_ready() -> tuple[bool, str | None]:
    if not CLASSIFIER_ENABLED:
        return False, "disabled_by_config"
    if not CLASSIFIER_MODEL_PATH.exists() or not CLASSIFIER_LABEL_PATH.exists():
        return False, "missing_model_assets"
    try:
        import numpy  # noqa: F401
        import sklearn  # noqa: F401
        import torch  # noqa: F401
        from PIL import Image  # noqa: F401
        from transformers import AutoImageProcessor, AutoModel  # noqa: F401
    except Exception as exc:  # noqa: BLE001
        return False, f"runtime_unavailable:{exc!s}"
    return True, None


@lru_cache(maxsize=1)
def _load_classifier_bundle():
    classifier = joblib.load(CLASSIFIER_MODEL_PATH)
    label_encoder = joblib.load(CLASSIFIER_LABEL_PATH)
    return classifier, label_encoder


@lru_cache(maxsize=1)
def resolve_dino_model_name() -> str:
    if OVERRIDE_DINO_MODEL_NAME:
        return OVERRIDE_DINO_MODEL_NAME
    classifier, _ = _load_classifier_bundle()
    expected_features = int(getattr(classifier, "n_features_in_", 0))
    return DINO_MODEL_BY_FEATURE_DIM.get(expected_features, "facebook/dinov2-base")


@lru_cache(maxsize=1)
def _load_dino_runtime():
    from transformers import AutoImageProcessor, AutoModel

    model_name = resolve_dino_model_name()
    try:
        processor = AutoImageProcessor.from_pretrained(model_name, local_files_only=True)
        model = AutoModel.from_pretrained(model_name, local_files_only=True)
    except OSError:
        processor = AutoImageProcessor.from_pretrained(model_name)
        model = AutoModel.from_pretrained(model_name)
    model.eval()
    return processor, model


def _extract_embedding(image_path: Path):
    import numpy as np
    import torch
    from PIL import Image

    processor, model = _load_dino_runtime()

    with Image.open(image_path) as image:
        image = image.convert("RGB")
        inputs = processor(images=image, return_tensors="pt")

    with torch.no_grad():
        outputs = model(**inputs)

    if getattr(outputs, "pooler_output", None) is not None:
        embedding = outputs.pooler_output[0].detach().cpu().numpy()
    else:
        embedding = outputs.last_hidden_state[:, 0].detach().cpu().numpy()[0]
    return np.asarray([embedding])


def _classify_hardware_image(image_path: Path) -> tuple[str, float, list[str]]:
    classifier, label_encoder = _load_classifier_bundle()
    embedding = _extract_embedding(image_path)
    probabilities = classifier.predict_proba(embedding)[0]
    best_index = int(probabilities.argmax())
    predicted_label = str(label_encoder.inverse_transform([best_index])[0])
    candidate_labels = [str(label) for label in getattr(label_encoder, "classes_", [])]
    return predicted_label, clamp_score(float(probabilities[best_index])), candidate_labels


def classifier_policy_action(confidence_score: float) -> str:
    thresholds = load_classifier_policy().get("confidence_thresholds", {})
    usage_rules = load_classifier_policy().get("usage_rules", {})
    if confidence_score >= float(thresholds.get("high", 0.95)):
        return str(usage_rules.get("hardware_high", "strong_fault_hint"))
    if confidence_score >= float(thresholds.get("medium_min", 0.8)):
        return str(usage_rules.get("hardware_medium", "weak_fault_hint_needs_confirmation"))
    return str(usage_rules.get("hardware_low", "do_not_trust_classifier_alone"))


def visual_label_to_issue_type(label: str) -> IssueType:
    mapping: dict[str, IssueType] = {
        "burnt_mark": "tripping_mcb_rccb",
        "cable_termination_issue": "tripping_mcb_rccb",
        "mcb_tripped": "tripping_mcb_rccb",
        "tnb_fuse_blow": "no_power",
        "tapping_tnb_meter": "no_power",
    }
    return mapping.get(label, "not_responding")


def visual_label_to_fault(label: str) -> str:
    mapping = {
        "burnt_mark": "Burnt connector or termination mark",
        "cable_termination_issue": "Cable termination issue or loose connector",
        "mcb_tripped": "MCB trip or upstream protective device issue",
        "tnb_fuse_blow": "Utility fuse or upstream supply failure",
        "tapping_tnb_meter": "Upstream meter or tapping issue",
    }
    return mapping.get(label, "Hardware issue requires confirmation")


def visual_label_severity(label: str) -> SeverityLevel:
    if label == "burnt_mark":
        return SeverityLevel.CRITICAL
    if label in {"cable_termination_issue", "mcb_tripped", "tnb_fuse_blow"}:
        return SeverityLevel.HIGH
    return SeverityLevel.MODERATE


def analyze_hardware_visual_branch(incident: IncidentInput) -> DiagnosisProviderResponse:
    basic_conditions = infer_basic_conditions(incident)
    incident_text = text_blob(incident)
    runtime_ready, runtime_reason = classifier_runtime_ready()
    image_path = _resolve_photo_path(incident)

    if image_path is None:
        raise RuntimeError("hardware_visual_branch requires uploaded photo evidence")
    if not runtime_ready:
        raise RuntimeError(f"hardware_visual_branch unavailable: {runtime_reason}")

    predicted_label, predicted_probability, candidate_labels = _classify_hardware_image(image_path)
    policy_action = classifier_policy_action(predicted_probability)
    issue_type = visual_label_to_issue_type(predicted_label)
    likely_fault = visual_label_to_fault(predicted_label)
    hazard_flags = extract_visible_hazard_flags(incident_text, basic_conditions)
    if predicted_label == "burnt_mark" and "visible_hazard" not in hazard_flags:
        hazard_flags.append("visible_hazard")

    confidence_score = predicted_probability
    if policy_action == "do_not_trust_classifier_alone":
        issue_type = "not_responding" if basic_conditions.indicator_or_error_code == "problem" else issue_type
        likely_fault = likely_fault_for(issue_type, basic_conditions)
        if not basic_conditions.indicator_detail and incident.error_code:
            basic_conditions = make_basic_conditions(
                main_power_supply=basic_conditions.main_power_supply,
                cable_condition=basic_conditions.cable_condition,
                indicator_or_error_code=basic_conditions.indicator_or_error_code,
                indicator_detail=incident.error_code,
            )

    provider_summary = (
        f"Hardware visual branch classified the charger image as '{predicted_label}' with "
        f"{predicted_probability:.0%} confidence; classifier policy action is '{policy_action}'."
    )
    next_question_hint = (
        "Confirm organizer basic checks and collect additional context before trusting the hardware classifier signal."
        if policy_action != "strong_fault_hint"
        else None
    )
    next_action_hint = (
        "Use the organizer branch actions as the primary workflow; treat the visual classification as a supporting signal."
    )

    return DiagnosisProviderResponse(
        provider_summary=provider_summary,
        issue_type=issue_type,
        likely_fault=likely_fault,
        confidence_score=confidence_score,
        raw_ocr_text=incident.error_code or "",
        severity=visual_label_severity(predicted_label)
        if policy_action == "strong_fault_hint"
        else severity_for(issue_type, basic_conditions, hazard_flags, confidence_score),
        basic_conditions=basic_conditions,
        hazard_flags=hazard_flags,
        diagnosis_source="hardware_visual_classifier",
        branch_name="hardware_visual_branch",
        next_question_hint=next_question_hint,
        next_action_hint=next_action_hint,
        classifier_metadata={
            "enabled": True,
            "used": True,
            "bypassed": False,
            "model_name": resolve_dino_model_name(),
            "predicted_label": predicted_label,
            "predicted_probability": predicted_probability,
            "confidence_policy_action": policy_action,
            "candidate_labels": candidate_labels,
            "extra": {
                "image_path": str(image_path),
            },
        },
        ocr_metadata=None,
    )
