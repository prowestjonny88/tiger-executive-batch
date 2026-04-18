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
import traceback
from pathlib import Path

try:
    from dotenv import load_dotenv
    _env_path = Path(__file__).resolve().parents[2] / ".env"
    load_dotenv(_env_path, override=False)
except ImportError:
    pass

try:
    import google.genai as _genai  # type: ignore[import-untyped]
    _genai_available = True
    _genai_import_error = None
except Exception as exc:
    _genai = None
    _genai_available = False
    _genai_import_error = exc

GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

_client: object | None = None
_client_initialised = False


def get_gemini_client() -> object | None:
    global _client, _client_initialised
    if _client_initialised:
        return _client
    _client_initialised = True

    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("[gemini_client] GEMINI_API_KEY missing or empty")
        return None

    if not _genai_available:
        print(f"[gemini_client] google-genai import failed: {_genai_import_error}")
        return None

    try:
        assert _genai is not None
        _client = _genai.Client(api_key=api_key)
        print("[gemini_client] Gemini client initialized successfully")
    except Exception as exc:
        print(f"[gemini_client] Gemini client init failed: {exc}")
        traceback.print_exc()
        _client = None

    return _client
