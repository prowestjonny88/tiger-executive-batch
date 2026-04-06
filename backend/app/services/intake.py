from __future__ import annotations

import base64
import binascii
import json
import os
import re
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException

from app.core.models import IncidentInput, PhotoEvidence, StoredPhotoEvidence, UploadedPhotoPayload
from app.services.gemini_client import GEMINI_MODEL, get_gemini_client

UPLOAD_ROOT = Path(os.getenv("UPLOAD_ROOT", Path(__file__).resolve().parents[2] / "uploads"))
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
MEDIA_TYPE_SUFFIXES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}


def _safe_filename(filename: str, media_type: str) -> str:
    base_name = Path(filename or "incident-photo").name
    stem = re.sub(r"[^A-Za-z0-9._-]+", "-", Path(base_name).stem).strip("-._") or "incident-photo"
    suffix = Path(base_name).suffix.lower() or MEDIA_TYPE_SUFFIXES[media_type]
    return f"{stem}{suffix}"


def store_uploaded_photo(payload: UploadedPhotoPayload) -> StoredPhotoEvidence:
    if payload.media_type not in MEDIA_TYPE_SUFFIXES:
        raise HTTPException(status_code=400, detail="Unsupported media_type")

    try:
        content = base64.b64decode(payload.content_base64, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(status_code=400, detail="Invalid photo payload") from exc

    if not content:
        raise HTTPException(status_code=400, detail="Photo payload is empty")
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail="Photo payload exceeds 10MB limit")

    stored_name = f"{uuid4().hex}-{_safe_filename(payload.filename, payload.media_type)}"
    upload_dir = UPLOAD_ROOT / "incidents"
    upload_dir.mkdir(parents=True, exist_ok=True)
    stored_path = upload_dir / stored_name
    stored_path.write_bytes(content)

    return StoredPhotoEvidence(
        filename=payload.filename or stored_name,
        media_type=payload.media_type,
        storage_path=str(Path("uploads") / "incidents" / stored_name).replace("\\", "/"),
        byte_size=len(content),
    )


# ---------------------------------------------------------------------------
# Gemini intake helper: image quality + follow-up question generation
# ---------------------------------------------------------------------------

_INTAKE_SYSTEM_PROMPT = """\
You are OmniTriage intake assistant for EV charger incidents.
Given an incident observation you must:
1. Assess the usefulness of any available photo evidence
2. Return context-aware follow-up questions (only those still unanswered)

Rules:
- quality_status must be ONE of: "usable", "weak", "retake_required"
- quality_notes is a short single sentence explaining the quality decision
- follow_up_questions is a list (max 4 items) of objects with "question_id" and "prompt"
- Only include questions whose question_id is NOT already answered
- Available question_ids: "screen_on", "visible_damage", "charging_state", "led_behavior"
- If the photo is "usable" and most useful answers are clear from context, return zero follow-up questions

Respond with ONLY a JSON object, no markdown.
Schema:
{
  "quality_status": "usable",
  "quality_notes": "...",
  "follow_up_questions": [
    {"question_id": "screen_on", "prompt": "Is the charger screen currently on?"}
  ]
}
"""


def _build_intake_prompt(incident: IncidentInput, photo_evidence: StoredPhotoEvidence | None) -> str:
    parts = ["## Incident"]
    parts.append(f"- Site: {incident.site_id}")
    if incident.error_code:
        parts.append(f"- Error code: {incident.error_code}")
    if incident.symptom_text:
        parts.append(f"- Symptoms: {incident.symptom_text}")
    if incident.photo_hint:
        parts.append(f"- Photo note: {incident.photo_hint}")
    if photo_evidence:
        parts.append(f"- Photo attached: {photo_evidence.filename} ({photo_evidence.media_type}, {photo_evidence.byte_size} bytes)")
    else:
        parts.append("- No photo uploaded")
    if incident.follow_up_answers:
        parts.append("- Already answered:")
        for k, v in incident.follow_up_answers.items():
            parts.append(f"    {k}: {v}")
    return "\n".join(parts)


