from __future__ import annotations

import re


def normalize_serial(value: str | None) -> str | None:
    """Normalize charger serial numbers for evaluation comparison."""
    if value is None:
        return None
    normalized = re.sub(r"[^A-Za-z0-9]", "", value.strip().upper())
    return normalized or None


def normalize_brand_model(value: str | None) -> str | None:
    """Normalize charger brand/model text without collapsing unrelated words."""
    if value is None:
        return None
    text = value.strip().lower()
    text = text.replace(".", "")
    text = re.sub(r"[-_]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip() or None
