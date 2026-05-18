from __future__ import annotations

import base64
import binascii
import json
import re

from fastapi import HTTPException

from app.core.models import IncidentInput, PhotoEvidence, StoredPhotoEvidence, UploadedPhotoPayload
from app.services.gemini_client import GEMINI_MODEL, get_gemini_client
from app.services.storage import MEDIA_TYPE_SUFFIXES, read_photo_bytes, store_photo_bytes


def store_uploaded_photo(payload: UploadedPhotoPayload) -> StoredPhotoEvidence:
    if payload.media_type not in MEDIA_TYPE_SUFFIXES:
        raise HTTPException(status_code=400, detail="Unsupported media_type")

    try:
        content = base64.b64decode(payload.content_base64, validate=True)
    except (ValueError, binascii.Error) as exc:
        raise HTTPException(status_code=400, detail="Invalid photo payload") from exc

    return store_photo_bytes(content=content, filename=payload.filename, media_type=payload.media_type)


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
- Available question_ids: "photo_request", "power_context", "required_proof_next", "error_text"
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

    # Attach photo bytes if we have them.
    if photo_evidence and photo_evidence.storage_path:
        try:
            contents.insert(
                0,
                genai_types.Part.from_bytes(
                    data=read_photo_bytes(photo_evidence),
                    mime_type=photo_evidence.media_type,
                ),
            )
        except Exception:
            pass

    response = client.models.generate_content(  # type: ignore[attr-defined]
        model=GEMINI_MODEL,
        contents=contents,
        config=genai_types.GenerateContentConfig(
            system_instruction=_INTAKE_SYSTEM_PROMPT,
            temperature=0.0,
            max_output_tokens=2048,
            response_mime_type="application/json",
        ),
    )
    raw = (response.text or "").strip()
    if raw.startswith("```"):
        raw = re.sub(r"^```[a-z]*\n?", "", raw)
        raw = re.sub(r"\n?```$", "", raw.strip())

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
            notes.append("Uploaded image file is too small for reliable Theme 2 triage; capture a clearer close-up.")
        elif photo_evidence.byte_size < 40_000:
            status = "weak"
            notes.append("Uploaded image is stored, but quality looks weak from file size; use follow-up answers.")
        else:
            notes.append("Uploaded image captured and stored for initial triage.")

    if any(word in hint for word in ["dark", "blurry", "cropped"]):
        status = "retake_required"
        notes.append("Operator notes suggest the image appears too weak for reliable Theme 2 triage.")
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
    "photo_request": "Please capture a wider photo of the charger and upstream power path.",
    "power_context": "Has the upstream isolator or breaker state been checked and photographed?",
    "required_proof_next": "Please provide the next proof requested by the triage system.",
    "error_text": "If there is a visible error message, capture it clearly in text or screenshot form.",
}


def build_follow_up_questions(
    incident: IncidentInput,
    quality_status: str,
) -> list[dict[str, str]]:
    """Build Theme 2 follow-up questions from perception and organizer-rule gaps."""
    from app.services.theme2_perception import assess_theme2_perception
    from app.services.theme2_triage import build_theme2_followups

    perception = assess_theme2_perception(incident)
    theme2_questions = build_theme2_followups(incident, perception)
    questions = [
        {
            "question_id": item.question_id,
            "prompt": item.prompt,
            **({"reason": item.reason} if item.reason else {}),
        }
        for item in theme2_questions
    ]
    if quality_status != "usable" and "photo_request" not in {item["question_id"] for item in questions}:
        questions.insert(
            0,
            {
                "question_id": "photo_request",
                "prompt": "Please upload a clearer photo of the charger indicator, EVDB labels, or isolator switch.",
                "reason": "The uploaded image quality is not strong enough for reliable Theme 2 triage.",
            },
        )
    return questions[:4]
