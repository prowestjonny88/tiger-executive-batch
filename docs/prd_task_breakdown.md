# OmniTriage PRD Task Breakdown

_Last updated: 2026-04-11_

## How to Use This File
- Completed items are shown as struck-through checklist items
- Pending items stay as open checkboxes
- Only mark something complete when it is evidenced by code, tests, or current repo artifacts
- Update this file and [progress_tracker.md](/c:/Users/JON/OneDrive/Documents/tiger-executive-batch/docs/progress_tracker.md) in the same session

## 0. Direction and Foundation
- [x] ~~Establish frontend/backend/data repo structure~~
- [x] ~~Bootstrap Next.js frontend~~
- [x] ~~Bootstrap FastAPI backend~~
- [x] ~~Add SQLite-backed persistence scaffold~~
- [x] ~~Add local upload handling~~
- [x] ~~Create seeded sites, scenarios, and KB data~~
- [x] ~~Create backend venv and local run helpers~~
- [x] ~~Implement organizer decision-tree MVP backbone~~
- [x] ~~Create and maintain direction-setting docs under `docs/`~~
- [ ] Add explicit versioned shared contract docs between frontend and backend

## 1. Smart Incident Intake
### Entry and flow
- [ ] Add QR-triggered / deep-link launch flow
- [x] ~~Keep first-use flow free of login requirements~~
- [x] ~~Support seeded site / charger prefill~~
- [ ] Turn the web app into a true PWA installable flow

### Evidence capture
- [x] ~~Support real photo upload~~
- [x] ~~Support manual error-code input~~
- [x] ~~Support short symptom text~~

### Validation and follow-up
- [x] ~~Implement image quality heuristics scaffold~~
- [x] ~~Generate weak/retake notes from backend preview~~
- [x] ~~Persist and replay multi-step follow-up session state~~
- [x] ~~Refocus follow-up questions onto organizer checks~~
- [ ] Replace heuristic follow-up generation with real model-backed evidence questioning
- [ ] Render explicit retake UX for rejected images

## 2. Diagnosis Engine
### Current baseline
- [x] ~~Define diagnosis provider abstraction~~
- [x] ~~Return structured diagnosis output~~
- [x] ~~Preserve raw OCR/error-code field in diagnosis contract~~
- [x] ~~Implement unknown-safe fallback behavior~~
- [x] ~~Rebuild current diagnosis around organizer issue types~~
- [x] ~~Integrate a branch orchestrator over hardware-visual, OCR/text, and symptom-heavy diagnosis paths~~
- [x] ~~Integrate the Round 1 5-class hardware visual classifier bundle as an additive signal~~
- [x] ~~Persist additive branch/classifier/OCR metadata in triage audit payloads~~
- [x] ~~Expose additive branch metadata to frontend result/replay consumers~~

### Real multimodal path
- [ ] Integrate real multimodal VLM/API provider
- [ ] Implement actual OCR/display-text extraction from charger images
- [ ] Fuse follow-up answers into the real diagnosis path

### Dataset-backed upgrade
- [ ] Import Round 1 organizer dataset into repo
- [ ] Build `data/round1/manifest.csv`
- [ ] Build `data/round1/label_map.yaml`
- [ ] Build cleaned internal taxonomy mapping from organizer labels
- [ ] Add `issue_family`, `fault_type`, `evidence_type`, `hazard_level`, and `resolver_tier` contract migration plan

## 3. Confidence and Safety
- [x] ~~Implement confidence bands~~
- [x] ~~Implement hazard override rules~~
- [x] ~~Expose rationale/audit fields~~
- [x] ~~Complete medium-confidence confirmation loop~~
- [ ] Calibrate thresholds using real labeled data after Round 1
- [ ] Add explicit abstain/unknown evaluation reporting

## 4. Routing and Workflow
### Current implementation
- [x] ~~Implement deterministic organizer workflow logic with rationale~~
- [x] ~~Implement all four organizer branches~~
- [x] ~~Implement generic unresolved escalation outcome~~

### Target direction from organizer updates
- [ ] Reintroduce explicit resolver-tier decisioning as a first-class contract field on top of the organizer workflow
- [ ] Implement `driver`, `local_site`, `remote_ops`, and `technician` routing outputs
- [ ] Encode lowest-safe-resolver routing policy
- [ ] Encode default routing posture for organizer classes and `unknown_mixed` cases
- [ ] Verify site-capability override behavior under the new routing contract

## 5. Guidance and Artifacts
### Current implementation
- [x] ~~Implement organizer branch SOP guidance~~
- [x] ~~Implement generic escalation output~~
- [x] ~~Implement curated KB snippet retrieval~~

### Target direction
- [ ] Evolve outputs into resolver-tier-specific artifacts
- [ ] Build richer Remote Ops action pack
- [ ] Build richer Technician dispatch packet
- [ ] Add evidence highlight / annotation support for escalations
- [ ] Build KB entries from Round 1 solved explanations
- [ ] Add screenshot/export support for report/demo artifacts

## 6. UI and Demo Surfaces
- [x] ~~Implement working upload/questions/result/history demo flow~~
- [x] ~~Implement incident history and replay~~
- [ ] Add stronger internal/ops desktop workspace framing
- [ ] Split product story cleanly into driver intake surface and internal ops surface on one backend
- [ ] Polish right-side context panel around evidence, metadata, confidence, and routing

## 7. Model Baseline and Evaluation
- [x] ~~Build and integrate first lightweight visual-classifier baseline~~
- [ ] Use 5-fold cross-validation for the visual baseline
- [ ] Compare classifier baseline against VLM/OCR baseline
- [ ] Compare hybrid OmniTriage behavior against both
- [ ] Generate confusion matrices and report-ready evaluation figures
- [ ] Evaluate OCR/text-heavy cases separately
- [ ] Evaluate symptom-heavy follow-up-dependent cases separately

## 8. Reporting and Submission Support
- [ ] Create `docs/round1_taxonomy.md`
- [ ] Create `docs/evaluation_plan.md`
- [ ] Generate report visuals and case-study artifacts
- [ ] Prepare demo-video case flow for hazardous, OCR/text, and uncertain cases
- [ ] Add broader integration/e2e coverage across the workflow

## 9. Session Maintenance
- [x] ~~Create and maintain `docs/progress_tracker.md`~~
- [x] ~~Create and maintain `docs/OmniTriage_Comprehensive_Execution_Plan.md`~~
- [ ] Treat the execution plan, progress tracker, and task breakdown as the primary execution docs in future sessions
