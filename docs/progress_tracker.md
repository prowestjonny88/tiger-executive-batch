# OmniTriage Progress Tracker

_Last updated: 2026-04-17_

## Direction Lock
The repo is now aligned to the Round 1 hard-replacement direction:
- runtime contract is taxonomy-first
- primary workflow is `evidence intake -> diagnosis -> confidence -> resolver-tier routing -> next action`
- dataset source of truth is `data/round1/`
- primary store is Postgres + pgvector
- replay/history keep legacy compatibility only at read time

Primary direction documents:
1. `docs/OmniTriage_Comprehensive_Execution_Plan.md`
2. `docs/progress_tracker.md`
3. `docs/prd_task_breakdown.md`

## Current Implementation Truth
The live repo is no longer organizer-native.

Current backend contract is centered on:
- `diagnosis.issue_family`
- `diagnosis.fault_type`
- `diagnosis.evidence_type`
- `diagnosis.hazard_level`
- `diagnosis.resolver_tier`
- `routing.resolver_tier`
- `routing.routing_rationale`
- `routing.recommended_next_step`
- `routing.fallback_action`

Current diagnosis path:
- Round 1 package-backed retrieval
- Gemini VLM assist when available
- OCR/text extraction support
- embedding-backed known-case matching

Current storage/runtime:
- Postgres + pgvector as the primary store
- Dockerized local Postgres for development
- SQLite compatibility only for old replay/history reads

Current frontend truth:
- result/guidance/escalation/history are wired to the new Round 1 contract
- demo/fallback shell is also aligned to the new issue-family + resolver-tier model

## What Is Already Implemented
- `round1_v1/` normalized into `data/round1/`
- Round 1 dataset loaders for manifest, ROI annotations, ontology, label map, and known-case seeds
- Embedding provider abstraction
- Gemini embedding provider interface with deterministic fallback provider
- Known-case retrieval service with match metadata
- New taxonomy-first diagnosis synthesis
- New confidence model based on uncertainty / novelty / retrieval strength
- Deterministic resolver-tier routing
- Resolver-tier guidance artifact generation
- Postgres-backed incidents/audits/known-case index tables
- Docker Compose file for local pgvector-backed Postgres
- Frontend contract cutover across result, guidance, escalation, history, confirmation, upload/demo shell
- Legacy replay/history normalization for older SQLite-era records

## Remaining Gaps
- expand retrieval evaluation and report artifacts for judging/demo evidence
- replace FastAPI startup hook with lifespan
- decide whether to keep archival classifier findings/docs as historical reference or move them under an explicit archive section
- clean repo noise and outdated generated artifacts from version control

## Current Verification Snapshot
- `backend`: `pytest -q backend/tests/test_api.py backend/tests/test_triage.py backend/tests/test_gemini.py` -> `17 passed`
- `backend`: `pyright -p backend/pyrightconfig.json` -> `0 errors`
- `frontend`: `npm.cmd run build` -> `PASS`
- Gemini Integration: `gemini-2.5-flash` stabilized via native generic JSON `response_mime_type` ensuring parsing resilience without manual prompt hacking or truncation.

## Notes
- The old classifier branch files remain only as archival/compatibility stubs. They are not part of the active runtime path.
- Any doc that still describes `issue_type`, `basic_conditions`, `workflow.outcome`, or classifier-first runtime behavior should be treated as outdated unless explicitly marked historical.
