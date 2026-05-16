from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from scripts.promote_manual_review_to_eval import main, promoted_eval_cases  # noqa: E402


def _script_test_dir(name: str) -> Path:
    path = Path(__file__).parent / "test-uploads" / "manual-review" / name
    shutil.rmtree(path, ignore_errors=True)
    path.mkdir(parents=True)
    return path


def test_promoted_eval_cases_only_include_reviewed_include_eval():
    payload = {
        "cases": [
            {
                "file_id": "abcdef1234567890",
                "relative_path": "Isolator/reviewed.jpg",
                "manual_review_status": "reviewed_include_eval",
                "manual_final_input_component": "isolator",
                "manual_final_observation": "isolator_off_open_circuit",
                "manual_final_fault_type": "power_cut",
                "manual_final_recipient": "customer",
                "manual_review_notes": "Switch visibly OFF.",
            },
            {
                "file_id": "pending",
                "relative_path": "Isolator/pending.jpg",
                "manual_review_status": "pending_manual_review",
            },
        ]
    }

    cases = promoted_eval_cases(payload)

    assert len(cases) == 1
    assert cases[0]["case_id"] == "manual_review_abcdef123456"
    assert cases[0]["case_type"] == "image"
    assert cases[0]["observation_expected"] == "isolator_off_open_circuit"
    assert cases[0]["fault_type_expected"] == "power_cut"


def test_promote_script_does_not_overwrite_main_eval_by_default(monkeypatch):
    tmp_path = _script_test_dir("default-output")
    manual_path = tmp_path / "manual_review_cases.json"
    output_path = tmp_path / "evaluation_cases.reviewed.json"
    base_eval_path = tmp_path / "evaluation_cases.json"
    base_eval_path.write_text('[{"case_id": "base"}]\n', encoding="utf-8")
    manual_path.write_text(
        json.dumps(
            {
                "cases": [
                    {
                        "file_id": "abcdef1234567890",
                        "relative_path": "Isolator/reviewed.jpg",
                        "manual_review_status": "reviewed_include_eval",
                        "manual_final_input_component": "isolator",
                        "manual_final_observation": "isolator_on",
                        "manual_final_fault_type": "unknown",
                        "manual_final_recipient": "customer",
                    }
                ]
            }
        ),
        encoding="utf-8",
    )

    monkeypatch.setattr(
        sys,
        "argv",
        [
            "promote_manual_review_to_eval.py",
            "--input",
            str(manual_path),
            "--base-eval",
            str(base_eval_path),
            "--output",
            str(output_path),
        ],
    )

    main()

    assert json.loads(base_eval_path.read_text(encoding="utf-8")) == [{"case_id": "base"}]
    reviewed = json.loads(output_path.read_text(encoding="utf-8"))
    assert len(reviewed) == 1
    shutil.rmtree(tmp_path, ignore_errors=True)
