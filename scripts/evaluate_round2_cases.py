from __future__ import annotations

import argparse
import json
import os
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Literal


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
DEFAULT_CASES_PATH = REPO_ROOT / "data" / "round2" / "evaluation_cases.json"
DEFAULT_IMAGES_ROOT = REPO_ROOT / "data" / "round2" / "images"
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi"}
EvaluationMode = Literal["weak-label-sanity", "blind-image-eval"]

sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(BACKEND_ROOT))

from app.core.models import IncidentInput, StoredPhotoEvidence  # noqa: E402
from app.services.theme2_triage import run_theme2_triage  # noqa: E402
from scripts.round2_eval_utils import normalize_brand_model, normalize_serial  # noqa: E402


@dataclass
class Metric:
    correct: int = 0
    total: int = 0

    def add(self, actual: str | None, expected: str | None) -> None:
        if expected is None:
            return
        self.total += 1
        if actual == expected:
            self.correct += 1

    def label(self) -> str:
        if self.total == 0:
            return "n/a"
        return f"{self.correct}/{self.total} = {(self.correct / self.total) * 100:.1f}%"

    def as_dict(self) -> dict[str, float | int | None]:
        accuracy = None if self.total == 0 else self.correct / self.total
        return {"correct": self.correct, "total": self.total, "accuracy": accuracy}


def load_cases(path: Path) -> list[dict[str, Any]]:
    with path.open(encoding="utf-8-sig") as handle:
        payload = json.load(handle)
    if not isinstance(payload, list):
        raise ValueError("evaluation_cases.json must contain a list")
    return payload


def photo_evidence_for(images_root: Path, relative_path: str) -> StoredPhotoEvidence | None:
    file_path = images_root / relative_path
    if not file_path.exists() or file_path.suffix.lower() in VIDEO_EXTENSIONS:
        return None
    mime = "image/png" if file_path.suffix.lower() == ".png" else "image/jpeg"
    return StoredPhotoEvidence(
        filename=file_path.name,
        media_type=mime,
        storage_path=str(Path("data") / "round2" / "images" / relative_path).replace("\\", "/"),
        byte_size=file_path.stat().st_size,
    )


def case_type_for(case: dict[str, Any]) -> str:
    return str(case.get("case_type") or "image")


def build_photo_hint(case: dict[str, Any], mode: EvaluationMode) -> str:
    if mode == "blind-image-eval":
        return "Photo uploaded for EV charger troubleshooting."
    relative_path = str(case.get("relative_path") or "")
    observation_words = str(case.get("observation_expected", "unknown")).replace("_", " ")
    return f"{case.get('input_component_expected', 'unknown')} {observation_words} {relative_path}".strip()


def incident_for(case: dict[str, Any], images_root: Path, mode: EvaluationMode) -> IncidentInput:
    relative_path = case.get("relative_path")
    case_type = case_type_for(case)
    photo_evidence = None
    if case_type in {"image", "video_frame"} and relative_path:
        photo_evidence = photo_evidence_for(images_root, str(relative_path))
    if mode == "blind-image-eval" and case_type != "text_followup":
        symptom_text = str(case.get("symptom_text") or "")
    else:
        symptom_text = str(case.get("symptom_text") or case.get("notes") or "")
    return IncidentInput(
        site_id="site-mall-01",
        photo_evidence=photo_evidence,
        photo_hint=build_photo_hint(case, mode),
        symptom_text=symptom_text,
        follow_up_answers={str(key): str(value) for key, value in dict(case.get("follow_up_answers") or {}).items()},
        demo_scenario_id=str(case.get("case_id")),
    )


def _field_match(actual: str | None, expected: str | None) -> bool | None:
    if expected is None:
        return None
    return actual == expected


def _normalized_field_match(actual: str | None, expected: str | None, kind: Literal["serial", "brand_model"]) -> bool | None:
    if expected is None:
        return None
    if kind == "serial":
        return normalize_serial(actual) == normalize_serial(expected)
    return normalize_brand_model(actual) == normalize_brand_model(expected)


