from __future__ import annotations

import json
import logging
from typing import Any

from app.core.models import DiagnosisResult, IncidentInput, KbRetrievalResult, PerceptionResult, StructuredEvidence
from app.services.diagnosis_evidence import build_structured_evidence
from app.services.diagnosis_fallback import (
    build_confidence_reasoning,
    build_incident_text,
    extract_raw_ocr_text,
    follow_up_prompts,
    hazard_flags,
    infer_evidence_type,
    infer_issue_family,
)
from app.services.diagnosis_gemini import (
    GeminiAssessment,
    GeminiDiagnosisProvider,
    ReasoningInput,
    assess_gemini,
    should_invoke_reasoning,
)
from app.services.diagnosis_perception import assess_perception
from app.services.diagnosis_retrieval import RetrievalAssessment, assess_retrieval
from app.services.diagnosis_synthesis import synthesize_diagnosis
from app.services.gemini_client import GEMINI_MODEL

logger = logging.getLogger(__name__)


def run_diagnosis_with_debug(
    incident: IncidentInput,
    provider: GeminiDiagnosisProvider | None = None,
) -> tuple[PerceptionResult, StructuredEvidence, KbRetrievalResult, DiagnosisResult, dict[str, Any]]:
    perception = assess_perception(incident)
    evidence = build_structured_evidence(incident, perception)
    retrieval = assess_retrieval(incident, perception, evidence)
    reasoning_input = ReasoningInput(
        incident=incident,
        perception=perception,
        evidence=evidence,
        kb_candidates=retrieval.kb_retrieval.candidates,
        gate_decision=retrieval.kb_retrieval.gate_decision,
        missing_evidence=evidence.missing_evidence,
    )
    invoke_reasoning, reasoning_call_basis = should_invoke_reasoning(reasoning_input)
    gemini = (
        assess_gemini(reasoning_input, provider=provider)
        if invoke_reasoning
        else GeminiAssessment(
            payload=None,
            raw_provider_output=f"Gemini reasoning skipped by policy: {reasoning_call_basis}.",
            attempted=False,
            succeeded=False,
            error=None,
            latency_ms=0.0,
        )
    )
    resolution = synthesize_diagnosis(incident, perception, evidence, retrieval, gemini)
    diagnosis = _build_diagnosis_result(incident, perception, retrieval, gemini, resolution)

    gemini_attempt = {
        "attempted": gemini.attempted,
        "succeeded": gemini.succeeded,
        "model": GEMINI_MODEL,
        "latency_ms": gemini.latency_ms,
        "error": gemini.error,
        "incident_id": incident.incident_id,
        "site_id": incident.site_id,
        "charger_id": incident.charger_id,
        "diagnosis_source": diagnosis.diagnosis_source,
        "issue_family": diagnosis.issue_family,
        "resolver_tier_proposed": diagnosis.resolver_tier_proposed,
        "evidence_type": diagnosis.evidence_type,
        "has_photo_evidence": incident.photo_evidence is not None,
        "kb_gate_decision": retrieval.kb_retrieval.gate_decision,
        "kb_primary_candidate": retrieval.kb_retrieval.primary_candidate.canonical_file_name if retrieval.kb_retrieval.primary_candidate else None,
        "retrieval_provider": retrieval.kb_retrieval.provider_name,
        "retrieval_mode": retrieval.kb_retrieval.provider_mode,
        "reasoning_call_policy": "invoked" if invoke_reasoning else "skipped",
        "reasoning_call_basis": reasoning_call_basis,
    }
    logger.info(json.dumps({"event": "triage_gemini_attempt", **gemini_attempt}))
    debug = {
        **gemini_attempt,
        "perception_mode": perception.mode,
        "perception_confidence": perception.confidence_score,
        "perception_provider_attempted": perception.provider_attempted,
        "perception_fallback_used": perception.fallback_used,
        "perception_error_type": perception.error_type,
        "perception_error_message": perception.error_message,
        "missing_evidence": evidence.missing_evidence,
        "structured_evidence_summary": evidence.human_summary,
        "structured_retrieval_text": evidence.retrieval_text,
        "retrieval_image_mode": retrieval.kb_retrieval.extra.get("image_mode") if retrieval.kb_retrieval.extra else None,
        "retrieval_signal_mode": retrieval.kb_retrieval.extra.get("retrieval_signal_mode") if retrieval.kb_retrieval.extra else None,
        "retrieval_descriptor_schema_version": (
            retrieval.kb_retrieval.extra.get("retrieval_descriptor_schema_version") if retrieval.kb_retrieval.extra else None
        ),
        "retrieval_exact_image_fingerprint_enabled": (
            retrieval.kb_retrieval.extra.get("exact_image_fingerprint_enabled") if retrieval.kb_retrieval.extra else None
        ),
        "retrieval_exact_image_shortcut_mode": (
            retrieval.kb_retrieval.extra.get("exact_image_shortcut_mode") if retrieval.kb_retrieval.extra else None
        ),
        "retrieval_exact_image_shortcut_used": (
            retrieval.kb_retrieval.extra.get("exact_image_shortcut_used") if retrieval.kb_retrieval.extra else None
        ),
        "retrieval_warnings": retrieval.kb_retrieval.extra.get("warnings") if retrieval.kb_retrieval.extra else [],
    }
    return perception, evidence, retrieval.kb_retrieval, diagnosis, debug


