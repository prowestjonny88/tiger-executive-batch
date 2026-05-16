from __future__ import annotations

import argparse
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_IMAGES_ROOT = REPO_ROOT / "data" / "round2" / "images"
DEFAULT_OUTPUT_ROOT = REPO_ROOT / "data" / "round2" / "video_frames"
VIDEO_EXTENSIONS = {".mp4", ".mov", ".avi"}


def parse_seconds(value: str) -> list[int]:
    seconds: list[int] = []
    for part in value.split(","):
        part = part.strip()
        if not part:
            continue
        second = int(part)
        if second < 0:
            raise ValueError("seconds must be non-negative")
        seconds.append(second)
    if not seconds:
        raise ValueError("at least one second must be provided")
    return seconds


def video_files(images_root: Path) -> list[Path]:
    if not images_root.exists():
        return []
    return sorted(path for path in images_root.rglob("*") if path.suffix.lower() in VIDEO_EXTENSIONS)


def frame_output_path(output_root: Path, video_path: Path, second: int) -> Path:
    return output_root / f"{video_path.stem}_frame_{second:03d}.jpg"


def extract_with_opencv(video_path: Path, output_root: Path, seconds: list[int]) -> list[Path]:
    try:
        import cv2  # type: ignore[import-untyped]
    except Exception as exc:
        raise RuntimeError(
            "OpenCV is not installed. Install opencv-python or extract frames with ffmpeg, "
            "for example: ffmpeg -ss 1 -i input.mp4 -frames:v 1 output.jpg"
        ) from exc

    output_root.mkdir(parents=True, exist_ok=True)
    capture = cv2.VideoCapture(str(video_path))
    if not capture.isOpened():
        raise RuntimeError(f"Could not open video: {video_path}")

    written: list[Path] = []
    try:
        fps = capture.get(cv2.CAP_PROP_FPS) or 30
        for second in seconds:
            frame_index = int(second * fps)
            capture.set(cv2.CAP_PROP_POS_FRAMES, frame_index)
            ok, frame = capture.read()
            if not ok:
                print(f"Skipped {video_path} at {second}s; frame unavailable.")
                continue
            output_path = frame_output_path(output_root, video_path, second)
            cv2.imwrite(str(output_path), frame)
            written.append(output_path)
    finally:
        capture.release()
    return written


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Extract representative frames from local Round 2 videos.")
    parser.add_argument("--images-root", type=Path, default=DEFAULT_IMAGES_ROOT)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    parser.add_argument("--seconds", default="1,3,5", help="Comma-separated seconds to extract, e.g. 1,3,5.")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    seconds = parse_seconds(args.seconds)
    videos = video_files(args.images_root)
    if not videos:
        print(f"No videos found under {args.images_root}")
        return 0

    total_written = 0
    for video_path in videos:
        written = extract_with_opencv(video_path, args.output_root, seconds)
        total_written += len(written)
        for output_path in written:
            print(output_path)
    print(f"Extracted {total_written} frame(s) from {len(videos)} video(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