def _case_category(case: dict[str, Any]) -> str:
    relative_path = case.get("relative_path")
    if not relative_path:
        return str(case.get("case_type") or "unknown")
    parts = str(relative_path).split("/")
    return "/".join(parts[:-1]) if len(parts) > 1 else "unknown"


def evaluate(cases: list[dict[str, Any]], images_root: Path, mode: EvaluationMode) -> dict[str, Any]:
    metrics = {
        "Input component accuracy": Metric(),
        "Observation accuracy": Metric(),
        "Fault type accuracy": Metric(),
        "Recipient accuracy": Metric(),
        "Serial exact match": Metric(),
        "Brand/model exact match": Metric(),
    }
    skipped_videos = 0
    followups = 0
    evaluated = 0
    case_results: list[dict[str, Any]] = []

    for case in cases:
        case_type = case_type_for(case)
        relative_path = case.get("relative_path")
        if case_type != "text_followup" and relative_path and Path(str(relative_path)).suffix.lower() in VIDEO_EXTENSIONS:
            skipped_videos += 1
            continue

        result = run_theme2_triage(incident_for(case, images_root, mode))
        output = result.competition_output
        extraction = result.perception.extraction
        evaluated += 1
        metrics["Input component accuracy"].add(output.input_component, case.get("input_component_expected"))
        metrics["Observation accuracy"].add(output.observation_result, case.get("observation_expected"))
        metrics["Fault type accuracy"].add(output.fault_type_v2, case.get("fault_type_expected"))
        metrics["Recipient accuracy"].add(output.recipient_type, case.get("recipient_expected"))
        expected_serial = case.get("serial_number_expected")
        expected_brand = case.get("brand_model_expected")
        actual_serial_normalized = normalize_serial(output.charger_serial_number)
        expected_serial_normalized = normalize_serial(str(expected_serial)) if expected_serial is not None else None
        actual_brand_normalized = normalize_brand_model(output.charger_brand_model)
        expected_brand_normalized = normalize_brand_model(str(expected_brand)) if expected_brand is not None else None
        metrics["Serial exact match"].add(actual_serial_normalized, expected_serial_normalized)
        metrics["Brand/model exact match"].add(actual_brand_normalized, expected_brand_normalized)
        if result.follow_up_prompts:
            followups += 1
        matches = {
            "input_component": _field_match(output.input_component, case.get("input_component_expected")),
            "observation": _field_match(output.observation_result, case.get("observation_expected")),
            "fault_type": _field_match(output.fault_type_v2, case.get("fault_type_expected")),
            "recipient": _field_match(output.recipient_type, case.get("recipient_expected")),
            "serial": _normalized_field_match(output.charger_serial_number, expected_serial, "serial"),
            "brand_model": _normalized_field_match(output.charger_brand_model, expected_brand, "brand_model"),
        }
        case_results.append(
            {
                "case_id": case.get("case_id"),
                "case_type": case_type,
                "category": _case_category(case),
                "relative_path": relative_path,
                "expected": {
                    "input_component": case.get("input_component_expected"),
                    "observation": case.get("observation_expected"),
                    "fault_type": case.get("fault_type_expected"),
                    "recipient": case.get("recipient_expected"),
                    "serial_number": case.get("serial_number_expected"),
                    "brand_model": case.get("brand_model_expected"),
                },
                "actual": {
                    "input_component": output.input_component,
                    "observation": output.observation_result,
                    "fault_type": output.fault_type_v2,
                    "recipient": output.recipient_type,
                    "assigned_team_id": output.assigned_team_id,
                    "serial_number": output.charger_serial_number,
                    "brand_model": output.charger_brand_model,
                    "confidence_score": output.confidence_score,
                },
                "normalized_expected": {
                    "serial_number": expected_serial_normalized,
                    "brand_model": expected_brand_normalized,
                },
                "normalized_actual": {
                    "serial_number": actual_serial_normalized,
                    "brand_model": actual_brand_normalized,
                },
                "matches": matches,
                "failed_fields": [field for field, matched in matches.items() if matched is False],
                "perception": {
                    "mode": result.perception.mode,
                    "fallback_used": result.perception.fallback_used,
                    "error_type": result.perception.error_type,
                    "error_message": result.perception.error_message,
                    "confidence_score": result.perception.confidence_score,
                    "scene_summary": result.perception.scene_summary,
                    "ocr_findings": result.perception.ocr_findings,
                    "uncertainty_notes": result.perception.uncertainty_notes,
                    "extraction": {
                        "input_component": extraction.input_component,
                        "observation_result": extraction.observation_result,
                        "charger_serial_number": extraction.charger_serial_number,
                        "charger_brand_model": extraction.charger_brand_model,
                        "indicator_status": extraction.indicator_status,
                        "evdb_phase_type": extraction.evdb_phase_type,
                        "mcb_visible": extraction.mcb_visible,
                        "rccb_visible": extraction.rccb_visible,
                        "mcb_rating": extraction.mcb_rating,
                        "rccb_rating": extraction.rccb_rating,
                        "rccb_type": extraction.rccb_type,
                        "isolator_state": extraction.isolator_state,
                        "raw_visible_text": extraction.raw_visible_text,
                    },
                },
                "follow_up_prompts": [prompt.model_dump() for prompt in result.follow_up_prompts],
                "debug": result.debug.model_dump(),
            }
        )

    title = "Weak Label Sanity" if mode == "weak-label-sanity" else "Blind Image Eval"
    return {
        "mode": mode,
        "title": title,
        "cases": len(cases),
        "evaluated_cases": evaluated,
        "skipped_videos": skipped_videos,
        "metrics": {name: metric.as_dict() for name, metric in metrics.items()},
        "metric_labels": {name: metric.label() for name, metric in metrics.items()},
        "follow_up_requested": {
            "count": followups,
            "total": evaluated,
            "rate": None if evaluated == 0 else followups / evaluated,
        },
        "case_results": case_results,
        "failures": [item for item in case_results if item["failed_fields"]],
    }