def _build_diagnosis_result(
    incident: IncidentInput,
    perception: PerceptionResult,
    retrieval: RetrievalAssessment,
    gemini: GeminiAssessment,
    resolution,
) -> DiagnosisResult:
    primary_candidate = retrieval.kb_retrieval.primary_candidate
    accepted_candidate = primary_candidate if retrieval.kb_retrieval.gate_decision == "accepted" else None

    follow_ups = follow_up_prompts(
        resolution.issue_family,
        perception.evidence_type,
        resolution.required_proof_next,
    )
    for missing_item in retrieval.kb_retrieval.compatibility_notes[:1]:
        follow_ups.append({"question_id": "evidence_gap", "prompt": missing_item})

    return DiagnosisResult(
        raw_provider_output=gemini.raw_provider_output,
        issue_family=resolution.issue_family,  # type: ignore[arg-type]
        fault_type=resolution.fault_type,
        evidence_type=perception.evidence_type,
        hazard_level=resolution.hazard_level,  # type: ignore[arg-type]
        resolver_tier_proposed=resolution.resolver_tier_proposed,  # type: ignore[arg-type]
        likely_fault=resolution.fault_type.replace("_", " ").strip() or "Unknown fault",
        evidence_summary=resolution.evidence_summary,
        required_proof_next=resolution.required_proof_next,
        raw_ocr_text=extract_raw_ocr_text(incident),
        confidence_score=resolution.score,
        confidence_band=resolution.confidence_band_value,
        unknown_flag=resolution.unknown_flag,
        requires_follow_up=resolution.requires_follow_up,
        follow_up_prompts=follow_ups[:4],
        diagnosis_source=resolution.diagnosis_source,
        branch_name=resolution.branch_name,
        hazard_flags=hazard_flags(
            resolution.hazard_level,
            incident,
            resolution.fault_type,
            accepted_candidate.visible_abnormalities if accepted_candidate is not None else perception.visible_abnormalities,
        ),
        known_case_hit=retrieval.known_case_hit,
        retrieval_metadata=retrieval.retrieval_metadata,
        confidence_reasoning=build_confidence_reasoning(
            resolution.diagnosis_source,
            retrieval.retrieval_metadata,
            retrieval.known_case_hit,
            gemini.payload is not None,
        ),
        novelty_flag=resolution.novelty_flag,
        known_case_match_score=resolution.known_case_match_score,
        reasoning_notes=resolution.reasoning_notes,
    )


def run_diagnosis(
    incident: IncidentInput,
    provider: GeminiDiagnosisProvider | None = None,
) -> DiagnosisResult:
    _, _, _, diagnosis, _ = run_diagnosis_with_debug(incident, provider=provider)
    return diagnosis


__all__ = [
    "GeminiDiagnosisProvider",
    "build_incident_text",
    "extract_raw_ocr_text",
    "infer_evidence_type",
    "infer_issue_family",
    "run_diagnosis",
    "run_diagnosis_with_debug",
]
