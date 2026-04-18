from __future__ import annotations

from dataclasses import dataclass
from typing import cast

from app.core.models import ConfidenceBand, HazardLevel, IncidentInput, PerceptionResult, ResolverTier, StructuredEvidence
from app.services.diagnosis_fallback import confidence_band, fallback_resolver, max_hazard_level
from app.services.diagnosis_gemini import GeminiAssessment
from app.services.diagnosis_retrieval import RetrievalAssessment


@dataclass(frozen=True)
class DiagnosisResolution:
    issue_family: str
    fault_type: str
    evidence_summary: str
    hazard_level: HazardLevel
    resolver_tier: ResolverTier
    required_proof_next: str | None
    diagnosis_source: str
    branch_name: str
    score: float
    unknown_flag: bool
    novelty_flag: bool
    requires_follow_up: bool
    confidence_band_value: ConfidenceBand
    reasoning_notes: list[str]
    known_case_match_score: float | None


def _text_only_resolution(
    retrieval: RetrievalAssessment,
    evidence: StructuredEvidence,
) -> DiagnosisResolution:
    issue_family = retrieval.issue_family_hint if retrieval.issue_family_hint != "unknown_mixed" else "unknown_mixed"
    hazard_level: HazardLevel = "high" if evidence.hazard_signals else "medium"
    resolver_tier = fallback_resolver(issue_family, hazard_level)
    notes = [
        "No photo evidence was available, so the pipeline stayed conservative.",
        "Text-only cases require follow-up before KB-backed visual diagnosis can be trusted.",
    ]
    return DiagnosisResolution(
        issue_family=issue_family,
        fault_type="unknown_fault",
        evidence_summary=evidence.semantic_summary,
        hazard_level=hazard_level,
        resolver_tier=resolver_tier,
        required_proof_next="Provide a clear charger photo and upstream power context.",
        diagnosis_source="text_only_incomplete",
        branch_name="vlm_first_text_only_path",
        score=0.35 if issue_family == "unknown_mixed" else 0.46,
        unknown_flag=True,
        novelty_flag=True,
        requires_follow_up=True,
        confidence_band_value=confidence_band(0.35 if issue_family == "unknown_mixed" else 0.46),
        reasoning_notes=notes,
        known_case_match_score=None,
    )


