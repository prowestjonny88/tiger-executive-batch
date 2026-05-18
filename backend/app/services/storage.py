from __future__ import annotations

import os
import re
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException

from app.core.models import StoredPhotoEvidence

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MEDIA_TYPE_SUFFIXES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def get_upload_root() -> Path:
    return Path(os.getenv("UPLOAD_ROOT", Path(__file__).resolve().parents[2] / "uploads"))


def storage_backend() -> str:
    backend = os.getenv("STORAGE_BACKEND", "local").strip().lower()
    return "gcs" if backend == "gcs" else "local"


def _safe_filename(filename: str, media_type: str) -> str:
    base_name = Path(filename or "incident-photo").name
    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(base_name).stem).strip("-._") or "incident-photo"
    suffix = Path(base_name).suffix.lower() or MEDIA_TYPE_SUFFIXES[media_type]
    return f"{stem}{suffix}"


def _validate_upload(*, content: bytes, media_type: str) -> None:
    if media_type not in MEDIA_TYPE_SUFFIXES:
        raise HTTPException(status_code=400, detail="Unsupported media_type")
    if not content:
        raise HTTPException(status_code=400, detail="Photo payload is empty")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Photo payload exceeds 10MB limit")


def _gcs_bucket_name() -> str:
    bucket = os.getenv("GCS_BUCKET", "").strip()
    if not bucket:
        raise RuntimeError("GCS_BUCKET is required when STORAGE_BACKEND=gcs")
    return bucket


def _gcs_prefix() -> str:
    return os.getenv("GCS_UPLOAD_PREFIX", "incidents").strip().strip("/") or "incidents"


def _gcs_client():
    try:
        from google.cloud import storage as gcs_storage  # type: ignore[import-untyped]
    except ImportError as exc:
        raise RuntimeError("google-cloud-storage is not installed") from exc
    return gcs_storage.Client()


def _validate_storage_key(storage_key: str) -> str:
    key = storage_key.strip().replace("\\", "/").lstrip("/")
    if not key or ".." in key.split("/"):
        raise HTTPException(status_code=400, detail="Invalid evidence storage key")
    return key


def store_photo_bytes(*, content: bytes, filename: str, media_type: str) -> StoredPhotoEvidence:
    _validate_upload(content=content, media_type=media_type)
    stored_name = f"{uuid4().hex}-{_safe_filename(filename, media_type)}"

    if storage_backend() == "gcs":
        bucket_name = _gcs_bucket_name()
        storage_key = f"{_gcs_prefix()}/{stored_name}"
        bucket = _gcs_client().bucket(bucket_name)
        blob = bucket.blob(storage_key)
        blob.upload_from_string(content, content_type=media_type)
        return StoredPhotoEvidence(
            filename=filename or stored_name,
            media_type=media_type,
            storage_path=f"gcs://{bucket_name}/{storage_key}",
            byte_size=len(content),
            storage_provider="gcs",
            storage_key=storage_key,
            display_url=f"/api/v1/evidence/{storage_key}",
        )

    storage_key = f"incidents/{stored_name}"
    stored_path = get_upload_root() / storage_key
    stored_path.parent.mkdir(parents=True, exist_ok=True)
    stored_path.write_bytes(content)
    storage_path = str(Path("uploads") / storage_key).replace("\\", "/")
    return StoredPhotoEvidence(
        filename=filename or stored_name,
        media_type=media_type,
        storage_path=storage_path,
        byte_size=len(content),
        storage_provider="local",
        storage_key=storage_key,
        display_url=f"/{storage_path}",
    )


def _local_photo_path(evidence: StoredPhotoEvidence) -> Path | None:
    storage_path = Path(evidence.storage_path)
    if storage_path.is_absolute() and storage_path.exists():
        return storage_path

    candidates = [
        Path(__file__).resolve().parents[2] / evidence.storage_path,
        get_upload_root() / (evidence.storage_key or ""),
        get_upload_root() / "incidents" / storage_path.name,
        Path(__file__).resolve().parents[3] / evidence.storage_path,
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


def read_photo_bytes(evidence: StoredPhotoEvidence) -> bytes:
    if evidence.storage_provider == "gcs":
        storage_key = evidence.storage_key
        if not storage_key:
            if evidence.storage_path.startswith("gcs://"):
                storage_key = "/".join(evidence.storage_path.split("/", 3)[3:])
            else:
                raise FileNotFoundError("gcs_storage_key_missing")
        bucket = _gcs_client().bucket(_gcs_bucket_name())
        blob = bucket.blob(_validate_storage_key(storage_key))
        if not blob.exists():
            raise FileNotFoundError("gcs_object_not_found")
        return blob.download_as_bytes()

    path = _local_photo_path(evidence)
    if path is None:
        raise FileNotFoundError("local_image_path_unresolved")
    return path.read_bytes()


def read_evidence_object(storage_key: str) -> tuple[bytes, str]:
    key = _validate_storage_key(storage_key)
    if storage_backend() == "gcs":
        bucket = _gcs_client().bucket(_gcs_bucket_name())
        blob = bucket.blob(key)
        if not blob.exists():
            raise FileNotFoundError("gcs_object_not_found")
        return blob.download_as_bytes(), blob.content_type or "application/octet-stream"

    path = get_upload_root() / key
    if not path.exists():
        raise FileNotFoundError("local_evidence_not_found")
    suffix = path.suffix.lower()
    media_type = "image/png" if suffix == ".png" else "image/webp" if suffix == ".webp" else "image/jpeg"
    return path.read_bytes(), media_type
