from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import List

from app.core.models import DemoScenario, KnowledgeSnippet, SiteCapabilityProfile

# -- Path Configuration -- 
# Establishes the root directory of the project
# Points to a data directory one level up from the backend
ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT.parent / "data"

# -- Core Utility Function -- 
# Loads and parses JSON files from the data directory using UTF-8 encoding
def _load_json(relative_path: str):
    return json.loads((DATA_DIR / relative_path).read_text(encoding="utf-8"))

# -- Three Cached Data Loaders --
@lru_cache(maxsize=1)
def load_sites() -> List[SiteCapabilityProfile]:
    return [SiteCapabilityProfile.model_validate(item) for item in _load_json("sites/sites.json")] 
# Loads site capability profiles from sites/sites.json


@lru_cache(maxsize=1)
def load_snippets() -> List[KnowledgeSnippet]:
    return [KnowledgeSnippet.model_validate(item) for item in _load_json("kb/snippets.json")]
# Loads knowledge snippets from kb/snippets.json


@lru_cache(maxsize=1)
def load_demo_scenarios() -> List[DemoScenario]:
    return [DemoScenario.model_validate(item) for item in _load_json("demo/scenarios.json")]
# Loads demo scenarios from demo/scenarios.json


'''
All three loader functions use @lru_cache decorator for performance optimization 
(caching results with a max size of 1), 
and they validate the JSON data against their respective Pydantic models 
(SiteCapabilityProfile, KnowledgeSnippet, DemoScenario).
'''
