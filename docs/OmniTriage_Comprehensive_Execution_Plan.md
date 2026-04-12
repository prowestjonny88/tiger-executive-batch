# OmniTriage - Comprehensive Execution Plan

_Consolidated and aligned into repo docs on 2026-04-11_

## 1. Purpose
This document is the top-level direction-setting plan for OmniTriage after organizer updates and dataset discussion.

It exists to:
- lock product and technical direction
- remove ambiguity before further coding
- define model boundaries
- align repo work, demo work, and report work

## 2. Final Product Claim
OmniTriage is a confidence-aware EV charger incident triage system that helps reduce unnecessary technician visits by diagnosing issues, assessing risk, and routing them to the right resolver.

It is a full:

`evidence intake -> diagnosis -> confidence gate -> routing -> next action`

workflow, not just a model demo.

## 3. Project-State Summary
### Repo direction already established
The repo already supports:
- modular-monolith architecture
- Next.js frontend + FastAPI backend
- SQLite + local uploads
- organizer decision-tree implementation
- fallback-safe diagnosis and confidence logic
- history/replay and demo mode

### Main remaining gaps
The key remaining gaps are:
- taxonomy clarity
- real VLM/OCR integration
- model-backed follow-up evidence fusion
- routing rulebook hardening
- evaluation and report framing
- Round 1 dataset ingestion and baseline training

## 4. Data Interpretation
The organizer data discussed so far is:
- small
- mixed in modality
- sufficient for an MVP baseline
- not strong enough to justify a classifier-first architecture

Therefore the correct strategy is:
- workflow first
- taxonomy first
- multimodal diagnosis first
- lightweight classifier second
- conservative fallback always

## 5. Locked Product Decisions
### 5.1 Product positioning
Locked:
- confidence-aware EV charger incident triage system
- not a plain fault classifier
- not a free-form repair chatbot

### 5.2 Internal taxonomy
Top-level product label:
- `issue_family`

Locked issue families:
- `no_power`
- `tripping`
- `charging_slow`
- `not_responding`
- `unknown_mixed`

Each case should also support:
- `fault_type`
- `evidence_type`
- `hazard_level`
- `resolver_tier`

### 5.3 Organizer class mapping direction
Current mapping direction:
- `Burnt Mark Issue` -> usually `unknown_mixed`, often hazardous
- `Cable termination- connection` -> usually `unknown_mixed`, often hazardous
- `Charger No Pulse` -> usually `unknown_mixed`, follow-up dependent
- `MCB Tripped` -> usually `tripping`
- `TNB Fuse Blow Issue` -> usually `no_power`
- `Tapping TNB Meter` -> usually `unknown_mixed`, hazardous
- `WC Apps Error Logs` -> usually `not_responding`, OCR/text-first

### 5.4 Model role boundaries
Main diagnosis engine should:
- understand the case broadly from image + text + answers
- infer likely issue family and likely fault
- generate evidence summary
- preserve uncertainty

Known-fault classifier should:
- predict normalized fault types or organizer-like visual fault labels
- not directly predict full routing outcomes

Special handling:
- `WC Apps Error Logs` -> OCR/text first
- `Charger No Pulse` -> follow-up/context first

### 5.5 Routing rules
Main principle:
- route to the lowest safe resolver tier

Locked resolver tiers:
- `driver`
- `local_site`
- `remote_ops`
- `technician`

Safety rules:
- hazard overrides everything upward
- unknown or mixed cases route based on hazard
- driver tier stays narrow
- remote ops is the safe default middle tier for unclear but non-hazardous cases

### 5.6 UX direction
Two surfaces should eventually share one backend:
- driver-facing intake flow
- internal/ops desktop workspace

For the laptop demo, emphasize the internal workspace while preserving the simple intake story.

### 5.7 Evaluation and reporting
Evaluate both:
- model performance
- end-to-end triage behavior

Recommended metrics:
- accuracy
- macro F1
- per-class precision/recall
- confusion matrix
- hazard recall
- routing correctness
- abstain/unknown rate

Recommended comparisons:
- visual classifier baseline
- VLM/OCR baseline
- hybrid OmniTriage system

## 6. Final System Design
### End-to-end flow
1. Reporter submits incident evidence
2. System checks image quality
3. System asks bounded follow-up questions if needed
4. Diagnosis engine analyzes image + OCR + answers
5. System predicts likely issue family and likely fault
6. Confidence-aware safety gate decides whether to trust, confirm, or escalate
7. Deterministic routing assigns the lowest safe resolver tier
8. Resolver-specific artifact is generated
9. Incident and rationale are logged for replay/history/reporting

### Internal architecture
Intake layer:
- image upload / capture
- error code input
- symptom text
- image quality gate
- follow-up question state

