# OmniTriage Progress Tracker

_Last updated: 2026-04-10_

## Current Backbone
- The live app now follows the organizer decision tree.
- Canonical issue types:
  - `no_power`
  - `tripping_mcb_rccb`
  - `charging_slow`
  - `not_responding`
- Shared checks:
  - `main_power_supply`
  - `cable_condition`
  - `indicator_or_error_code`
- Final workflow outcome:
  - `resolved`
  - `escalate`

## What Is Implemented
- Backend diagnosis, confidence, workflow decisioning, guidance generation, and persistence now use organizer-native fields.
- Frontend result, guidance, escalation, upload/questions flow, and history/replay now consume the organizer-native contract.
- Legacy persisted triage records are normalized during replay/history so older incidents still render safely.
- Demo scenarios and KB snippets are aligned to the organizer branches.
- Uploaded evidence is served from the backend and resolved correctly in the frontend.

## Current Verification
- `backend`: `pytest -q` -> `18 passed`
- `backend`: `pyright` -> `0 errors`
- `frontend`: `npm.cmd run build` -> `PASS`

## Still Open
- Explicit versioned shared contract documentation between frontend and backend
- Real model-backed follow-up question generation beyond heuristics/fallback rules
- Actual OCR/display-text extraction from charger images
- Annotated evidence overlays for escalated cases
- Broader integration/e2e test coverage
- Dataset-arrival work for taxonomy tuning, evaluation, and classifier refinement

## Documentation Alignment Note
- Older long-form docs in this repo still contain historical resolver-tier language from the earlier design phase.
- Where those docs have not yet been fully rewritten, treat the organizer decision tree described here and in `README.md` as the current implementation truth.
