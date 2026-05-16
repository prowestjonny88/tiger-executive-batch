from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = REPO_ROOT / "data" / "round2" / "manual_review_cases.json"
DEFAULT_BASE_EVAL = REPO_ROOT / "data" / "round2" / "evaluation_cases.json"
DEFAULT_OUTPUT = REPO_ROOT / "data" / "round2" / "evaluation_cases.reviewed.json"
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi"}


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8-sig") as handle:
        return json.load(handle)


def write_json(payload: Any, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def reviewed_cases(payload: dict[str, Any]) -> list[dict[str, Any]]:
    return [
        case
        for case in payload.get("cases", [])
        if case.get("manual_review_status") == "reviewed_include_eval"
    ]


def _required_manual_value(case: dict[str, Any], field: str) -> str:
    value = case.get(field)
    if not isinstance(value, str) or not value.strip():
        relative_path = case.get("relative_path") or case.get("file_id") or "unknown"
        raise ValueError(f"{relative_path} is reviewed_include_eval but missing {field}")
    return value.strip()


def convert_case(case: dict[str, Any]) -> dict[str, Any]:
    relative_path = str(case.get("relative_path") or "")
    if not relative_path:
        raise ValueError(f"{case.get('file_id') or 'unknown'} is reviewed_include_eval but missing relative_path")
    if Path(relative_path).suffix.lower() in VIDEO_EXTENSIONS:
        raise ValueError(f"{relative_path} is a video; extract a frame before promoting to evaluation")

    file_id = str(case.get("file_id") or Path(relative_path).stem)
    return {
        "case_id": f"manual_review_{file_id[:12]}",
        "relative_path": relative_path,
        "case_type": "image",
        "input_component_expected": _required_manual_value(case, "manual_final_input_component"),
        "observation_expected": _required_manual_value(case, "manual_final_observation"),
        "fault_type_expected": _required_manual_value(case, "manual_final_fault_type"),
        "recipient_expected": _required_manual_value(case, "manual_final_recipient"),
        "serial_number_expected": case.get("manual_serial_number_expected"),
        "brand_model_expected": case.get("manual_brand_model_expected"),
        "follow_up_answers": {},
        "symptom_text": "",
        "notes": str(case.get("manual_review_notes") or "Human-reviewed Round 2 manual review case."),
    }


def promoted_eval_cases(manual_payload: dict[str, Any]) -> list[dict[str, Any]]:
    return [convert_case(case) for case in reviewed_cases(manual_payload)]


def merge_cases(base_cases: list[dict[str, Any]], additions: list[dict[str, Any]]) -> list[dict[str, Any]]:
    by_case_id = {str(case.get("case_id")): case for case in base_cases}
    for case in additions:
        by_case_id[str(case["case_id"])] = case
    return list(by_case_id.values())


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Promote reviewed manual Round 2 cases into evaluation case format.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    parser.add_argument("--base-eval", type=Path, default=DEFAULT_BASE_EVAL)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Merge promoted cases into --base-eval and overwrite that file. Without this, write only reviewed cases to --output.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    promoted = promoted_eval_cases(load_json(args.input))
    if args.replace:
        base_cases = load_json(args.base_eval) if args.base_eval.exists() else []
        output_path = args.base_eval
        output_cases = merge_cases(base_cases, promoted)
    else:
        output_path = args.output
        output_cases = promoted
    write_json(output_cases, output_path)
    print(f"Wrote {len(output_cases)} cases to {output_path}")
    print(f"Promoted reviewed cases: {len(promoted)}")


if __name__ == "__main__":
    main()
