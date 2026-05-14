from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any, cast

from app.core.data import (
    load_round1_known_cases,
    load_round1_label_map,
    load_round1_manifest,
    load_round1_roi_annotations,
    round1_images_dir,
)
from app.core.models import EvidenceType, KnownCaseHit


def _split_abnormalities(raw: Any) -> list[str]:
    if isinstance(raw, list):
        return [str(item).strip() for item in raw if str(item).strip()]
    return [part.strip() for part in str(raw or "").split(";") if part.strip()]


def _infer_evidence_type(row: dict[str, Any]) -> str:
    explicit = str(row.get("evidence_type", "")).strip()
    if explicit:
        return explicit

    component_primary = str(row.get("component_primary", "")).strip().lower()
    source_type = str(row.get("source_type", "")).strip().lower()
    filename = str(row.get("canonical_file_name", "")).strip().lower()
    modality = str(row.get("modality", "")).strip().lower()

    if component_primary == "app_screen" or "apps" in filename or "error logs" in filename:
        return "screenshot"
    if "no pulse" in filename or "red indicator" in filename:
        return "symptom_heavy_photo"
    if modality == "photo" or source_type or component_primary:
        return "hardware_photo"
    return "unknown"


def _normalize_case(row: dict[str, Any]) -> KnownCaseHit:
    return KnownCaseHit(
        canonical_file_name=row["canonical_file_name"],
        match_score=float(row.get("match_score", 1.0) or 1.0),
        fault_type=row.get("fault_type", "unknown_fault"),
        issue_family=row.get("issue_family", "unknown_mixed"),
        evidence_type=cast(EvidenceType, _infer_evidence_type(row)),
        hazard_level=row.get("hazard_level", "medium"),
        resolver_tier=row.get("resolver_tier", "remote_ops"),
        recommended_next_step=row.get("recommended_next_step", "Collect clearer evidence and review remotely."),
        required_proof_next=row.get("required_proof_next", "Capture a wider proof photo."),
        visual_observation=row.get("visual_observation", "No visual observation provided."),
        engineering_rationale=row.get("engineering_rationale"),
        match_reason=row.get("match_reason", "round1_seed_case"),
        component_primary=row.get("component_primary"),
        visible_abnormalities=_split_abnormalities(row.get("visible_abnormalities")),
        retrieval_source=row.get("retrieval_source", "package_seed"),
    )


@lru_cache(maxsize=1)
def round1_known_cases() -> list[KnownCaseHit]:
    seeded = load_round1_known_cases()
    if seeded:
        return [_normalize_case({**row, "match_reason": row.get("match_reason", "seeded_known_case")}) for row in seeded]

    label_map = load_round1_label_map().get("fault_type_defaults", {})
    cases: list[KnownCaseHit] = []
    for row in load_round1_manifest():
        family_defaults = label_map.get(Path(row["canonical_file_name"]).stem.split(" (")[0], {})
        cases.append(
            _normalize_case(
                {
                    **row,
                    "evidence_type": family_defaults.get("evidence_type", row.get("modality", "unknown")),
                    "match_reason": "manifest_fallback",
                }
            )
        )
    return cases


@lru_cache(maxsize=1)
def round1_known_case_map() -> dict[str, KnownCaseHit]:
    return {case.canonical_file_name: case for case in round1_known_cases()}


@lru_cache(maxsize=1)
def round1_roi_by_file() -> dict[str, list[dict[str, str]]]:
    grouped: dict[str, list[dict[str, str]]] = {}
    for row in load_round1_roi_annotations():
        grouped.setdefault(row["canonical_file_name"], []).append(row)
    return grouped


def round1_image_path(filename: str) -> Path | None:
    candidate = round1_images_dir() / filename
    return candidate if candidate.exists() else None


def round1_case_text(case: KnownCaseHit) -> str:
    roi_labels = [row.get("category_name", "") for row in round1_roi_by_file().get(case.canonical_file_name, [])]
    parts = [
        case.canonical_file_name,
        case.issue_family,
        case.fault_type,
        case.hazard_level,
        case.resolver_tier,
        case.visual_observation,
        case.engineering_rationale or "",
        case.recommended_next_step,
        case.required_proof_next,
        " ".join(case.visible_abnormalities),
        " ".join(label for label in roi_labels if label),
    ]
    return " | ".join(part for part in parts if part)


@lru_cache(maxsize=1)
def round1_case_text_index() -> dict[str, str]:
    return {case.canonical_file_name: round1_case_text(case) for case in round1_known_cases()}
