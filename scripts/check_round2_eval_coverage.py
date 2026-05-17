from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CASES_PATH = REPO_ROOT / "data" / "round2" / "evaluation_cases.json"

RECOMMENDED_OBSERVATIONS = {
    "charger_red_light": 3,
    "charger_no_light": 2,
    "charger_serial_brand_visible": 3,
    "charger_blinking_red_light": 4,
    "evdb_single_phase": 2,
    "evdb_three_phase": 2,
    "mcb_tripped": 1,
    "missing_mcb_rccb": 1,
    "wrong_component_specs": 1,
    "isolator_on": 1,
    "isolator_off_open_circuit": 2,
}

RECOMMENDED_COMPONENTS = {
    "charger": 8,
    "evdb": 7,
    "isolator": 3,
}

RECOMMENDED_OCR = {
    "serial_number_expected": 3,
    "brand_model_expected": 3,
}


def load_cases(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8-sig") as handle:
        payload = json.load(handle)
    if not isinstance(payload, list):
        raise ValueError("evaluation cases must be a JSON list")
    return payload


def _counter(cases: list[dict[str, Any]], key: str) -> dict[str, int]:
    return dict(Counter(str(case.get(key) or "none") for case in cases))


def build_coverage_report(cases: list[dict[str, Any]]) -> dict[str, Any]:
    case_type_counts = _counter(cases, "case_type")
    component_counts = _counter(cases, "input_component_expected")
    observation_counts = _counter(cases, "observation_expected")
    fault_counts = _counter(cases, "fault_type_expected")
    recipient_counts = _counter(cases, "recipient_expected")
    serial_expected_count = sum(1 for case in cases if case.get("serial_number_expected"))
    brand_expected_count = sum(1 for case in cases if case.get("brand_model_expected"))
    flash_followup_count = sum(
        1
        for case in cases
        if case.get("case_type") == "text_followup"
        and case.get("observation_expected") == "charger_blinking_red_light"
        and "red_light_flash_count" in dict(case.get("follow_up_answers") or {})
    )

    warnings: list[str] = []
    for component, minimum in RECOMMENDED_COMPONENTS.items():
        if component_counts.get(component, 0) < minimum:
            warnings.append(f"input_component_expected {component} has {component_counts.get(component, 0)} cases; recommended {minimum}.")
    for observation, minimum in RECOMMENDED_OBSERVATIONS.items():
        if observation_counts.get(observation, 0) < minimum:
            warnings.append(f"observation_expected {observation} has {observation_counts.get(observation, 0)} cases; recommended {minimum}.")
    if serial_expected_count < RECOMMENDED_OCR["serial_number_expected"]:
        warnings.append(
            "serial_number_expected has "
            f"{serial_expected_count} non-null exact OCR ground truth cases; recommended {RECOMMENDED_OCR['serial_number_expected']}."
        )
    if brand_expected_count < RECOMMENDED_OCR["brand_model_expected"]:
        warnings.append(
            "brand_model_expected has "
            f"{brand_expected_count} non-null exact OCR ground truth cases; recommended {RECOMMENDED_OCR['brand_model_expected']}."
        )
    if flash_followup_count < 4:
        warnings.append(f"blinking-red text follow-up cases have {flash_followup_count}; recommended 4.")

    return {
        "total_cases": len(cases),
        "image_cases": sum(1 for case in cases if (case.get("case_type") or "image") == "image"),
        "text_followup_cases": sum(1 for case in cases if case.get("case_type") == "text_followup"),
        "counts": {
            "case_type": case_type_counts,
            "input_component_expected": component_counts,
            "observation_expected": observation_counts,
            "fault_type_expected": fault_counts,
            "recipient_expected": recipient_counts,
        },
        "ocr_exact_coverage": {
            "serial_number_expected_non_null": serial_expected_count,
            "brand_model_expected_non_null": brand_expected_count,
        },
        "text_followup_flash_count_cases": flash_followup_count,
        "warnings": warnings,
    }


def _status(count: int, minimum: int) -> str:
    return "OK" if count >= minimum else "WARNING"


def print_coverage_report(report: dict[str, Any]) -> None:
    print("Round 2 Eval Coverage")
    print("---------------------")
    print(f"Total cases: {report['total_cases']}")
    print(f"Image cases: {report['image_cases']}")
    print(f"Text follow-up cases: {report['text_followup_cases']}")
    print("")
    print("By input component:")
    component_counts = report["counts"]["input_component_expected"]
    for component, minimum in RECOMMENDED_COMPONENTS.items():
        count = component_counts.get(component, 0)
        print(f"- {component}: {count} {_status(count, minimum)}")
    print("")
    print("By observation:")
    observation_counts = report["counts"]["observation_expected"]
    for observation, minimum in RECOMMENDED_OBSERVATIONS.items():
        count = observation_counts.get(observation, 0)
        print(f"- {observation}: {count} {_status(count, minimum)}")
    print("")
    print("OCR exact coverage:")
    ocr = report["ocr_exact_coverage"]
    serial_count = ocr["serial_number_expected_non_null"]
    brand_count = ocr["brand_model_expected_non_null"]
    print(f"- serial_number_expected non-null: {serial_count} {_status(serial_count, RECOMMENDED_OCR['serial_number_expected'])}")
    print(f"- brand_model_expected non-null: {brand_count} {_status(brand_count, RECOMMENDED_OCR['brand_model_expected'])}")
    if report["warnings"]:
        print("")
        print("Warnings:")
        for warning in report["warnings"]:
            print(f"- {warning}")


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Check Round 2 evaluation case coverage.")
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES_PATH)
    parser.add_argument("--json", action="store_true", help="Print machine-readable JSON.")
    parser.add_argument("--strict", action="store_true", help="Exit 1 when recommended coverage is missing.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    report = build_coverage_report(load_cases(args.cases))
    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print_coverage_report(report)
    return 1 if args.strict and report["warnings"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
