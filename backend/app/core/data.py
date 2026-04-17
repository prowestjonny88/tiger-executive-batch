from __future__ import annotations

import csv
import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List

import yaml

from app.core.models import DemoScenario, KnowledgeSnippet, SiteCapabilityProfile

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT.parent / "data"
ROUND1_DIR = DATA_DIR / "round1"


def _load_json(relative_path: str):
    return json.loads((DATA_DIR / relative_path).read_text(encoding="utf-8"))


def _load_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


@lru_cache(maxsize=1)
def load_sites() -> List[SiteCapabilityProfile]:
    return [SiteCapabilityProfile.model_validate(item) for item in _load_json("sites/sites.json")]


@lru_cache(maxsize=1)
def load_snippets() -> List[KnowledgeSnippet]:
    snippet_path = DATA_DIR / "kb" / "snippets.json"
    if not snippet_path.exists():
        return []
    return [KnowledgeSnippet.model_validate(item) for item in _load_json("kb/snippets.json")]


@lru_cache(maxsize=1)
def load_demo_scenarios() -> List[DemoScenario]:
    scenario_path = DATA_DIR / "demo" / "scenarios.json"
    if not scenario_path.exists():
        return []
    items = _load_json("demo/scenarios.json")
    scenarios: list[DemoScenario] = []
    for item in items:
        normalized = {
            **item,
            "expected_issue_family": item.get("expected_issue_family") or item.get("expected_issue_type", "unknown_mixed"),
            "expected_resolver_tier": item.get("expected_resolver_tier") or ("remote_ops" if item.get("expected_outcome") == "escalate" else "driver"),
        }
        scenarios.append(DemoScenario.model_validate(normalized))
    return scenarios


@lru_cache(maxsize=1)
def load_round1_manifest() -> list[dict[str, str]]:
    return _load_csv(ROUND1_DIR / "manifest.csv")


@lru_cache(maxsize=1)
def load_round1_roi_annotations() -> list[dict[str, str]]:
    return _load_csv(ROUND1_DIR / "roi_annotations.csv")


@lru_cache(maxsize=1)
def load_round1_roi_ontology() -> list[dict[str, str]]:
    return _load_csv(ROUND1_DIR / "roi_ontology.csv")


@lru_cache(maxsize=1)
def load_round1_roi_label_normalization() -> list[dict[str, str]]:
    return _load_csv(ROUND1_DIR / "roi_label_normalization.csv")


@lru_cache(maxsize=1)
def load_round1_label_map() -> dict[str, Any]:
    return yaml.safe_load((ROUND1_DIR / "label_map.yaml").read_text(encoding="utf-8")) or {}


@lru_cache(maxsize=1)
def load_round1_known_cases() -> list[dict[str, Any]]:
    path = ROUND1_DIR / "known_cases_seed.jsonl"
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                rows.append(json.loads(line))
    return rows


@lru_cache(maxsize=1)
def round1_images_dir() -> Path:
    return ROUND1_DIR / "images"


def clear_round1_caches() -> None:
    load_round1_manifest.cache_clear()
    load_round1_roi_annotations.cache_clear()
    load_round1_roi_ontology.cache_clear()
    load_round1_roi_label_normalization.cache_clear()
    load_round1_label_map.cache_clear()
    load_round1_known_cases.cache_clear()
    round1_images_dir.cache_clear()

