from __future__ import annotations

import argparse
import csv
import json
import os
import shutil
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
DEFAULT_MANIFEST = REPO_ROOT / "data" / "round2" / "manifest.csv"
DEFAULT_OUTPUT = REPO_ROOT / "data" / "round2" / "pseudo_labels.jsonl"
DEFAULT_SUMMARY_OUTPUT = REPO_ROOT / "data" / "round2" / "pseudo_label_summary.json"
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi"}

sys.path.insert(0, str(BACKEND_ROOT))

from app.core.models import IncidentInput, StoredPhotoEvidence  # noqa: E402
from app.services.theme2_mapper import build_competition_output  # noqa: E402
from app.services.theme2_perception import assess_theme2_perception  # noqa: E402


def load_manifest(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def load_existing_labels(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8-sig") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise ValueError(f"Invalid JSONL at {path}:{line_number}: {exc}") from exc
    return rows


def photo_evidence_for(row: dict[str, str]) -> StoredPhotoEvidence | None:
    if row["is_video"] == "true":
        return None
    relative_path = row["relative_path"]
    file_path = REPO_ROOT / "data" / "round2" / "images" / relative_path
    return StoredPhotoEvidence(
        filename=row["file_name"],
        media_type=row["mime_type"],
        storage_path=str(Path("data") / "round2" / "images" / relative_path).replace("\\", "/"),
        byte_size=file_path.stat().st_size if file_path.exists() else 0,
    )


def status_for(row: dict[str, str], result: dict[str, Any]) -> str:
    if row["is_video"] == "true" or Path(row["relative_path"]).suffix.lower() in VIDEO_EXTENSIONS:
        return "frame_extraction_needed"
    confidence = float(result["vlm_confidence_score"])
    if row["serial_number_expected"] == "yes" and not result["vlm_serial_number"]:
        return "ocr_review_needed"
    if confidence < 0.55:
        return "low_confidence_review_needed"
    if row["observation_weak"] != "unknown" and row["observation_weak"] != result["vlm_observation_result"]:
        return "conflict_review_needed"
    if confidence >= 0.70:
        return "auto_accept"
    return "low_confidence_review_needed"


def pseudo_label_row(row: dict[str, str]) -> dict[str, Any]:
    incident = IncidentInput(
        site_id="site-mall-01",
        photo_evidence=photo_evidence_for(row),
        photo_hint=f"{row['input_component_weak']} {row['observation_weak'].replace('_', ' ')} {row['relative_path']}",
        symptom_text=row.get("notes") or "",
    )
    perception = assess_theme2_perception(incident)
    output, _ = build_competition_output(incident, perception)
    result = {
        "file_id": row["file_id"],
        "relative_path": row["relative_path"],
        "weak_observation": row["observation_weak"],
        "vlm_input_component": perception.extraction.input_component,
        "vlm_observation_result": perception.extraction.observation_result,
        "vlm_serial_number": perception.extraction.charger_serial_number,
        "vlm_brand_model": perception.extraction.charger_brand_model,
        "vlm_confidence_score": perception.extraction.confidence_score,
        "perception_mode": perception.mode,
        "provider_attempted": perception.provider_attempted,
        "fallback_used": perception.fallback_used,
        "perception_error_type": perception.error_type,
        "perception_error_message": perception.error_message,
        "raw_provider_output": perception.raw_provider_output,
        "rule_fault_type_v2": output.fault_type_v2,
        "rule_recipient_type": output.recipient_type,
        "uncertainty_notes": perception.uncertainty_notes + perception.extraction.uncertainty_notes,
    }
    result["status"] = status_for(row, result)
    return result


def write_jsonl(rows: list[dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as handle:
        for row in rows:
            handle.write(json.dumps(row, ensure_ascii=False) + "\n")


def backup_existing_output(output_path: Path) -> Path | None:
    if not output_path.exists():
        return None
    stamp = time.strftime("%Y%m%d-%H%M%S")
    backup_path = output_path.with_name(f"{output_path.stem}.backup-{stamp}{output_path.suffix}")
    shutil.copy2(output_path, backup_path)
    return backup_path


def timestamped_output_path(output_path: Path, suffix: str) -> Path:
    stamp = time.strftime("%Y%m%d-%H%M%S")
    return output_path.with_name(f"{output_path.stem}.{suffix}-{stamp}{output_path.suffix}")


def choose_output_path(output_path: Path, replace: bool, mode_label: str) -> Path:
    if replace or not output_path.exists():
        return output_path
    return timestamped_output_path(output_path, mode_label)


def generate_jsonl_stream(
    rows: list[dict[str, str]],
    output_path: Path,
    progress_every: int,
    append: bool = False,
) -> list[dict[str, Any]]:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    started_at = time.perf_counter()
    status_counts: dict[str, int] = {}
    generated: list[dict[str, Any]] = []
    mode = "a" if append else "w"
    with output_path.open(mode, encoding="utf-8") as handle:
        for index, manifest_row in enumerate(rows, start=1):
            row_started_at = time.perf_counter()
            label = pseudo_label_row(manifest_row)
            handle.write(json.dumps(label, ensure_ascii=False) + "\n")
            handle.flush()
            generated.append(label)
            status = str(label["status"])
            status_counts[status] = status_counts.get(status, 0) + 1
            if index == 1 or index == len(rows) or index % progress_every == 0:
                elapsed = time.perf_counter() - started_at
                row_seconds = time.perf_counter() - row_started_at
                print(
                    f"[{index}/{len(rows)}] {manifest_row['relative_path']} -> "
                    f"{label['vlm_observation_result']} ({label['perception_mode']}, {status}) "
                    f"in {row_seconds:.1f}s; elapsed {elapsed:.1f}s",
                    flush=True,
                )
    print(f"Status counts: {status_counts}")
    return generated


def parse_csv_filter(value: str) -> set[str]:
    return {item.strip() for item in value.split(",") if item.strip()}


def category_for(relative_path: str) -> str:
    parts = relative_path.split("/")
    return "/".join(parts[:-1]) if len(parts) > 1 else "unknown"


def load_file_ids(path: Path | None) -> set[str]:
    if path is None:
        return set()
    with path.open(encoding="utf-8-sig") as handle:
        return {line.strip() for line in handle if line.strip() and not line.strip().startswith("#")}


def pseudo_label_summary(rows: list[dict[str, Any]]) -> dict[str, Any]:
    return {
        "total": len(rows),
        "status_counts": dict(sorted(Counter(str(row.get("status") or "unknown") for row in rows).items())),
        "perception_mode_counts": dict(sorted(Counter(str(row.get("perception_mode") or "unknown") for row in rows).items())),
        "error_type_counts": dict(sorted(Counter(str(row.get("perception_error_type") or "none") for row in rows).items())),
        "category_counts": dict(sorted(Counter(category_for(str(row.get("relative_path") or "")) for row in rows).items())),
        "conflict_count": sum(1 for row in rows if row.get("status") == "conflict_review_needed"),
    }


def write_summary(rows: list[dict[str, Any]], output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(pseudo_label_summary(rows), indent=2) + "\n", encoding="utf-8")
    print(f"Wrote pseudo-label summary to {output_path}")


def rows_for_resume(manifest_rows: list[dict[str, str]], existing_labels: list[dict[str, Any]]) -> list[dict[str, str]]:
    completed_file_ids = {str(row.get("file_id")) for row in existing_labels if row.get("file_id")}
    return [row for row in manifest_rows if row["file_id"] not in completed_file_ids]


def rows_for_rerun(
    manifest_rows: list[dict[str, str]],
    existing_labels: list[dict[str, Any]],
    statuses: set[str],
    errors: set[str],
    categories: set[str] | None = None,
    file_ids: set[str] | None = None,
) -> tuple[list[dict[str, str]], list[dict[str, Any]]]:
    categories = categories or set()
    file_ids = file_ids or set()
    manifest_by_file_id = {row["file_id"]: row for row in manifest_rows}
    rerun_file_ids: set[str] = set()
    preserved: list[dict[str, Any]] = []
    for label in existing_labels:
        file_id = str(label.get("file_id") or "")
        should_rerun = False
        if statuses and str(label.get("status") or "") in statuses:
            should_rerun = True
        if errors and str(label.get("perception_error_type") or "") in errors:
            should_rerun = True
        if categories and category_for(str(label.get("relative_path") or "")) in categories:
            should_rerun = True
        if file_ids and file_id in file_ids:
            should_rerun = True
        if should_rerun and file_id in manifest_by_file_id:
            rerun_file_ids.add(file_id)
        else:
            preserved.append(label)
    rerun_rows = [row for row in manifest_rows if row["file_id"] in rerun_file_ids]
    return rerun_rows, preserved


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate local Round 2 pseudo-labels with Theme 2 perception.")
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--progress-every", type=int, default=10)
    parser.add_argument("--resume", action="store_true", help="Append only manifest rows not already present in the output JSONL.")
    parser.add_argument("--rerun-status", default="", help="Comma-separated existing status values to regenerate, e.g. low_confidence_review_needed.")
    parser.add_argument("--rerun-errors", default="", help="Comma-separated existing perception_error_type values to regenerate, e.g. schema_mismatch.")
    parser.add_argument("--rerun-category", action="append", default=[], help="Existing category_path to regenerate. Repeat for multiple categories.")
    parser.add_argument("--rerun-file-ids", type=Path, default=None, help="Text file with one file_id per line to regenerate.")
    parser.add_argument("--summary-output", type=Path, default=DEFAULT_SUMMARY_OUTPUT)
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Allow modifying --output directly. Without this flag, existing output is never overwritten.",
    )
    parser.add_argument("--database-url", default="postgresql://omnitriage:omnitriage@localhost:5432/omnitriage")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    os.environ.setdefault("DATABASE_URL", args.database_url)
    manifest_rows = load_manifest(args.manifest)
    if args.limit > 0:
        manifest_rows = manifest_rows[: args.limit]

    rerun_statuses = parse_csv_filter(args.rerun_status)
    rerun_errors = parse_csv_filter(args.rerun_errors)
    rerun_categories = {str(category).strip() for category in args.rerun_category if str(category).strip()}
    rerun_file_ids = load_file_ids(args.rerun_file_ids)

    if args.resume and (rerun_statuses or rerun_errors or rerun_categories or rerun_file_ids):
        raise SystemExit("--resume cannot be combined with rerun filters")

    if args.resume:
        existing_labels = load_existing_labels(args.output)
        rows_to_process = rows_for_resume(manifest_rows, existing_labels)
        print(f"Resume mode: existing rows={len(existing_labels)}, missing rows={len(rows_to_process)}")
        if args.replace:
            target_output = args.output
            generate_jsonl_stream(rows_to_process, target_output, max(args.progress_every, 1), append=True)
            write_summary(load_existing_labels(target_output), args.summary_output)
            print(f"Appended {len(rows_to_process)} pseudo-labels to {target_output}")
        else:
            target_output = choose_output_path(args.output, replace=False, mode_label="resume")
            write_jsonl(existing_labels, target_output)
            generate_jsonl_stream(rows_to_process, target_output, max(args.progress_every, 1), append=True)
            write_summary(load_existing_labels(target_output), args.summary_output)
            print(f"Wrote preserved + {len(rows_to_process)} resumed pseudo-labels to {target_output}")
            print(f"Original output left unchanged: {args.output}")
        return

    if rerun_statuses or rerun_errors or rerun_categories or rerun_file_ids:
        existing_labels = load_existing_labels(args.output)
        rows_to_process, preserved = rows_for_rerun(
            manifest_rows,
            existing_labels,
            rerun_statuses,
            rerun_errors,
            categories=rerun_categories,
            file_ids=rerun_file_ids,
        )
        print(f"Rerun mode: preserved rows={len(preserved)}, rerun rows={len(rows_to_process)}")
        target_output = choose_output_path(args.output, replace=args.replace, mode_label="rerun")
        if args.replace:
            backup_path = backup_existing_output(args.output)
            if backup_path:
                print(f"Backup written: {backup_path}")
        temp_output = target_output.with_name(f"{target_output.stem}.tmp{target_output.suffix}")
        generated = generate_jsonl_stream(rows_to_process, temp_output, max(args.progress_every, 1), append=False)
        merged_by_file_id = {str(row.get("file_id")): row for row in preserved + generated}
        ordered = [merged_by_file_id[row["file_id"]] for row in manifest_rows if row["file_id"] in merged_by_file_id]
        write_jsonl(ordered, target_output)
        write_summary(ordered, args.summary_output)
        if temp_output.exists():
            temp_output.unlink()
        print(f"Wrote {len(ordered)} pseudo-labels to {target_output}")
        if target_output != args.output:
            print(f"Original output left unchanged: {args.output}")
        return

    target_output = choose_output_path(args.output, replace=args.replace, mode_label="full")
    if target_output != args.output:
        print(f"Output exists; writing new file instead: {target_output}")
    generated = generate_jsonl_stream(manifest_rows, target_output, max(args.progress_every, 1), append=False)
    write_summary(generated, args.summary_output)
    print(f"Wrote {len(manifest_rows)} pseudo-labels to {target_output}")


if __name__ == "__main__":
    main()
