from __future__ import annotations

import json
import re
import time
from dataclasses import dataclass
from typing import Any

from app.core.models import IncidentInput, KbCandidateHit, PerceptionResult, StructuredEvidence
from app.services.gemini_client import GEMINI_MODEL, get_gemini_client


@dataclass(frozen=True)
class GeminiAssessment:
    payload: dict[str, Any] | None
    raw_provider_output: str
    attempted: bool
    succeeded: bool
    error: str | None
    latency_ms: float


@dataclass(frozen=True)
class ReasoningInput:
    incident: IncidentInput
    perception: PerceptionResult
    evidence: StructuredEvidence
    kb_candidates: list[KbCandidateHit]
    gate_decision: str
    missing_evidence: list[str]


class GeminiDiagnosisProvider:
    def analyze(self, reasoning_input: ReasoningInput) -> dict[str, Any]:
        client = get_gemini_client()
        if client is None:
            raise RuntimeError("Gemini client unavailable")

        try:
            from google.genai import types as genai_types  # type: ignore[import-untyped]
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError("google-genai not installed") from exc

        incident = reasoning_input.incident
        kb_candidates = [
            {
                "canonical_file_name": candidate.canonical_file_name,
                "issue_family": candidate.issue_family,
                "fault_type": candidate.fault_type,
                "hazard_level": candidate.hazard_level,
                "match_score": round(candidate.match_score, 4),
                "compatibility_score": round(candidate.compatibility_score, 4),
                "component_primary": candidate.component_primary,
                "visible_abnormalities": candidate.visible_abnormalities,
            }
            for candidate in reasoning_input.kb_candidates[:3]
        ]
        prompt = (
            "You are an EV charger reasoning engine. Consume the structured perception and KB retrieval outputs.\n"
            "Do not reinterpret raw image bytes. Reason from the structured intermediate objects only.\n"
            "If the evidence is incomplete, stay conservative and prefer unknown_mixed with clear follow-up proof.\n"
            "The JSON must have exactly these keys:\n"
            '  issue_family: one of no_power, tripping, charging_slow, not_responding, unknown_mixed\n'
            '  fault_type: short phrase (under 10 words)\n'
            '  evidence_summary: one sentence describing what the evidence shows\n'
            '  hazard_level: one of low, medium, high\n'
            '  required_proof_next: one sentence describing the next piece of evidence needed\n'
            '  resolver_tier_hint: one of driver, local_site, remote_ops, technician\n\n'
            "Structured input:\n"
            f"perception: {json.dumps(reasoning_input.perception.model_dump())}\n"
            f"structured_evidence: {json.dumps(reasoning_input.evidence.model_dump())}\n"
            f"kb_retrieval_candidates: {json.dumps(kb_candidates)}\n"
            f"kb_gate_decision: {reasoning_input.gate_decision}\n"
            f"missing_evidence: {json.dumps(reasoning_input.missing_evidence)}\n"
            "Raw incident context (supporting only):\n"
            f"site_id: {incident.site_id}\n"
            f"charger_id: {incident.charger_id or ''}\n"
            f"photo_hint: {incident.photo_hint or ''}\n"
            f"symptom_text: {incident.symptom_text or ''}\n"
            f"error_code: {incident.error_code or ''}\n"
            f"follow_up_answers: {json.dumps(incident.follow_up_answers)}\n"
        )

        response = client.models.generate_content(  # type: ignore[attr-defined]
            model=GEMINI_MODEL,
            contents=[prompt],
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


def assess_gemini(reasoning_input: ReasoningInput, provider: GeminiDiagnosisProvider | None = None) -> GeminiAssessment:
    started_at = time.perf_counter()
    active_provider = provider or GeminiDiagnosisProvider()
    try:
        payload = active_provider.analyze(reasoning_input)
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
