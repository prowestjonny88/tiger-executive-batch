from __future__ import annotations

import argparse
import csv
import hashlib
import json
import mimetypes
from collections import Counter
from dataclasses import dataclass
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_IMAGES_ROOT = REPO_ROOT / "data" / "round2" / "images"
DEFAULT_OUTPUT = REPO_ROOT / "data" / "round2" / "manifest.csv"
DEFAULT_SUMMARY_OUTPUT = REPO_ROOT / "data" / "round2" / "manifest_summary.json"

SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp"}
SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi"}
SUPPORTED_EXTENSIONS = SUPPORTED_IMAGE_EXTENSIONS | SUPPORTED_VIDEO_EXTENSIONS

MANIFEST_COLUMNS = [
    "file_id",
    "source",
    "relative_path",
    "file_name",
    "file_extension",
    "mime_type",
    "is_video",
    "category_path",
    "input_component_weak",
    "observation_weak",
    "expected_fault_type_v2",
    "expected_recipient_type",
    "ocr_needed",
    "serial_number_expected",
    "brand_model_expected",
    "bbox_needed",
    "bbox_priority",
    "review_status",
    "notes",
]


@dataclass(frozen=True)
class WeakLabel:
    input_component_weak: str
    observation_weak: str
    expected_fault_type_v2: str
    expected_recipient_type: str
    ocr_needed: str
    serial_number_expected: str
    brand_model_expected: str
    bbox_needed: str
    bbox_priority: str
    notes: str = ""


DEFAULT_LABEL = WeakLabel(
    input_component_weak="unknown",
    observation_weak="unknown",
    expected_fault_type_v2="unknown",
    expected_recipient_type="unknown",
    ocr_needed="maybe",
    serial_number_expected="no",
    brand_model_expected="no",
    bbox_needed="optional_subset",
    bbox_priority="low",
    notes="No folder mapping matched; review manually.",
)

FOLDER_LABELS = {
    "charger/charger red light": WeakLabel(
        "charger",
        "charger_red_light",
        "charger_issue",
        "after_sales_team",
        "maybe",
        "no",
        "no",
        "yes_subset",
        "high",
    ),
    "charger/charger no light": WeakLabel(
        "charger",
        "charger_no_light",
        "supply_issue",
        "customer",
        "no",
        "no",
        "no",
        "optional_subset",
        "low",
    ),
    "charger/charger serial number- id": WeakLabel(
        "charger",
        "charger_serial_brand_visible",
        "identification_only",
        "none",
        "yes",
        "yes",
        "yes",
        "yes_subset",
        "high",
    ),
    "evdb (mcb,rccb)/single phase": WeakLabel(
        "evdb",
        "evdb_single_phase",
        "unknown",
        "customer",
        "yes",
        "no",
        "no",
        "yes_subset",
        "high",
    ),
    "evdb (mcb,rccb)/three phase": WeakLabel(
        "evdb",
        "evdb_three_phase",
        "unknown",
        "customer",
        "yes",
        "no",
        "no",
        "yes_subset",
        "high",
    ),
    "evdb (mcb,rccb)/mcb tripped": WeakLabel(
        "evdb",
        "mcb_tripped",
        "protection_issue",
        "customer",
        "maybe",
        "no",
        "no",
        "yes_subset",
        "medium",
    ),
    "isolator": WeakLabel(
        "isolator",
        "unknown",
        "unknown",
        "unknown",
        "maybe",
        "no",
        "no",
        "yes_subset",
        "medium",
        "Folder label does not identify ON/OFF state.",
    ),
}


def normalize_relative_path(path: Path) -> str:
    return path.as_posix()


def category_path_for(relative_path: str) -> str:
    parts = relative_path.split("/")[:-1]
    return "/".join(parts)


def weak_label_for(category_path: str) -> WeakLabel:
    return FOLDER_LABELS.get(category_path.lower(), DEFAULT_LABEL)


def file_id_for(relative_path: str) -> str:
    return hashlib.sha1(relative_path.encode("utf-8")).hexdigest()


