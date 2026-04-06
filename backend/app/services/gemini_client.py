"""
Shared Gemini API client initialiser.

Usage
-----
    from app.services.gemini_client import get_gemini_client, GEMINI_MODEL

    client = get_gemini_client()
    if client is None:
        # No API key configured — fall back to heuristic providers
        ...
"""
from __future__ import annotations

import os
from pathlib import Path

# Load .env if present (development convenience)
try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).resolve().parents[2] / ".env"
    load_dotenv(_env_path, override=False)
except ImportError:
    pass

# Lazy import so the app still boots without google-genai installed
try:
    from google import genai as _genai  # type: ignore[import-untyped]
    _genai_available = True
except ImportError:
    _genai_available = False

GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

_client: object | None = None
_client_initialised = False


def get_gemini_client() -> object | None:
    """Return a google.genai.Client or None if no API key is configured."""
    global _client, _client_initialised
    if _client_initialised:
        return _client
    _client_initialised = True

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key or not _genai_available:
        return None

    try:
        _client = _genai.Client(api_key=api_key)  # type: ignore[attr-defined]
    except Exception:
        _client = None
    return _client
