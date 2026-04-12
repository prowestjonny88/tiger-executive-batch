# OmniTriage Progress Tracker

_Last updated: 2026-04-11_

## Direction Lock
The current documentation direction is set by [OmniTriage_Comprehensive_Execution_Plan.md](/c:/Users/JON/OneDrive/Documents/tiger-executive-batch/docs/OmniTriage_Comprehensive_Execution_Plan.md).

That direction says:
- product framing: confidence-aware EV charger incident triage system
- workflow framing: `evidence intake -> diagnosis -> confidence gate -> routing -> next action`
- internal taxonomy target: `issue_family`, `fault_type`, `evidence_type`, `hazard_level`, `resolver_tier`
- routing stays deterministic
- diagnosis can use multiple evidence-specific branches as long as routing stays deterministic

## Current Implementation Truth
The live repo is implemented around the organizer decision-tree contract with an additive branch diagnosis layer:
- `diagnosis.issue_type`
- `diagnosis.basic_conditions`
- `workflow.outcome`
- `workflow.rationale`

The live diagnosis branches are:
- `hardware_visual_branch`
- `ocr_text_branch`
- `symptom_multimodal_branch`
- fallback to Gemini or organizer heuristics if a branch is unavailable

Current organizer-native issue types:
- `no_power`
- `tripping_mcb_rccb`
- `charging_slow`
- `not_responding`

Current workflow outcome:
- `resolved`
- `escalate`

## What Is Already Implemented
- Backend diagnosis, confidence, workflow decisioning, guidance generation, and persistence are live.
- Branch orchestration is live in the backend diagnosis path.
- The Round 1 5-class hardware visual classifier bundle is integrated with runtime policy gating and graceful fallback.
- OCR/text-first routing is live for screenshot/app-log/display-text style cases.
- Symptom-heavy cases are routed through a dedicated symptom-multimodal branch.
- Frontend result, guidance, escalation, upload/questions flow, and history/replay consume the live contract.
- Legacy triage records are normalized for replay/history.
- Demo scenarios and KB snippets are aligned to the organizer workflow.
- Uploaded evidence is served from the backend and resolved correctly in the frontend.
- Gemini fallback architecture exists.
- Branch/classifier/OCR metadata is preserved in triage audit payloads and replay output.

## Highest-Priority Gaps
- import Round 1 organizer dataset into repo
- build `manifest.csv` and `label_map.yaml`
- harden real OCR/display-text extraction beyond current rule-based branch scaffolding
- upgrade the symptom branch from heuristic/follow-up fusion to a fuller multimodal provider
- calibrate classifier thresholds and policy against real labeled data
- add evaluation/report artifact generation
- add screenshot/export support

## Current Verification Snapshot
- `backend`: `pytest -q backend/tests` -> `24 passed`
- `backend`: `pyright` -> `0 errors`
- `frontend`: `npm.cmd run build` -> `PASS`

## Documentation Rule
When docs disagree:
1. `docs/OmniTriage_Comprehensive_Execution_Plan.md`
2. `docs/progress_tracker.md`
3. `docs/prd_task_breakdown.md`

These should be treated as the source of truth for direction, status, and execution order.
