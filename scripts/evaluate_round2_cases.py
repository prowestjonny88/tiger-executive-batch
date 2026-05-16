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

sys.path.insert(0, str(BACKEND_ROOT))

from app.core.models import IncidentInput, StoredPhotoEvidence  # noqa: E402
from app.services.theme2_triage import run_theme2_triage  # noqa: E402


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


def evaluate(cases: list[dict[str, Any]], images_root: Path, mode: EvaluationMode) -> None:
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

    for case in cases:
        case_type = case_type_for(case)
        relative_path = case.get("relative_path")
        if case_type != "text_followup" and relative_path and Path(str(relative_path)).suffix.lower() in VIDEO_EXTENSIONS:
            skipped_videos += 1
            continue

        result = run_theme2_triage(incident_for(case, images_root, mode))
        output = result.competition_output
        evaluated += 1
        metrics["Input component accuracy"].add(output.input_component, case.get("input_component_expected"))
        metrics["Observation accuracy"].add(output.observation_result, case.get("observation_expected"))
        metrics["Fault type accuracy"].add(output.fault_type_v2, case.get("fault_type_expected"))
        metrics["Recipient accuracy"].add(output.recipient_type, case.get("recipient_expected"))
        metrics["Serial exact match"].add(output.charger_serial_number, case.get("serial_number_expected"))
        metrics["Brand/model exact match"].add(output.charger_brand_model, case.get("brand_model_expected"))
        if result.follow_up_prompts:
            followups += 1

    title = "Weak Label Sanity" if mode == "weak-label-sanity" else "Blind Image Eval"
    print(f"Round 2 Evaluation Summary - {title}")
    print("------------------------------------------")
    print(f"Cases: {len(cases)}")
    print(f"Evaluated cases: {evaluated}")
    print(f"Skipped videos: {skipped_videos}")
    for name, metric in metrics.items():
        print(f"{name}: {metric.label()}")
    if evaluated:
        print(f"Follow-up requested: {followups}/{evaluated} = {(followups / evaluated) * 100:.1f}%")
    else:
        print("Follow-up requested: n/a")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Evaluate local Round 2 cases against Theme 2 triage.")
    parser.add_argument("--cases", type=Path, default=DEFAULT_CASES_PATH)
    parser.add_argument("--images-root", type=Path, default=DEFAULT_IMAGES_ROOT)
    parser.add_argument("--mode", choices=["weak-label-sanity", "blind-image-eval"], default="weak-label-sanity")
    parser.add_argument("--database-url", default="postgresql://omnitriage:omnitriage@localhost:5432/omnitriage")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    os.environ.setdefault("DATABASE_URL", args.database_url)
    cases = load_cases(args.cases)
    evaluate(cases, args.images_root, args.mode)


if __name__ == "__main__":
    main()
