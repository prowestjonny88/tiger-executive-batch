from __future__ import annotations

import hashlib
import os
from pathlib import Path
from typing import Protocol

from app.services.gemini_client import get_gemini_client

EMBEDDING_DIMENSION = 256


class EmbeddingProvider(Protocol):
    name: str
    mode: str

    def embed_text(self, text: str) -> list[float]: ...

    def embed_image(self, image_path: Path) -> list[float]: ...

    def embed_case(self, text: str, image_path: Path | None = None) -> list[float]: ...


def _digest_to_unit_vector(payload: bytes) -> list[float]:
    digest = hashlib.sha256(payload).digest()
    values: list[float] = []
    while len(values) < EMBEDDING_DIMENSION:
        for byte in digest:
            values.append((byte / 127.5) - 1.0)
            if len(values) == EMBEDDING_DIMENSION:
                break
        digest = hashlib.sha256(digest).digest()
    return values


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    dot = sum(a * b for a, b in zip(left, right))
    left_norm = sum(a * a for a in left) ** 0.5
    right_norm = sum(b * b for b in right) ** 0.5
    if left_norm == 0 or right_norm == 0:
        return 0.0
    return max(min(dot / (left_norm * right_norm), 1.0), -1.0)


def _project_vector(values: list[float], target_dimension: int = EMBEDDING_DIMENSION) -> list[float]:
    if len(values) == target_dimension:
        return [float(value) for value in values]
    if not values:
        return [0.0] * target_dimension
    if len(values) < target_dimension:
        padded = [float(value) for value in values]
        padded.extend([0.0] * (target_dimension - len(values)))
        return padded

    projected: list[float] = []
    stride = len(values) / target_dimension
    for index in range(target_dimension):
        start = int(index * stride)
        end = int((index + 1) * stride)
        bucket = values[start:max(end, start + 1)]
        projected.append(sum(float(value) for value in bucket) / len(bucket))
    return projected


class HashEmbeddingProvider:
    name = "hash_embedding_provider"
    mode = "deterministic_fallback"

    def embed_text(self, text: str) -> list[float]:
        normalized = " ".join(text.strip().lower().split()) or "<empty>"
        return _digest_to_unit_vector(normalized.encode("utf-8"))

    def embed_image(self, image_path: Path) -> list[float]:
        if not image_path.exists():
            return self.embed_text(f"missing-image::{image_path.name}")
        sample = image_path.read_bytes()[:16384]
        payload = len(sample).to_bytes(4, "big", signed=False) + b"::" + sample
        return _digest_to_unit_vector(payload)

    def embed_case(self, text: str, image_path: Path | None = None) -> list[float]:
        text_vector = self.embed_text(text)
        if image_path is None:
            return text_vector
        image_vector = self.embed_image(image_path)
        return [(left + right) / 2.0 for left, right in zip(text_vector, image_vector)]


class GeminiEmbeddingProvider:
    name = "gemini_embedding_provider"
    mode = "gemini_optional"

    def __init__(self, fallback: EmbeddingProvider | None = None) -> None:
        self._fallback = fallback or HashEmbeddingProvider()

    def embed_text(self, text: str) -> list[float]:
        client = get_gemini_client()
        if client is None:
            return self._fallback.embed_text(text)
        try:
            response = client.models.embed_content(  # type: ignore[attr-defined]
                model="gemini-embedding-001",
                contents=text,
            )
            values = list(getattr(response.embeddings[0], "values", []))
            if values:
                return _project_vector(values)
        except Exception:
            return self._fallback.embed_text(text)
        return self._fallback.embed_text(text)

    def embed_image(self, image_path: Path) -> list[float]:
        return self._fallback.embed_image(image_path)

    def embed_case(self, text: str, image_path: Path | None = None) -> list[float]:
        return self._fallback.embed_case(text, image_path)


def get_embedding_provider() -> EmbeddingProvider:
    provider_name = os.getenv("OMNITRIAGE_EMBEDDING_PROVIDER", "hash").strip().lower()
    if provider_name == "gemini":
        return GeminiEmbeddingProvider()
    return HashEmbeddingProvider()