Diagnosis layer:
- VLM/API-first broad diagnosis
- OCR/display reading
- issue-family inference
- likely-fault suggestion
- evidence summary
- unknown-safe output

Supervised layer:
- lightweight known-fault classifier
- additive, not required

Confidence layer:
- confidence band
- confidence score
- hazard overrides
- confirmation loop
- unknown/abstain handling

Routing layer:
- deterministic routing
- hazard aware
- site capability aware
- fallback aware
- rationale generation

Guidance layer:
- resolver-specific templates
- curated KB snippets
- evidence-aware outputs

## 7. Data Contract Direction
Each case should ideally store:
- `incident_id`
- `site_id`
- `charger_id`
- `reporter_surface`
- `image_path`
- `manual_error_code`
- `symptom_text`
- `follow_up_answers`
- `issue_family`
- `fault_type`
- `evidence_type`
- `hazard_level`
- `resolver_tier`
- `confidence_band`
- `confidence_score`
- `unknown_flag`
- `routing_rationale`
- `next_action`
- `fallback_action`
- `artifact_type`

Round 1 manifest should include:
- `image_path`
- `organizer_label`
- `issue_family`
- `fault_type`
- `evidence_type`
- `hazard_level`
- `resolver_tier`
- `alternate_issue_family`
- `notes`
- `fold_id`
- `group_id`

## 8. ML Plan
### Stage A - baseline
Build first:
- real VLM/API diagnosis
- real OCR/display extraction
- issue-family inference
- evidence summary generation
- confidence + routing logic

### Stage B - Round 1 supervised upgrade
After taxonomy/manifest:
- train lightweight known-fault classifier
- compare against VLM baseline
- calibrate thresholds
- fuse classifier conservatively

### Stage C - optional later support
If time allows:
- anomaly/novelty support
- better evidence overlays
- richer calibration

### First supervised baseline recommendation
Use pretrained image embeddings with:
- logistic regression
- linear SVM
- or a small MLP

Start with strong visual classes first, not the entire mixed dataset.

## 9. Routing and Safety Rulebook
Main rule:
- always route to the lowest safe resolver tier

Key rules:
- high hazard should not stay at driver/basic self-service
- uncertain high-hazard cases escalate immediately
- driver tier is only for low-risk, reversible, no-tools-required steps
- remote ops is the safe middle buffer
- local-site recommendations escalate to remote ops when local site support is unavailable

## 10. UX and Demo Plan
### Surface 1 - driver intake
- simple evidence submission
- short follow-up questions
- safe next action

### Surface 2 - internal/ops workspace
- diagnosis review
- confidence/routing visibility
- override/escalation
- incident history
- resolver packet generation

### Laptop demo structure
1. incident submitted
2. system analyzes it
3. confidence shown honestly
4. routing chosen safely
5. artifact generated
6. incident stored in history

## 11. Repo Implementation Plan
### Immediate workstreams
Workstream A - data/taxonomy:
- import organizer Round 1 data
- create `manifest.csv`
- create `label_map.yaml`
- encode taxonomy and mapping rules

Workstream B - diagnosis integration:
- real VLM/API provider
- real OCR/display extraction
- follow-up answer fusion

Workstream C - routing/confidence hardening:
- verify hazard overrides
- verify unknown/mixed handling
- refine routing defaults

Workstream D - guidance/artifacts:
- build KB entries from solved explanations
- refine resolver-tier artifacts
- add evidence highlight support

Workstream E - UI/demo polish:
- strengthen internal workspace
- add screenshot/export support
- polish history/replay

Workstream F - model baseline:
- build first visual classifier baseline
- use 5-fold CV
- compare to VLM baseline

Workstream G - evaluation/reporting:
- evaluation tables
- confusion matrices
- case-study artifacts
- report figures

### Suggested files to add next
Data:
- `data/round1/manifest.csv`
- `data/round1/label_map.yaml`
- `data/round1/round1_dataset_profile.md`

Scripts:
- `scripts/build_round1_manifest.py`
- `scripts/train_known_fault_baseline.py`
- `scripts/eval_known_fault_model.py`
- `scripts/generate_report_artifacts.py`

Docs:
- `docs/round1_taxonomy.md`
- `docs/evaluation_plan.md`

## 12. Phase-by-Phase Delivery Roadmap
### Phase 0 - foundation
Goal:
- keep the repo runnable locally with clear frontend/backend/data separation

Success state:
- frontend runs
- backend runs
- SQLite and uploads work
- core docs are aligned

### Phase 1 - working MVP shell
Goal:
- preserve an end-to-end working triage flow before deeper dataset and model work

Focus:
- intake
- diagnosis baseline
- confidence gate
- deterministic routing/workflow
- next-action artifact generation