def synthesize_diagnosis(
    incident: IncidentInput,
    perception: PerceptionResult,
    evidence: StructuredEvidence,
    retrieval: RetrievalAssessment,
    gemini: GeminiAssessment,
) -> DiagnosisResolution:
    primary_candidate = retrieval.kb_retrieval.primary_candidate
    gate_decision = retrieval.kb_retrieval.gate_decision
    notes: list[str] = [
        f"Perception ran first in {perception.mode} mode.",
        f"KB gate decision: {gate_decision}.",
    ]

    if perception.mode == "text_only":
        return _text_only_resolution(retrieval, evidence)

    if gate_decision == "accepted" and primary_candidate is not None:
        issue_family = primary_candidate.issue_family
        fault_type = primary_candidate.fault_type
        evidence_summary = primary_candidate.visual_observation or perception.scene_summary
        hazard_level = max_hazard_level(primary_candidate.hazard_level, "high" if evidence.hazard_signals else None)
        resolver_tier: ResolverTier = "technician" if hazard_level == "high" else primary_candidate.resolver_tier
        required_proof_next = primary_candidate.required_proof_next
        diagnosis_source = "kb_accepted"
        branch_name = "vlm_first_kb_accepted"
        score = max(primary_candidate.match_score, perception.confidence_score, 0.72)
        notes.append(f"Accepted KB candidate {primary_candidate.canonical_file_name} anchored the diagnosis.")
        novelty_flag = False

        if gemini.payload is not None:
            gemini_issue_family = str(gemini.payload.get("issue_family") or "").strip()
            if gemini_issue_family == issue_family:
                evidence_summary = str(gemini.payload.get("evidence_summary") or evidence_summary)
                required_proof_next = str(gemini.payload.get("required_proof_next") or required_proof_next)
                hazard_level = max_hazard_level(hazard_level, str(gemini.payload.get("hazard_level") or ""))
                branch_name = "vlm_first_kb_enriched"
                diagnosis_source = "kb_enriched_by_reasoning"
                score = max(score, 0.8)
                notes.append("Gemini reasoning agreed with the accepted KB candidate and enriched the evidence summary.")
            else:
                notes.append("Gemini reasoning did not align tightly enough to replace the accepted KB candidate.")
    elif gemini.payload is not None:
        issue_family = str(gemini.payload.get("issue_family") or retrieval.issue_family_hint or "unknown_mixed")
        fallback_fault = primary_candidate.fault_type if primary_candidate is not None and gate_decision == "contextual_only" else "unknown_fault"
        fault_type = str(gemini.payload.get("fault_type") or fallback_fault)
        evidence_summary = str(gemini.payload.get("evidence_summary") or perception.scene_summary)
        hazard_level = max_hazard_level(
            str(gemini.payload.get("hazard_level") or ""),
            primary_candidate.hazard_level if primary_candidate is not None and gate_decision == "contextual_only" else None,
            "high" if evidence.hazard_signals else None,
        )
        resolver_tier_hint = str(gemini.payload.get("resolver_tier_hint") or "").strip()
        resolver_tier = (
            cast(ResolverTier, resolver_tier_hint)
            if resolver_tier_hint in {"driver", "local_site", "remote_ops", "technician"}
            else fallback_resolver(issue_family, hazard_level)
        )
        required_proof_next = str(
            gemini.payload.get("required_proof_next")
            or (primary_candidate.required_proof_next if primary_candidate is not None and gate_decision == "contextual_only" else "")
            or ""
        ) or None
        diagnosis_source = "kb_contextual_reasoning" if primary_candidate is not None and gate_decision == "contextual_only" else "gemini_first_principles"
        branch_name = "vlm_first_reasoning_path"
        score = max(primary_candidate.match_score if primary_candidate is not None else 0.0, 0.64)
        notes.append("Gemini reasoning synthesized the diagnosis after perception and KB retrieval.")
        if primary_candidate is not None and gate_decision == "contextual_only":
            notes.append(f"Nearest candidate {primary_candidate.canonical_file_name} was used as context only.")
        novelty_flag = True
    else:
        issue_family = retrieval.issue_family_hint
        if "tripped_breaker" in perception.visible_abnormalities or "breaker" in evidence.components_visible:
            issue_family = "tripping"
        elif evidence.hazard_signals:
            issue_family = "no_power"
        fault_type = primary_candidate.fault_type if primary_candidate is not None and gate_decision == "contextual_only" else "unknown_fault"
        evidence_summary = perception.scene_summary
        hazard_level = max_hazard_level(primary_candidate.hazard_level if primary_candidate is not None else None, "high" if evidence.hazard_signals else None)
        resolver_tier = fallback_resolver(issue_family, hazard_level)
        required_proof_next = primary_candidate.required_proof_next if primary_candidate is not None and gate_decision == "contextual_only" else None
        diagnosis_source = "first_principles_fallback"
        branch_name = "vlm_first_fallback"
        score = max(primary_candidate.match_score if primary_candidate is not None else 0.0, perception.confidence_score, 0.44)
        notes.append("No accepted KB candidate or Gemini reasoning was available, so the diagnosis used first-principles fallback.")
        novelty_flag = True

    if evidence.hazard_signals:
        hazard_level = "high"
        resolver_tier = "technician"
        score = max(score, 0.78)
        notes.append("Hazard signals forced the conservative technician path.")

    if issue_family == "unknown_mixed":
        score = min(score, 0.58)
    if evidence.incomplete:
        notes.append("Evidence remained incomplete after perception and retrieval.")

    unknown_flag = issue_family == "unknown_mixed" or score < 0.6 or fault_type == "unknown_fault"
    requires_follow_up = evidence.incomplete or unknown_flag or not required_proof_next

    return DiagnosisResolution(
        issue_family=issue_family,
        fault_type=fault_type,
        evidence_summary=evidence_summary,
        hazard_level=hazard_level,
        resolver_tier=resolver_tier,  # type: ignore[arg-type]
        required_proof_next=required_proof_next,
        diagnosis_source=diagnosis_source,
        branch_name=branch_name,
        score=score,
        unknown_flag=unknown_flag,
        novelty_flag=novelty_flag,
        requires_follow_up=requires_follow_up,
        confidence_band_value=confidence_band(score),
        reasoning_notes=notes,
        known_case_match_score=primary_candidate.match_score if primary_candidate is not None else None,
    )