def print_report(report: dict[str, Any], show_failures: bool = False) -> None:
    print(f"Round 2 Evaluation Summary - {report['title']}")
    print("------------------------------------------")
    print(f"Cases: {report['cases']}")
    print(f"Evaluated cases: {report['evaluated_cases']}")
    print(f"Skipped videos: {report['skipped_videos']}")
    for name, label in report["metric_labels"].items():
        print(f"{name}: {label}")
    followups = report["follow_up_requested"]
    if followups["total"]:
        print(f"Follow-up requested: {followups['count']}/{followups['total']} = {followups['rate'] * 100:.1f}%")
    else:
        print("Follow-up requested: n/a")
    if not show_failures:
        return
    print("")
    print("Failures")
    print("--------")
    for item in report["failures"]:
        print(
            f"{item['case_id']} | {item['category']} | failed={','.join(item['failed_fields'])} | "
            f"obs {item['expected']['observation']} -> {item['actual']['observation']} | "
            f"fault {item['expected']['fault_type']} -> {item['actual']['fault_type']} | "
            f"recipient {item['expected']['recipient']} -> {item['actual']['recipient']} | "
            f"mode={item['perception']['mode']} conf={item['actual']['confidence_score']}"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate local Round 2 cases against Theme 2 triage.")
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES_PATH)
    parser.add_argument("--images-root", type=Path, default=DEFAULT_IMAGES_ROOT)
    parser.add_argument("--mode", choices=["weak-label-sanity", "blind-image-eval"], default="weak-label-sanity")
    parser.add_argument("--show-failures", action="store_true", help="Print per-case failure details.")
    parser.add_argument("--output-json", type=Path, default=None, help="Write detailed evaluation report JSON.")
    parser.add_argument("--database-url", default="postgresql://omnitriage:omnitriage@localhost:5432/omnitriage")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    os.environ.setdefault("DATABASE_URL", args.database_url)
    cases = load_cases(args.cases)
    report = evaluate(cases, args.images_root, args.mode)
    print_report(report, show_failures=args.show_failures)
    if args.output_json:
        args.output_json.parent.mkdir(parents=True, exist_ok=True)
        args.output_json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
        print(f"Wrote detailed report to {args.output_json}")


if __name__ == "__main__":
    main()
