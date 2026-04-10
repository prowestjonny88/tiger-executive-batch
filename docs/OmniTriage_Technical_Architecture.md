# OmniTriage - Technical Architecture Document

## 1. Purpose
This document captures the current technical architecture of the implemented OmniTriage MVP.

The live system is now organized around the organizer decision tree, not the earlier resolver-tier-first routing model.

## 2. Current Backbone
Canonical workflow:

`Intake -> Diagnosis -> Confidence Gate -> Organizer Workflow -> Guided Output`

Organizer issue types:
- `no_power`
- `tripping_mcb_rccb`
- `charging_slow`
- `not_responding`

Shared basic checks:
- `main_power_supply`
- `cable_condition`
- `indicator_or_error_code`

Final workflow outcome:
- `resolved`
- `escalate`

## 3. System Shape
- Frontend: Next.js + TypeScript
- Backend: FastAPI + Python
- Persistence: SQLite
- File storage: local filesystem under backend uploads
- Knowledge layer: curated JSON knowledge snippets keyed by organizer issue type
- AI path: Gemini when configured, heuristic fallback when unavailable or failing

## 4. High-Level Component Map
```text
[ Next.js Frontend ]
        |
        v
[ FastAPI Backend ]
   |- intake
   |- diagnosis
   |- confidence
   |- routing
   |- guidance
   |- storage
   |- db
        |
        +--> SQLite
        +--> Local uploads/
        +--> Curated knowledge base
        +--> External VLM/API provider
```

## 5. Frontend Responsibilities
The frontend is responsible for:
- upload and intake UX
- adaptive follow-up questions
- result display
- guidance page
- escalation page
- confirmation page
- history and replay views
- session persistence across `/upload -> /questions -> /result`

The frontend should display organizer-native fields:
- `diagnosis.issue_type`
- `diagnosis.basic_conditions`
- `workflow.outcome`
- `workflow.rationale`

## 6. Backend Responsibilities
The backend is responsible for:
- storing uploads
- generating intake preview quality and follow-up questions
- diagnosis generation
- confidence assessment
- deterministic organizer workflow decisions
- guidance artifact generation
- incident persistence and replay/history normalization

## 7. Backend Module Boundaries
### `intake`
- upload endpoint
- image quality checks
- organizer-oriented follow-up question generation

### `diagnosis`
- Gemini or heuristic diagnosis provider
- issue type classification
- shared basic-check inference
- likely fault generation
- OCR/error code preservation

### `confidence`
- confidence bands
- confirmation requirement logic
- hazard override handling

### `routing`
- deterministic organizer workflow logic
- branch action selection
- resolved vs escalate outcome decision
- human-readable rationale

### `guidance`
- branch SOP artifact generation
- escalation artifact generation
- curated KB lookup by organizer issue type

### `storage`
- save uploaded evidence
- expose evidence under `/uploads`

### `db`
- incident persistence
- triage audit persistence
- history/replay extraction
- legacy-payload normalization

## 8. Core Contracts
### Diagnosis output
- `issue_type`
- `likely_fault`
- `evidence_summary`
- `basic_conditions`
- `raw_provider_output`
- `raw_ocr_text`
- `confidence_score`
- `confidence_band`
- `hazard_flags`

### Workflow output
- `issue_type`
- `branch_actions`
- `outcome`
- `rationale`
- `next_action`
- `fallback_action`

### Artifact output
- `issue_type`
- `title`
- `summary`
- `steps`
- `safety_note`
- `evidence_focus`

## 9. Persistence Model
SQLite stores:
- incidents
- triage audit payloads

History/replay behavior:
- new records are organizer-native
- old records are normalized into organizer-native fields during replay/history reads

## 10. Guidance / KB Strategy
The current KB is intentionally simple and curated.

KB entries are keyed by:
- `issue_type`
- symptom keywords

Retrieval matches on:
- organizer issue type
- likely fault
- evidence summary
- provider output text

## 11. Safety Model
The system is conservative by default.

Safety rules:
- visible hazard evidence overrides normal closure and forces escalation
- low-confidence or incomplete organizer checks force escalation
- unresolved branch checks produce escalation rather than optimistic closure

## 12. Verification Baseline
Current expected verification:
- `backend`: `pytest -q`
- `backend`: `pyright`
- `frontend`: `npm.cmd run build`

## 13. Known Gaps
- follow-up question generation is still partly heuristic when model support is weak
- true OCR/display extraction is not yet implemented
- annotated escalated evidence output is not yet implemented
- broader end-to-end test coverage is still pending
