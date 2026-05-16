from __future__ import annotations

import csv
import shutil
import sys
from pathlib import Path

from app.core.models import FaultTypeV2, InputComponent, ObservationResultV2, RecipientType


REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from scripts.build_round2_manifest import MANIFEST_COLUMNS, build_manifest_rows, manifest_summary, unknown_rows, write_manifest  # noqa: E402


def _literal_values(alias) -> set[str]:
    return set(alias.__args__)


def test_manifest_builder_writes_expected_schema_with_relative_paths():
    tmp_path = Path(__file__).parent / "test-uploads" / "manifest-builder"
    shutil.rmtree(tmp_path, ignore_errors=True)


def test_manifest_summary_counts_images_videos_and_unknown_rows():
    tmp_path = Path(__file__).parent / "test-uploads" / "manifest-summary"
    shutil.rmtree(tmp_path, ignore_errors=True)
    images_root = tmp_path / "images"
    (images_root / "Charger" / "Charger Red Light").mkdir(parents=True)
    (images_root / "Charger" / "Charger Red Light" / "red.jpg").write_bytes(b"fake-image")
    (images_root / "Isolator").mkdir(parents=True)
    (images_root / "Isolator" / "switch.jpg").write_bytes(b"fake-image")
    (images_root / "Unexpected").mkdir(parents=True)
    (images_root / "Unexpected" / "unknown.jpg").write_bytes(b"fake-image")
    (images_root / "Unexpected" / "clip.mp4").write_bytes(b"fake-video")

    rows = build_manifest_rows(images_root)
    summary = manifest_summary(rows)

    assert summary["total_rows"] == 4
    assert summary["image_rows"] == 3
    assert summary["video_rows"] == 1
    assert summary["category_counts"]["Isolator"] == 1
    assert summary["observation_counts"]["unknown"] == 3
    assert [row["relative_path"] for row in unknown_rows(rows)] == [
        "Unexpected/clip.mp4",
        "Unexpected/unknown.jpg",
    ]
    shutil.rmtree(tmp_path, ignore_errors=True)
    images_root = tmp_path / "images"
    charger_dir = images_root / "Charger" / "Charger Red Light"
    charger_dir.mkdir(parents=True)
    (charger_dir / "red.jpg").write_bytes(b"fake-image")
    (charger_dir / "blink.mp4").write_bytes(b"fake-video")
    output_path = tmp_path / "manifest.csv"

    rows = build_manifest_rows(images_root)
    write_manifest(rows, output_path)

    with output_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        loaded_rows = list(reader)

    assert output_path.exists()
    assert reader.fieldnames == MANIFEST_COLUMNS
    assert len(loaded_rows) == 2
    assert all(row["relative_path"] and row["file_name"] for row in loaded_rows)
    assert all(":\\" not in row["relative_path"] and not Path(row["relative_path"]).is_absolute() for row in loaded_rows)
    assert any(row["is_video"] == "true" and row["file_extension"] == "mp4" for row in loaded_rows)
    shutil.rmtree(tmp_path, ignore_errors=True)


def test_committed_manifest_uses_theme2_enum_values_and_relative_paths():
    manifest_path = REPO_ROOT / "data" / "round2" / "manifest.csv"
    with manifest_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        rows = list(reader)

    assert manifest_path.exists()
    assert reader.fieldnames == MANIFEST_COLUMNS
    assert rows

    input_components = _literal_values(InputComponent)
    observations = _literal_values(ObservationResultV2)
    fault_types = _literal_values(FaultTypeV2)
    recipients = _literal_values(RecipientType)

    for row in rows:
        assert row["relative_path"]
        assert row["file_name"]
        assert ":\\" not in row["relative_path"]
        assert not row["relative_path"].startswith("/")
        assert not Path(row["relative_path"]).is_absolute()
        assert row["input_component_weak"] in input_components
        assert row["observation_weak"] in observations
        assert row["expected_fault_type_v2"] in fault_types
        assert row["expected_recipient_type"] in recipients

    assert any(row["is_video"] == "true" for row in rows)
