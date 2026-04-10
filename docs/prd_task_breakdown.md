# OmniTriage PRD Task Breakdown

_Last updated: 2026-04-10_

## How to use this file
- Completed items are shown as struck-through checklist items: `- [x] ~~like this~~`
- Pending items stay as open checkboxes: `- [ ] like this`
- Only mark something complete when it is evidenced by current code, tests, or `docs/progress_tracker.md`
- If work progresses, **update this file and `docs/progress_tracker.md` in the same session**

## 0. Foundation / repo setup
- [x] ~~Create `frontend/`, `backend/`, and `data/` repo structure~~
- [x] ~~Bootstrap a Next.js frontend shell~~
- [x] ~~Bootstrap a FastAPI backend shell with modular folders (`intake`, `diagnosis`, `confidence`, `routing`, `guidance`, `db`)~~
- [x] ~~Add SQLite-backed persistence scaffold for incidents and triage audit logs~~
- [x] ~~Add seeded site, KB, and demo scenario data~~
- [x] ~~Create isolated backend venv at `backend/.venv`~~
- [x] ~~Add local run helpers (`backend/run-backend.ps1`, `frontend/run-frontend.ps1`)~~
- [x] ~~Create pre-dataset frontend/backend integration readiness PRD + test spec~~
- [x] ~~Add real upload directory handling for stored image files~~
- [x] ~~Realign the live frontend/backend contract around the organizer decision tree~~
- [ ] Add explicit versioned shared contract docs between frontend and backend

## 1. Feature 1 — Smart Incident Intake
### 1.1 Entry
- [ ] Add QR-triggered / deep-link launch flow
- [x] ~~Keep first-use flow free of login requirements~~
- [x] ~~Support seeded site / charger prefill for the current small-site scope~~
- [ ] Turn the web app into a true PWA installable flow

### 1.2 Evidence capture
- [x] ~~Replace text/photo hints with real photo capture/upload input~~
- [x] ~~Support optional manual error code entry~~
- [x] ~~Support optional short symptom text~~

### 1.3 Input validation
- [x] ~~Implement image quality heuristics scaffold (usable / weak / retake required)~~
- [x] ~~Generate retake guidance / weak-image notes from backend preview~~
- [x] ~~Run quality checks on actual uploaded image files instead of text hints~~
- [ ] Render an explicit retake UX for rejected images

### 1.4 Adaptive follow-up questions
- [x] ~~Generate backend-driven follow-up questions in intake preview~~
- [x] ~~Limit follow-up question generation to a small bounded set~~
- [x] ~~Persist and replay multi-step follow-up question sessions end-to-end in the UI~~
- [x] ~~Refocus follow-up questions onto organizer basic checks (main power supply, cable condition, indicator/error code)~~
- [ ] Make follow-up questions depend on real model/image evidence instead of heuristics only

## 2. Feature 2 — Progressive Hybrid Diagnosis Engine
### 2.1 Pre-dataset baseline
- [x] ~~Define an abstract diagnosis provider interface~~
- [x] ~~Return structured diagnosis output (issue type, basic conditions, likely fault, evidence summary, confidence, unknown flag, severity)~~
- [x] ~~Preserve a raw OCR/error-code field in the diagnosis contract~~
- [x] ~~Implement unknown-safe fallback behavior~~
- [x] ~~Rebuild diagnosis around the organizer four-bucket taxonomy~~
- [ ] Integrate a real multimodal VLM / API provider
- [ ] Implement actual OCR / display-text extraction from charger images
- [ ] Fuse follow-up answers into a true model-backed diagnosis path

### 2.2 Post-Round-1 extensions (deferred)
- [ ] Add lightweight known-fault classifier
- [ ] Normalize organizer labels into internal taxonomy mapping
- [ ] Compare classifier output against zero-shot baseline

### 2.3 Optional later extensions (deferred)
- [ ] Add anomaly / novelty support for unseen physical faults
- [ ] Add evidence overlays for novel visual defects

## 3. Feature 3 — Confidence-Aware Safety Gate
- [x] ~~Implement confidence bands (`high`, `medium`, `low`)~~
- [x] ~~Implement visible hazard override rules~~
- [x] ~~Expose rationale/audit fields for safety decisions~~
- [x] ~~Block risky low-tier guidance on hazard cases~~
- [x] ~~Complete the full medium-confidence confirmation loop in the UI and backend state flow~~
- [ ] Calibrate thresholds using real labeled data after Round 1

## 4. Feature 4 — Organizer Decision Workflow
- [x] ~~Implement deterministic organizer workflow logic with human-readable rationale~~
- [x] ~~Replace resolver-tier-first behavior with `issue_type -> basic_checks -> branch_sop -> resolved/escalate`~~
- [x] ~~Implement all four organizer branches (`no_power`, `tripping_mcb_rccb`, `charging_slow`, `not_responding`)~~
- [x] ~~Implement a single generic escalation outcome for unresolved cases~~
- [ ] Add richer branch-specific priority and fallback variations for more issue classes

## 5. Feature 5 — Guided Resolution & Escalation Output
- [x] ~~Implement organizer branch SOP guidance output~~
- [x] ~~Implement generic escalation output aligned to unresolved organizer cases~~
- [x] ~~Implement curated KB snippet retrieval for artifact generation~~
- [x] ~~Improve artifact formatting and presentation polish around organizer issue types and workflow outcomes~~
- [ ] Add annotated evidence / evidence highlight output for escalated cases

## 6. Demo / evaluation / submission support
- [x] ~~Implement real in-product demo mode~~
- [x] ~~Add organizer-aligned seeded demo scenarios~~
- [x] ~~Persist incident / triage audit data to SQLite~~
- [x] ~~Retrofit the existing frontend routes to match the approved premium prototype style~~
- [x] ~~Verify frontend build passes~~
- [x] ~~Verify frontend TS diagnostics are clean~~
- [x] ~~Verify backend Pyright static checks pass~~
- [x] ~~Verify backend pytest suite passes~~
- [x] ~~Verify backend runtime smoke test passes~~
- [x] ~~Add incident history UI from SQLite for judges / debugging~~
- [x] ~~Normalize replay/history to support both organizer-native and legacy persisted triage records~~
- [ ] Add screenshot/export support for report/demo artifacts
- [ ] Add richer automated integration/e2e coverage across the whole workflow
- [x] ~~Align frontend/backend seeded data sources so demo scenarios and sites come from one canonical contract~~

## 7. Dataset-arrival work (intentionally not done yet)
- [ ] Import Round 1 organizer dataset
- [ ] Build cleaned internal fault taxonomy from organizer labels
- [ ] Enrich KB entries from solved explanations
- [ ] Tune confidence thresholds using dataset evidence
- [ ] Add classifier-based evaluation metrics for the technical report
- [ ] Prepare fast-update path for Round 2 and late Round 3 changes

## 8. Session maintenance reminder
- [x] ~~Create and maintain `docs/progress_tracker.md` as the execution-status companion to this file~~
- [ ] Future session agents should treat `docs/prd_task_breakdown.md` + `docs/progress_tracker.md` as the source of truth for current execution status