def build_manifest_rows(images_root: Path) -> list[dict[str, str]]:
    if not images_root.exists():
        raise FileNotFoundError(f"Images root does not exist: {images_root}")

    rows: list[dict[str, str]] = []
    for file_path in sorted(path for path in images_root.rglob("*") if path.is_file()):
        extension = file_path.suffix.lower()
        if extension not in SUPPORTED_EXTENSIONS:
            continue
        relative_path = normalize_relative_path(file_path.relative_to(images_root))
        category_path = category_path_for(relative_path)
        label = weak_label_for(category_path)
        is_video = extension in SUPPORTED_VIDEO_EXTENSIONS
        mime_type = mimetypes.guess_type(file_path.name)[0] or ("video/unknown" if is_video else "image/unknown")
        rows.append(
            {
                "file_id": file_id_for(relative_path),
                "source": "local_round2_images",
                "relative_path": relative_path,
                "file_name": file_path.name,
                "file_extension": extension.lstrip("."),
                "mime_type": mime_type,
                "is_video": "true" if is_video else "false",
                "category_path": category_path,
                "input_component_weak": label.input_component_weak,
                "observation_weak": label.observation_weak,
                "expected_fault_type_v2": label.expected_fault_type_v2,
                "expected_recipient_type": label.expected_recipient_type,
                "ocr_needed": label.ocr_needed,
                "serial_number_expected": label.serial_number_expected,
                "brand_model_expected": label.brand_model_expected,
                "bbox_needed": label.bbox_needed,
                "bbox_priority": label.bbox_priority,
                "review_status": "weak_labeled",
                "notes": label.notes,
            }
        )
    return rows


def write_manifest(rows: list[dict[str, str]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=MANIFEST_COLUMNS)
        writer.writeheader()
        writer.writerows(rows)


def unknown_rows(rows: list[dict[str, str]]) -> list[dict[str, str]]:
    return [
        row
        for row in rows
        if row["input_component_weak"] == "unknown"
        and row["observation_weak"] == "unknown"
        and row["category_path"] != "Isolator"
    ]


def manifest_summary(rows: list[dict[str, str]]) -> dict[str, Any]:
    return {
        "total_rows": len(rows),
        "image_rows": sum(1 for row in rows if row["is_video"] != "true"),
        "video_rows": sum(1 for row in rows if row["is_video"] == "true"),
        "category_counts": dict(sorted(Counter(row["category_path"] for row in rows).items())),
        "input_component_counts": dict(sorted(Counter(row["input_component_weak"] for row in rows).items())),
        "observation_counts": dict(sorted(Counter(row["observation_weak"] for row in rows).items())),
        "unknown_rows": [
            {
                "relative_path": row["relative_path"],
                "category_path": row["category_path"],
                "input_component_weak": row["input_component_weak"],
                "observation_weak": row["observation_weak"],
            }
            for row in unknown_rows(rows)
        ],
    }


def print_summary(summary: dict[str, Any]) -> None:
    print(f"Total rows: {summary['total_rows']}")
    print(f"Image rows: {summary['image_rows']}")
    print(f"Video rows: {summary['video_rows']}")
    print("Rows by category_path:")
    for category, count in dict(summary["category_counts"]).items():
        print(f"- {category}: {count}")
    print("Rows by observation_weak:")
    for observation, count in dict(summary["observation_counts"]).items():
        print(f"- {observation}: {count}")
    print("Rows by input_component_weak:")
    for component, count in dict(summary["input_component_counts"]).items():
        print(f"- {component}: {count}")
    print(f"Unknown weak-label rows outside allowed Isolator folder: {len(summary['unknown_rows'])}")


def write_summary(summary: dict[str, Any], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build the local Round 2 image manifest.")
    parser.add_argument("--images-root", type=Path, default=DEFAULT_IMAGES_ROOT)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--write-summary", action="store_true", help="Write data/round2/manifest_summary.json.")
    parser.add_argument("--summary-output", type=Path, default=DEFAULT_SUMMARY_OUTPUT)
    parser.add_argument(
        "--fail-on-unknown",
        action="store_true",
        help="Fail if any non-Isolator folder maps to unknown weak labels.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = build_manifest_rows(args.images_root)
    summary = manifest_summary(rows)
    unknown = unknown_rows(rows)
    if args.fail_on_unknown and unknown:
        unknown_paths = ", ".join(row["relative_path"] for row in unknown)
        raise SystemExit(f"Unknown weak-label rows outside Isolator folder: {unknown_paths}")
    write_manifest(rows, args.output)
    print(f"Wrote {len(rows)} rows to {args.output}")
    print_summary(summary)
    if args.write_summary:
        write_summary(summary, args.summary_output)
        print(f"Wrote summary to {args.summary_output}")


if __name__ == "__main__":
    main()
