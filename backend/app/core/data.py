from __future__ import annotations

import csv
import json
from functools import lru_cache
from pathlib import Path
from typing import Any, List

from app.core.models import DemoScenario, SiteCapabilityProfile

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT.parent / "data"
ROUND2_DIR = DATA_DIR / "round2"


def _load_json(relative_path: str):
    return json.loads((DATA_DIR / relative_path).read_text(encoding="utf-8"))


def _load_csv(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


@lru_cache(maxsize=1)
def load_sites() -> List[SiteCapabilityProfile]:
    return [SiteCapabilityProfile.model_validate(item) for item in _load_json("sites/sites.json")]


@lru_cache(maxsize=1)
def load_demo_scenarios() -> List[DemoScenario]:
    scenario_path = DATA_DIR / "demo" / "scenarios.json"
    if not scenario_path.exists():
        return []
    return [DemoScenario.model_validate(item) for item in _load_json("demo/scenarios.json")]


@lru_cache(maxsize=1)
def load_round2_manifest() -> list[dict[str, str]]:
    return _load_csv(ROUND2_DIR / "manifest.csv")


@lru_cache(maxsize=1)
def load_theme2_rules_payload() -> dict[str, Any]:
    rules_path = ROUND2_DIR / "theme2_rules.json"
    return json.loads(rules_path.read_text(encoding="utf-8"))
