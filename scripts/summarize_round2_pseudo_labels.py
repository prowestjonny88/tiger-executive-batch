from __future__ import annotations

import argparse
import json
from collections import Counter
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_INPUT = REPO_ROOT / "data" / "round2" / "pseudo_labels.jsonl"


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            if line.strip():
                rows.append(json.loads(line))
    return rows


def category_for(relative_path: str) -> str:
    parts = relative_path.split("/")
    return "/".join(parts[:-1]) if len(parts) > 1 else "unknown"


def summarize(rows: list[dict[str, Any]]) -> None:
    status_counts = Counter(str(row.get("status", "unknown")) for row in rows)
    category_counts = Counter(category_for(str(row.get("relative_path", ""))) for row in rows)
    review_count = sum(count for status, count in status_counts.items() if status != "auto_accept")

    print("Round 2 Pseudo-label Summary")
    print("----------------------------")
    print(f"Total files: {len(rows)}")
    print(f"Auto-accept count: {status_counts.get('auto_accept', 0)}")
    print(f"Review-needed count: {review_count}")
    print(f"OCR review-needed count: {status_counts.get('ocr_review_needed', 0)}")
    print(f"Conflict count: {status_counts.get('conflict_review_needed', 0)}")
    print(f"Video count: {status_counts.get('frame_extraction_needed', 0)}")
    print("")
    print("Per-category counts")
    for category, count in sorted(category_counts.items()):
        print(f"- {category}: {count}")
    print("")
    print("Status counts")
    for status, count in sorted(status_counts.items()):
        print(f"- {status}: {count}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Summarize Round 2 pseudo-label JSONL status counts.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    summarize(load_jsonl(args.input))


if __name__ == "__main__":
    main()