def _call_gemini_intake(
    incident: IncidentInput,
    photo_evidence: StoredPhotoEvidence | None,
) -> tuple[str, str, list[dict[str, str]]]:
    """Returns (quality_status, quality_notes, follow_up_questions)."""
    client = get_gemini_client()
    if client is None:
        raise RuntimeError("no gemini client")

    try:
        from google.genai import types as genai_types  # type: ignore[import-untyped]
    except ImportError:
        raise RuntimeError("google-genai not installed")

    prompt_text = _build_intake_prompt(incident, photo_evidence)
    contents: list[object] = [prompt_text]

    # Attach photo bytes if we have them
    if photo_evidence and photo_evidence.storage_path:
        candidate_paths = [
            UPLOAD_ROOT / Path(photo_evidence.storage_path).name,
            Path(__file__).resolve().parents[2] / photo_evidence.storage_path,
        ]
        for p in candidate_paths:
            if p.exists():
                try:
                    contents.insert(
                        0,
                        genai_types.Part.from_bytes(
                            data=p.read_bytes(),
                            mime_type=photo_evidence.media_type,
                        ),
                    )
                except Exception:
                    pass
                break

    response = client.models.generate_content(  # type: ignore[attr-defined]
        model=GEMINI_MODEL,
        contents=contents,
        config=genai_types.GenerateContentConfig(
            system_instruction=_INTAKE_SYSTEM_PROMPT,
            temperature=0.0,
            max_output_tokens=512,
        ),
    )
    raw = (response.text or "").strip()
    raw = re.sub(r"^```[a-z]*\n?", "", raw, flags=re.MULTILINE)
    raw = re.sub(r"```$", "", raw.strip())

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise RuntimeError(f"Could not parse Gemini intake JSON: {raw[:200]}")

    status = data.get("quality_status", "weak")
    if status not in {"usable", "weak", "retake_required"}:
        status = "weak"
    notes_str = str(data.get("quality_notes", ""))
    questions_raw = data.get("follow_up_questions", [])
    questions = [
        {"question_id": str(q.get("question_id", "")), "prompt": str(q.get("prompt", ""))}
        for q in questions_raw
        if q.get("question_id") and q.get("prompt")
    ]
    return status, notes_str, questions[:4]


# ---------------------------------------------------------------------------
# Public API: assess_image_quality + build_follow_up_questions
# ---------------------------------------------------------------------------

def assess_image_quality(
    photo_hint: str | None,
    photo_evidence: StoredPhotoEvidence | None = None,
    incident: IncidentInput | None = None,
) -> PhotoEvidence:
    """
    Assess photo quality using Gemini when available, heuristics otherwise.
    Returns a PhotoEvidence model.
    """
    filename = photo_evidence.filename if photo_evidence else "placeholder.jpg"
    media_type = photo_evidence.media_type if photo_evidence else "image/jpeg"
    storage_path = photo_evidence.storage_path if photo_evidence else "uploads/placeholder.jpg"
    byte_size = photo_evidence.byte_size if photo_evidence else 0

    # Try Gemini path
    if incident is not None and get_gemini_client() is not None:
        try:
            status, notes_text, _ = _call_gemini_intake(incident, photo_evidence)
            notes = [notes_text] if notes_text else ["Image assessed by Gemini."]
            return PhotoEvidence(
                filename=filename,
                media_type=media_type,
                storage_path=storage_path,
                byte_size=byte_size,
                quality_status=status,  # type: ignore[arg-type]
                notes=notes,
            )
        except Exception:  # noqa: BLE001
            pass  # Fall through to heuristic

    # Heuristic fallback (unchanged from original)
    hint = (photo_hint or "").lower()
    notes: list[str] = []
    status = "usable"

    if photo_evidence:
        if photo_evidence.byte_size < 15_000:
            status = "retake_required"
            notes.append("Uploaded image file is too small for reliable diagnosis; capture a clearer close-up.")
        elif photo_evidence.byte_size < 40_000:
            status = "weak"
            notes.append("Uploaded image is stored, but quality looks weak from file size; use follow-up answers.")
        else:
            notes.append("Uploaded image captured and stored for initial triage.")

    if any(word in hint for word in ["dark", "blurry", "cropped"]):
        status = "retake_required"
        notes.append("Operator notes suggest the image appears too weak for reliable diagnosis.")
    elif any(word in hint for word in ["dim", "partial", "far", "weak"]):
        if status != "retake_required":
            status = "weak"
        notes.append("Operator notes indicate the image is usable but weak; ask follow-up questions.")
    elif not photo_evidence:
        notes.append("Image is sufficient for initial triage.")

    return PhotoEvidence(
        filename=filename,
        media_type=media_type,
        storage_path=storage_path,
        byte_size=byte_size,
        quality_status=status,  # type: ignore[arg-type]
        notes=notes,
    )


FOLLOW_UP_QUESTION_BANK = {
    "screen_on": "Is the screen on?",
    "visible_damage": "Is there visible physical damage?",
    "charging_state": "Did charging stop suddenly or never start?",
    "led_behavior": "What is the LED color or blink behavior?",
}


def build_follow_up_questions(
    incident: IncidentInput,
    quality_status: str,
) -> list[dict[str, str]]:
    """
    Build follow-up questions. Uses Gemini when available; heuristic otherwise.
    """
    # Gemini path
    if get_gemini_client() is not None:
        try:
            _, _, questions = _call_gemini_intake(incident, incident.photo_evidence)
            if questions:
                return questions
        except Exception:  # noqa: BLE001
            pass  # Fall through to heuristic

    # Heuristic fallback
    questions: list[dict[str, str]] = []
    answered = set(incident.follow_up_answers.keys())

    if quality_status != "usable":
        for question_id in ["screen_on", "visible_damage", "charging_state"]:
            if question_id not in answered:
                questions.append({"question_id": question_id, "prompt": FOLLOW_UP_QUESTION_BANK[question_id]})

    if incident.error_code is None and "led_behavior" not in answered:
        questions.append({"question_id": "led_behavior", "prompt": FOLLOW_UP_QUESTION_BANK["led_behavior"]})

    return questions[:4]
