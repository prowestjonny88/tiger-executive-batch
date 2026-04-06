from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import List

from app.core.models import DemoScenario, KnowledgeSnippet, SiteCapabilityProfile

ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT.parent / "data"


def _load_json(relative_path: str):
    return json.loads((DATA_DIR / relative_path).read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def load_sites() -> List[SiteCapabilityProfile]:
    return [SiteCapabilityProfile.model_validate(item) for item in _load_json("sites/sites.json")]


@lru_cache(maxsize=1)
def load_snippets() -> List[KnowledgeSnippet]:
    return [KnowledgeSnippet.model_validate(item) for item in _load_json("kb/snippets.json")]


@lru_cache(maxsize=1)
def load_demo_scenarios() -> List[DemoScenario]:
    return [DemoScenario.model_validate(item) for item in _load_json("demo/scenarios.json")]
