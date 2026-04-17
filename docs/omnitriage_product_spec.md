# OmniTriage Product Specification

_Aligned to the Round 1 hard-replacement runtime on 2026-04-17_

## 1. Product Definition
OmniTriage is a confidence-aware EV charger incident triage system.

It is not a plain image classifier and not a free-form repair chatbot. It is a workflow system that:
- captures charger incident evidence
- synthesizes VLM, OCR, and known-case retrieval signals
- diagnoses the likely issue family and likely fault
- asks clarifying questions when confidence is not yet sufficient
- assesses hazard and uncertainty
- routes the case to the lowest safe resolver tier
- generates a resolver-specific next-action artifact

Core workflow:

`evidence intake -> VLM/OCR/retrieval synthesis -> confidence gate -> resolver routing -> next action`

## 2. Current Implementation Truth
The live repo now uses the Round 1 taxonomy-first contract as its primary runtime surface:
- `issue_family`
- `fault_type`
- `evidence_type`
- `hazard_level`
- `resolver_tier`
- `confidence_score`
- `confidence_band`
- `unknown_flag`
- `requires_follow_up`
- `routing_rationale`
- `recommended_next_step`
- `fallback_action`
- `required_proof_next`

Current implementation characteristics:
- backend intelligence is package-backed from `data/round1/`
- known-case retrieval is part of the active diagnosis path
- Postgres + pgvector is the primary persistence target
- the older organizer-native `issue_type` / `basic_conditions` / `workflow.outcome` contract is no longer the live backend contract
- the earlier classifier-first runtime is not the active diagnosis path

For the source-of-truth implementation view, prefer:
- `docs/OmniTriage_Comprehensive_Execution_Plan.md`
- `docs/OmniTriage_Technical_Architecture.md`
- `docs/progress_tracker.md`
- `docs/prd_task_breakdown.md`

## 3. Product Goal
Primary goals:
- reduce unnecessary technician visits
- accelerate charger recovery
- make routing decisions safer and more explainable
- absorb organizer dataset updates without rewriting the product contract each round

Business value:
- fewer wasted truck rolls
- faster operational recovery
- safer escalation behavior
- better evidence quality for support and engineering teams

## 4. Competition Fit
The solution should demonstrate:
- charger fault detection and classification support
- visual anomaly identification when image evidence is present
- OCR-aware handling for app screenshots and display text
- retrieval-backed use of known solved cases from organizer data
- a working MVP with measurable evaluation and traceable routing logic

The strongest framing is:
- workflow-first triage system
- confidence-aware and conservative under uncertainty
- hybrid multimodal diagnosis with retrieval-backed evidence synthesis
- resolver-tier routing instead of binary close-or-escalate output

## 5. What This Product Is Not
OmniTriage is not:
- a pure computer vision demo
- a free-form troubleshooting chatbot
- a single-model black box that directly decides dispatch
- a technician-only escalation tool

The system remains structured and auditable. Model output informs the diagnosis, but routing remains constrained by explicit product rules.

## 6. Runtime Shape
At runtime, OmniTriage currently follows this sequence:
1. Accept incident evidence from upload, typed symptoms, error code text, and follow-up answers.
2. Normalize evidence into a case payload.
3. Use VLM, OCR, and known-case retrieval to synthesize a structured diagnosis.
4. Score confidence and uncertainty.
5. Route to the safest resolver tier.
6. Generate the next-action artifact for the chosen resolver.

## 7. Source-of-Truth Note
This document is intentionally shorter than the execution plan.

For current architecture, implementation progress, and remaining work, use:
- `docs/OmniTriage_Comprehensive_Execution_Plan.md`
- `docs/OmniTriage_Technical_Architecture.md`
- `docs/progress_tracker.md`
- `docs/prd_task_breakdown.md`
