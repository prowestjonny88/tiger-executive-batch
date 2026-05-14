# OmniTriage - Technical Architecture Document

## 1. Purpose
This document captures the current technical architecture of the implemented OmniTriage MVP.

The live system is now organized around the Round 1 hard-replacement backend, not the older organizer-only runtime.

## 2. Current Backbone
Canonical workflow:

`Intake -> VLM/OCR/Retrieval Synthesis -> Confidence Gate -> Resolver Routing -> Guided Output`

Primary runtime contract:
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

Round 1 intelligence sources:
- `data/round1/manifest.csv`
- `data/round1/roi_annotations.csv`
- `data/round1/roi_ontology.csv`
- `data/round1/roi_label_normalization.csv`
- `data/round1/label_map.yaml`
- `data/round1/known_cases_seed.jsonl`

Legacy note:
- the earlier organizer-native `issue_type`, `basic_conditions`, and `workflow.outcome` model is no longer the active backend contract
- the earlier classifier-first runtime is retained only as archival/reference code, not as the active diagnosis path

## 3. System Shape
- Frontend: Next.js + TypeScript
- Backend: FastAPI + Python
- Persistence: Postgres + pgvector
- File storage: local filesystem under backend uploads
- Knowledge layer: normalized Round 1 dataset package plus retrieval metadata
- AI path: Gemini VLM (gemini-2.5-flash) enforcing strict schemas via native `response_mime_type="application/json"` with 2048-token limits to accommodate internal reasoning headers without truncating outputs.
- Intelligence Fallbacks: Deterministic parsing behaviors when AI providers are unavailable locally.

## 4. High-Level Component Map
```text
[ Next.js Frontend ]
        |
        v
[ FastAPI Backend ]
   |- intake
   |- diagnosis
   |- retrieval
   |- confidence
   |- routing
   |- guidance
   |- storage
   |- db
        |
        +--> Postgres + pgvector
        +--> Local uploads/
        +--> Round 1 dataset package
        +--> External VLM/API provider
```

## 5. Frontend Responsibilities
The frontend is responsible for:
- upload and intake UX
- adaptive follow-up questions
- result display
- guidance and escalation display
- history and replay display
- translating the backend contract into operator-facing views

## 6. Backend Responsibilities
The backend is responsible for:
- evidence intake normalization
- dataset-backed diagnosis synthesis
- OCR and text interpretation
- known-case retrieval
- confidence scoring
- deterministic resolver-tier routing
- next-action artifact generation
- persistence and audit logging

## 7. Source-of-Truth Note
For implementation progress and current operating assumptions, prefer:
- `docs/OmniTriage_Comprehensive_Execution_Plan.md`
- `docs/progress_tracker.md`
- `docs/prd_task_breakdown.md`
