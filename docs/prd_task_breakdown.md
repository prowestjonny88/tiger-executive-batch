# OmniTriage PRD Task Breakdown

_Aligned to the live Round 1 runtime on 2026-04-17_

## 1. Current Build State

Completed:
- Round 1 package normalized into `data/round1/`
- taxonomy-first backend contract
- retrieval-first diagnosis path
- Postgres + pgvector primary persistence
- frontend cutover to `issue_family` / `resolver_tier` model
- legacy replay/history compatibility

Validated:
- backend tests passing
- backend pyright passing
- frontend production build passing

## 2. Highest-Priority Remaining Work

### A. Documentation cleanup
- align legacy PRD/spec/briefing docs to the current runtime
- explicitly mark archival classifier-era materials as historical
- remove dead references to organizer-native contract fields

### B. Runtime hardening
- replace FastAPI startup event with lifespan
- harden OCR/text extraction beyond current extraction + optional Gemini assist
- expand retrieval diagnostics and evaluation artifacts

### C. Data / evaluation work
- add evaluation scripts or reports for Round 1 retrieval and routing quality
- define a repeatable judge/demo evidence pack from real triage outputs

### D. Repo hygiene
- clean outdated tracked noise and generated artifacts
- decide what to do with duplicated historical docs and experiment folders

## 3. Current Runtime Contract Checklist

Backend and frontend should consistently expose:
- `diagnosis.issue_family`
- `diagnosis.fault_type`
- `diagnosis.evidence_type`
- `diagnosis.hazard_level`
- `diagnosis.resolver_tier`
- `routing.resolver_tier`
- `routing.routing_rationale`
- `routing.recommended_next_step`
- `routing.fallback_action`

Anything still built around:
- `issue_type`
- `basic_conditions`
- `workflow.outcome`

should be treated as legacy or outdated.

## 4. Acceptance Baseline

Required baseline before calling the repo aligned:
- docs updated to the new runtime direction
- backend tests green
- pyright green
- frontend build green
- local Dockerized Postgres workflow documented and usable

## 5. Source of Truth
When execution status is unclear, defer to:
1. `docs/OmniTriage_Comprehensive_Execution_Plan.md`
2. `docs/progress_tracker.md`
3. `docs/prd_task_breakdown.md`
