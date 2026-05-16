from __future__ import annotations

import sys
from pathlib import Path
import shutil


REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from scripts.pseudo_label_round2_with_theme2 import choose_output_path, rows_for_rerun, rows_for_resume  # noqa: E402


def _script_test_dir(name: str) -> Path:
    path = Path(__file__).parent / "test-uploads" / "pseudo-label-script" / name
    shutil.rmtree(path, ignore_errors=True)
    path.mkdir(parents=True)
    return path


def test_choose_output_path_does_not_overwrite_existing_without_replace():
    tmp_path = _script_test_dir("no-overwrite")
    output = tmp_path / "pseudo_labels.jsonl"
    output.write_text("existing\n", encoding="utf-8")

    chosen = choose_output_path(output, replace=False, mode_label="resume")

    assert chosen != output
    assert chosen.name.startswith("pseudo_labels.resume-")
    assert output.read_text(encoding="utf-8") == "existing\n"


def test_choose_output_path_allows_explicit_replace():
    tmp_path = _script_test_dir("replace")
    output = tmp_path / "pseudo_labels.jsonl"
    output.write_text("existing\n", encoding="utf-8")

    assert choose_output_path(output, replace=True, mode_label="rerun") == output


def test_rows_for_resume_returns_only_missing_manifest_rows():
    manifest_rows = [{"file_id": "a"}, {"file_id": "b"}, {"file_id": "c"}]
    existing = [{"file_id": "a"}, {"file_id": "c"}]

    assert rows_for_resume(manifest_rows, existing) == [{"file_id": "b"}]


def test_rows_for_rerun_preserves_good_rows_and_selects_error_rows():
    manifest_rows = [{"file_id": "a"}, {"file_id": "b"}, {"file_id": "c"}]
    existing = [
        {"file_id": "a", "status": "auto_accept", "perception_error_type": None},
        {"file_id": "b", "status": "low_confidence_review_needed", "perception_error_type": "schema_mismatch"},
        {"file_id": "c", "status": "frame_extraction_needed", "perception_error_type": "text_only_no_photo"},
    ]

    rerun_rows, preserved = rows_for_rerun(manifest_rows, existing, statuses=set(), errors={"schema_mismatch"})

    assert rerun_rows == [{"file_id": "b"}]
    assert preserved == [existing[0], existing[2]]
