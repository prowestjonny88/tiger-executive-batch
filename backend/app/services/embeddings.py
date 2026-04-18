from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from typing import Protocol

from app.services.gemini_client import get_gemini_client

EMBEDDING_DIMENSION = 256


class EmbeddingProvider(Protocol):
    @property
    def name(self) -> str: ...

    @property
    def mode(self) -> str: ...

    @property
    def image_mode(self) -> str: ...

    @property
    def semantic_image_enabled(self) -> bool: ...

    @property
    def exact_image_fingerprint_enabled(self) -> bool: ...

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
    image_mode = "exact_image_fingerprint_only"
    semantic_image_enabled = False
    exact_image_fingerprint_enabled = True

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

    def __init__(self, fallback: EmbeddingProvider | None = None) -> None:
        self._fallback = fallback or HashEmbeddingProvider()
        self._image_vector_cache: dict[tuple[str, int, int], list[float]] = {}

    @property
    def semantic_image_enabled(self) -> bool:
        return get_gemini_client() is not None

    @property
    def exact_image_fingerprint_enabled(self) -> bool:
        return True

    @property
    def image_mode(self) -> str:
        if self.semantic_image_enabled:
            return "semantic_gemini_descriptor"
        return "exact_image_fingerprint_only"

    @property
    def mode(self) -> str:
        if get_gemini_client() is not None:
            return "gemini_text_image_hybrid"
        return "gemini_text_unavailable_fallback"

    def _embed_text_with_client(self, text: str) -> list[float] | None:
        client = get_gemini_client()
        if client is None:
            return None
        try:
            response = client.models.embed_content(  # type: ignore[attr-defined]
                model="gemini-embedding-001",
                contents=text,
            )
            values = list(getattr(response.embeddings[0], "values", []))
            if values:
                return _project_vector(values)
        except Exception:
            return None
        return None

    def _image_cache_key(self, image_path: Path) -> tuple[str, int, int]:
        resolved = image_path.resolve(strict=False)
        try:
            stat = resolved.stat()
            return (str(resolved), stat.st_size, stat.st_mtime_ns)
        except OSError:
            return (str(resolved), 0, 0)

    def _semantic_image_descriptor(self, image_path: Path) -> str | None:
        client = get_gemini_client()
        if client is None or not image_path.exists():
            return None
        try:
            from google.genai import types as genai_types  # type: ignore[import-untyped]
        except ImportError:
            return None
        try:
            response = client.models.generate_content(  # type: ignore[attr-defined]
                model=os.getenv("GEMINI_IMAGE_EMBED_MODEL", os.getenv("GEMINI_MODEL", "gemini-2.0-flash")),
                contents=[
                    genai_types.Part.from_bytes(
                        data=image_path.read_bytes(),
                        mime_type="image/jpeg" if image_path.suffix.lower() in {".jpg", ".jpeg"} else "image/png",
                    ),
                    (
                        "Inspect this image for OmniTriage retrieval. Return JSON only with keys: "
                        "scene_summary, components_visible, visible_abnormalities, ocr_findings, "
                        "hazard_signals, retrieval_keywords. Keep all values short, grounded, and useful for similarity search."
                    ),
                ],
                config=genai_types.GenerateContentConfig(
                    temperature=0.0,
                    max_output_tokens=1024,
                    response_mime_type="application/json",
                ),
            )
            raw = (response.text or "").strip()
            if raw.startswith("```"):
                raw = raw.strip("`")
                raw = raw.split("\n", 1)[-1]
            data = json.loads(raw)
        except Exception:
            return None

        descriptor_parts: list[str] = []
        scene_summary = str(data.get("scene_summary") or "").strip()
        if scene_summary:
            descriptor_parts.append(scene_summary)
        for label in (
            "components_visible",
            "visible_abnormalities",
            "ocr_findings",
            "hazard_signals",
            "retrieval_keywords",
        ):
            values = data.get(label)
            if isinstance(values, list):
                normalized = [str(value).strip() for value in values if str(value).strip()]
            elif isinstance(values, str):
                normalized = [values.strip()] if values.strip() else []
            else:
                normalized = []
            if normalized:
                descriptor_parts.append(f"{label}: {'; '.join(normalized)}")
        descriptor = " | ".join(part for part in descriptor_parts if part).strip()
        return descriptor or None

    def embed_text(self, text: str) -> list[float]:
        embedded = self._embed_text_with_client(text)
        if embedded is not None:
            return embedded
        return self._fallback.embed_text(text)

    def embed_image(self, image_path: Path) -> list[float]:
        if not image_path.exists():
            return self._fallback.embed_image(image_path)
        cache_key = self._image_cache_key(image_path)
        cached = self._image_vector_cache.get(cache_key)
        if cached is not None:
            return list(cached)
        descriptor = self._semantic_image_descriptor(image_path)
        if descriptor:
            embedded = self._embed_text_with_client(descriptor)
            if embedded is not None:
                self._image_vector_cache[cache_key] = list(embedded)
                return embedded
        return self._fallback.embed_image(image_path)

    def embed_case(self, text: str, image_path: Path | None = None) -> list[float]:
        text_vector = self.embed_text(text)
        if image_path is None:
            return text_vector
        image_vector = self.embed_image(image_path)
        return [(left + right) / 2.0 for left, right in zip(text_vector, image_vector)]


def get_embedding_runtime_status(provider: EmbeddingProvider | None = None) -> dict[str, object]:
    resolved_provider = provider or get_embedding_provider()
    app_env = os.getenv("APP_ENV", "development").strip().lower()
    warnings: list[str] = []
    if resolved_provider.name == "hash_embedding_provider" and app_env not in {"development", "dev", "test"}:
        warnings.append("Hash embeddings are active outside development.")
    if not getattr(resolved_provider, "semantic_image_enabled", False) and app_env not in {"development", "dev", "test"}:
        warnings.append("Semantic image embeddings are unavailable; retrieval image scoring is in fallback mode.")
    return {
        "provider_name": resolved_provider.name,
        "provider_mode": resolved_provider.mode,
        "image_mode": resolved_provider.image_mode,
        "semantic_image_enabled": resolved_provider.semantic_image_enabled,
        "retrieval_signal_mode": "hybrid_semantic_image" if resolved_provider.semantic_image_enabled else "perception_driven",
        "exact_image_fingerprint_enabled": resolved_provider.exact_image_fingerprint_enabled,
        "embedding_dimension": EMBEDDING_DIMENSION,
        "warnings": warnings,
    }


def get_embedding_provider() -> EmbeddingProvider:
    provider_name = os.getenv("OMNITRIAGE_EMBEDDING_PROVIDER", "hash").strip().lower()
    if provider_name == "gemini":
        return GeminiEmbeddingProvider()
    return HashEmbeddingProvider()
