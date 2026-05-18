from __future__ import annotations

from pathlib import Path
from unittest.mock import MagicMock
from uuid import uuid4

from app.core.models import StoredPhotoEvidence
from app.services import storage


TEST_UPLOAD_ROOT = Path(__file__).parent / "test-uploads"


def _test_dir(name: str) -> Path:
    path = TEST_UPLOAD_ROOT / f"{name}-{uuid4().hex}"
    path.mkdir(parents=True, exist_ok=True)
    return path


def test_local_store_and_read_photo_bytes(monkeypatch):
    upload_root = _test_dir("storage-local")
    monkeypatch.setenv("STORAGE_BACKEND", "local")
    monkeypatch.setenv("UPLOAD_ROOT", str(upload_root))

    evidence = storage.store_photo_bytes(
        content=b"image-bytes",
        filename="charger photo.png",
        media_type="image/png",
    )

    assert evidence.storage_provider == "local"
    assert evidence.storage_key is not None
    assert evidence.storage_key.startswith("incidents/")
    assert evidence.storage_path.startswith("uploads/incidents/")
    assert storage.read_photo_bytes(evidence) == b"image-bytes"


def test_gcs_store_and_read_photo_bytes(monkeypatch):
    monkeypatch.setenv("STORAGE_BACKEND", "gcs")
    monkeypatch.setenv("GCS_BUCKET", "rexharge-uploads-test")
    monkeypatch.setenv("GCS_UPLOAD_PREFIX", "incidents")

    uploaded: dict[str, object] = {}
    blob = MagicMock()
    blob.exists.return_value = True
    blob.download_as_bytes.return_value = b"gcs-bytes"
    blob.content_type = "image/jpeg"

    def upload_from_string(content: bytes, content_type: str) -> None:
        uploaded["content"] = content
        uploaded["content_type"] = content_type

    blob.upload_from_string.side_effect = upload_from_string
    bucket = MagicMock()
    bucket.blob.return_value = blob
    client = MagicMock()
    client.bucket.return_value = bucket
    monkeypatch.setattr(storage, "_gcs_client", lambda: client)

    evidence = storage.store_photo_bytes(
        content=b"gcs-bytes",
        filename="charger.jpg",
        media_type="image/jpeg",
    )

    assert uploaded == {"content": b"gcs-bytes", "content_type": "image/jpeg"}
    assert evidence.storage_provider == "gcs"
    assert evidence.storage_key is not None
    assert evidence.storage_key.startswith("incidents/")
    assert evidence.storage_path.startswith("gcs://rexharge-uploads-test/incidents/")
    assert evidence.display_url == f"/api/v1/evidence/{evidence.storage_key}"
    assert storage.read_photo_bytes(evidence) == b"gcs-bytes"


def test_read_photo_bytes_supports_existing_absolute_local_path(monkeypatch):
    monkeypatch.setenv("STORAGE_BACKEND", "local")
    image_path = _test_dir("storage-legacy") / "existing.jpg"
    image_path.write_bytes(b"legacy-bytes")

    evidence = StoredPhotoEvidence(
        filename="existing.jpg",
        media_type="image/jpeg",
        storage_path=str(image_path),
        byte_size=image_path.stat().st_size,
    )

    assert storage.read_photo_bytes(evidence) == b"legacy-bytes"
