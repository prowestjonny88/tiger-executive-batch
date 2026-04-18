from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from app.core.models import IncidentInput
from app.services.gemini_client import GEMINI_MODEL, get_gemini_client


@dataclass(frozen=True)
class GeminiAssessment:
    payload: dict[str, Any] | None
    raw_provider_output: str
    attempted: bool
    succeeded: bool
    error: str | None
    latency_ms: float


class GeminiDiagnosisProvider:
    def analyze(self, incident: IncidentInput) -> dict[str, Any]:
        client = get_gemini_client()
        if client is None:
            raise RuntimeError("Gemini client unavailable")

        try:
            from google.genai import types as genai_types  # type: ignore[import-untyped]
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("google-genai not installed") from exc

        prompt = (
            "You are an EV charger diagnostic engine. Analyse the incident and return a JSON object.\n"
            "The JSON must have exactly these keys:\n"
            '  issue_family: one of no_power, tripping, charging_slow, not_responding, unknown_mixed\n'
            '  fault_type: short phrase (under 10 words)\n'
            '  evidence_summary: one sentence describing what the evidence shows\n'
            '  hazard_level: one of low, medium, high\n'
            '  required_proof_next: one sentence describing the next piece of evidence needed\n'
            '  resolver_tier_hint: one of driver, local_site, remote_ops, technician\n\n'
            f"site_id: {incident.site_id}\n"
            f"charger_id: {incident.charger_id or ''}\n"
            f"photo_hint: {incident.photo_hint or ''}\n"
            f"symptom_text: {incident.symptom_text or ''}\n"
            f"error_code: {incident.error_code or ''}\n"
            f"follow_up_answers: {json.dumps(incident.follow_up_answers)}\n"
        )

        contents: list[object] = [prompt]
        if incident.photo_evidence:
            candidate = Path(__file__).resolve().parents[2] / incident.photo_evidence.storage_path
            if candidate.exists():
                contents.insert(
                    0,
                    genai_types.Part.from_bytes(
                        data=candidate.read_bytes(),
                        mime_type=incident.photo_evidence.media_type,
                    ),
                )

        response = client.models.generate_content(  # type: ignore[attr-defined]
            model=GEMINI_MODEL,
            contents=contents,
            config=genai_types.GenerateContentConfig(
                temperature=0.0,
                max_output_tokens=2048,
                response_mime_type="application/json",
            ),
        )
        raw = (response.text or "").strip()
        if raw.startswith("```"):
            raw = re.sub(r"^```[a-z]*\n?", "", raw)
            raw = re.sub(r"\n?```$", "", raw.strip())
        return json.loads(raw)


def assess_gemini(incident: IncidentInput, provider: GeminiDiagnosisProvider | None = None) -> GeminiAssessment:
    started_at = time.perf_counter()
    active_provider = provider or GeminiDiagnosisProvider()
    try:
        payload = active_provider.analyze(incident)
        return GeminiAssessment(
            payload=payload,
            raw_provider_output=json.dumps(payload),
            attempted=True,
            succeeded=True,
            error=None,
            latency_ms=round((time.perf_counter() - started_at) * 1000, 2),
        )
    except Exception as exc:
        return GeminiAssessment(
            payload=None,
            raw_provider_output=f"Gemini unavailable or failed; using Round 1 retrieval fallback. Error: {exc}",
            attempted=True,
            succeeded=False,
            error=str(exc),
            latency_ms=round((time.perf_counter() - started_at) * 1000, 2),
        )