### Phase 2 - baseline stabilization
Goal:
- harden the existing MVP before Round 1 dataset integration

Focus:
- error handling
- incident/history consistency
- evidence display
- cleaner UI states
- regression coverage on critical paths

### Phase 3 - Round 1 integration
Goal:
- convert organizer data into structured internal intelligence

Focus:
- manifest and label-map creation
- taxonomy normalization
- OCR/VLM integration hardening
- first classifier-ready dataset shape
- KB enrichment from solved explanations

### Phase 4 - mentoring and Round 2 readiness
Goal:
- remain safe and usable when new examples arrive

Focus:
- unseen-case resilience
- conservative fallback behavior
- fast taxonomy/KB updates
- classifier-as-optional support

### Phase 5 - pre-finals refinement
Goal:
- improve demo clarity, evaluation quality, and artifact quality without destabilizing the MVP

Focus:
- artifact refinement
- routing rationale clarity
- evidence highlighting
- report/demo outputs

### Phase 6 - late-data response
Goal:
- absorb Round 3 style updates without rewriting the system

Focus:
- fast taxonomy refresh
- threshold/rule adjustments
- stable conservative fallback

## 13. Build Order and Milestones
### Build order
Build first:
1. intake and evidence flow
2. real diagnosis inputs: VLM and OCR
3. confidence and routing hardening
4. taxonomy and dataset manifest
5. lightweight classifier baseline
6. artifact/report/demo support

### Milestone A - local workflow MVP
Success means:
- app runs locally
- upload works
- diagnosis returns usable structured output
- routing/workflow returns usable next action
- history/replay works

### Milestone B - pre-Round-1 stability
Success means:
- critical flows are stable
- evidence is visible
- logs/audits are captured
- core verification stays green

### Milestone C - post-Round-1 intelligence upgrade
Success means:
- taxonomy exists
- manifest and label map exist
- OCR/VLM path is real
- first supervised baseline exists
- KB is enriched from organizer solutions

### Milestone D - mentoring-ready robustness
Success means:
- new cases do not break the flow
- uncertain cases degrade safely
- routing remains explainable
- team can justify model and routing boundaries clearly

### Milestone E - final demo polish
Success means:
- UI is clear
- artifacts are differentiated
- evidence display is credible
- screenshots/exports/report figures are ready

## 14. Working Rules During Implementation
### Preserve end-to-end flow
Do not over-focus on one model component at the expense of the workflow.

### Keep the classifier optional until it proves value
The product must still work without the supervised classifier.

### Keep routing deterministic
Do not replace explicit routing policy with free-form LLM decisions.

### Keep guidance controlled
Use structured templates and curated snippets, not open-ended repair generation.

### Keep storage and infrastructure simple
Avoid unnecessary infra expansion before the product and evaluation story are stable.

## 15. Training and Evaluation Plan
Main rule:
- do not train a large end-to-end model from scratch

Use 5-fold cross-validation for the first supervised visual baseline.

Evaluate:
- visual classifier baseline
- VLM/OCR baseline
- hybrid OmniTriage system

Special handling:
- evaluate `WC Apps Error Logs` separately through OCR/text behavior
- evaluate `Charger No Pulse` with explicit acknowledgment that follow-up/context is part of correct handling

## 16. Demo Video and Report Plan
Recommended demo story:
- hazardous physical case -> technician
- screenshot/app-log case -> remote ops
- uncertain symptom-heavy case -> follow-up then safe escalation

Recommended report structure:
1. problem statement
2. workflow-first product thesis
3. architecture
4. taxonomy/data strategy
5. model strategy
6. routing and safety logic
7. evaluation
8. case studies
9. risks/mitigation
10. conclusion

## 17. What to Postpone Deliberately
Do not let these block the MVP:
- full anomaly pipeline
- cloud deployment
- Docker as a requirement
- Postgres migration
- full manual-grounded RAG
- late large retraining cycles

## 18. Immediate Next Actions
1. Import Round 1 data into the repo
2. Build `manifest.csv` and `label_map.yaml`
3. Encode the approved taxonomy and mapping rules
4. Integrate real OCR
5. Integrate real VLM/API diagnosis provider
6. Verify issue-family -> confidence -> routing behavior on real organizer cases
7. Build the first lightweight visual baseline
8. Evaluate with 5-fold CV
9. Compare against the VLM baseline
10. Add screenshot/export support for report/demo artifacts

## 19. Bottom Line
OmniTriage should be built and presented as a confidence-aware EV charger triage system.

The strongest path is:
- workflow first
- taxonomy explicit
- VLM/OCR for broad understanding
- lightweight classifier only where supported by data
- uncertainty handled honestly
- routing kept deterministic
- demo and report focused on believable end-to-end operational value
