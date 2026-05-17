from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
DEFAULT_IMAGES_ROOT = REPO_ROOT / "data" / "round2" / "unseen_external"
DEFAULT_OUTPUT_PATH = REPO_ROOT / "data" / "round2" / "unseen_external_report.json"
IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}

sys.path.insert(0, str(REPO_ROOT))
sys.path.insert(0, str(BACKEND_ROOT))

from app.core.models import IncidentInput, StoredPhotoEvidence  # noqa: E402
from app.services.theme2_triage import run_theme2_triage  # noqa: E402


def image_files(images_root: Path) -> list[Path]:
    if not images_root.exists():
        return []
    return sorted(path for path in images_root.rglob("*") if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS)


def evidence_for(path: Path, images_root: Path) -> StoredPhotoEvidence:
    relative_path = path.relative_to(images_root).as_posix()
    media_type = "image/png" if path.suffix.lower() == ".png" else "image/jpeg"
    return StoredPhotoEvidence(
        filename=path.name,
        media_type=media_type,
        storage_path=str(Path("data") / "round2" / "unseen_external" / relative_path).replace("\\", "/"),
        byte_size=path.stat().st_size,
    )


def run_smoke(images_root: Path) -> dict[str, Any]:
    results: list[dict[str, Any]] = []
    for path in image_files(images_root):
        incident = IncidentInput(
            site_id="site-mall-01",
            photo_evidence=evidence_for(path, images_root),
            photo_hint="Photo uploaded for EV charger troubleshooting.",
            symptom_text="",
            demo_scenario_id=f"unseen_external:{path.relative_to(images_root).as_posix()}",
        )
        triage = run_theme2_triage(incident)
        results.append(
            {
                "relative_path": path.relative_to(images_root).as_posix(),
                "perception_mode": triage.perception.mode,
                "fallback_used": triage.perception.fallback_used,
                "input_component": triage.competition_output.input_component,
                "observation_result": triage.competition_output.observation_result,
                "fault_type_v2": triage.competition_output.fault_type_v2,
                "recipient_type": triage.competition_output.recipient_type,
                "assigned_team_id": triage.competition_output.assigned_team_id,
                "charger_serial_number": triage.competition_output.charger_serial_number,
                "charger_brand_model": triage.competition_output.charger_brand_model,
                "confidence_score": triage.competition_output.confidence_score,
                "required_proof_next": triage.competition_output.required_proof_next,
                "follow_up_prompts": [prompt.model_dump() for prompt in triage.follow_up_prompts],
                "debug": triage.debug.model_dump(),
            }
        )
    return {
        "images_root": str(images_root),
        "image_count": len(results),
        "gemini_api_key_present": bool(os.getenv("GEMINI_API_KEY")),
        "results": results,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Theme 2 smoke predictions on local unseen external images.")
    parser.add_argument("--images-root", type=Path, default=DEFAULT_IMAGES_ROOT)
    parser.add_argument("--output-json", type=Path, default=DEFAULT_OUTPUT_PATH)
    parser.add_argument("--database-url", default="postgresql://omnitriage:omnitriage@localhost:5432/omnitriage")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    os.environ.setdefault("DATABASE_URL", args.database_url)
    report = run_smoke(args.images_root)
    print(f"Unseen external smoke images: {report['image_count']}")
    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote prediction report to {args.output_json}")


if __name__ == "__main__":
    main()
