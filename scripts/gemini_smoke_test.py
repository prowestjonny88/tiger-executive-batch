from __future__ import annotations

import argparse
import os
import sys
import time
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]
BACKEND_ROOT = REPO_ROOT / "backend"
sys.path.insert(0, str(BACKEND_ROOT))

from app.services.gemini_client import GEMINI_MODEL, get_gemini_client  # noqa: E402


def mime_for(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".png":
        return "image/png"
    if suffix == ".webp":
        return "image/webp"
    return "image/jpeg"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Direct Gemini API smoke test for API key/model/image access.")
    parser.add_argument("--model", default=os.getenv("GEMINI_MODEL", GEMINI_MODEL))
    parser.add_argument("--image", type=Path, default=None)
    parser.add_argument("--prompt", default="Return JSON only: {\"ok\": true, \"message\": \"pong\"}")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    client = get_gemini_client()
    if client is None:
        raise SystemExit("Gemini client unavailable. Check GEMINI_API_KEY and google-genai install.")

    try:
        from google.genai import types as genai_types
    except ImportError as exc:
        raise SystemExit(f"google-genai types import failed: {exc}") from exc

    contents: list[object] = []
    if args.image is not None:
        image_path = args.image if args.image.is_absolute() else REPO_ROOT / args.image
        if not image_path.exists():
            raise SystemExit(f"Image not found: {image_path}")
        contents.append(genai_types.Part.from_bytes(data=image_path.read_bytes(), mime_type=mime_for(image_path)))
        print(f"Image: {image_path}")
    contents.append(args.prompt)

    print(f"Model: {args.model}")
    print("Calling Gemini...")
    started_at = time.perf_counter()
    try:
        response = client.models.generate_content(
            model=args.model,
            contents=contents,
            config=genai_types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=512,
                response_mime_type="application/json",
            ),
        )
    except Exception as exc:
        print(f"Gemini call failed: {exc.__class__.__name__}: {exc}")
        raise
    elapsed = time.perf_counter() - started_at
    text = (response.text or "").strip()
    print(f"Gemini call succeeded in {elapsed:.1f}s")
    print("Response:")
    print(text[:2000])


if __name__ == "__main__":
    main()
