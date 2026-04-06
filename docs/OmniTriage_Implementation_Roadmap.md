# OmniTriage — Implementation Roadmap

## 1. Purpose
This roadmap converts the locked product, architecture, and tech stack into a practical execution sequence.

It is intentionally aligned with the competition reality:
- the MVP must work before all later data is available
- Round 1 gives faulty charger photos with solved explanations
- Round 2 introduces new data during mentoring
- Round 3 may arrive very late before D-Day

So the roadmap is designed around:
- cold-start capability first
- dataset-driven refinement second
- late-data resilience third

## 2. Roadmap principles
### 2.1 Build the full workflow early
Do not wait to train the “perfect model” before building the product shell.

### 2.2 Prioritize end-to-end flow over isolated model performance
A working flow is more valuable early than a partially trained model without routing/output.

### 2.3 Make every phase leave behind a usable artifact
Each stage should result in something demonstrable:
- a working flow
- a measurable diagnosis layer
- a routing engine
- a guidance artifact
- a confidence-safe output

### 2.4 Add dataset-backed intelligence after the system already works
The product must not depend on Round 1 just to exist.

## 3. Final target architecture the roadmap is building toward
### Locked target
- Architecture: modular monolith
- Frontend: Next.js + TypeScript
- Backend: FastAPI + Python
- AI: staged hybrid
- DB: SQLite first
- File storage: local filesystem
- Guidance: curated KB + retrieval-backed templates

## 4. Phase-by-phase roadmap

# Phase 0 — Foundation / repo setup
## Goal
Create a runnable project skeleton and working local development environment.

## Deliverables
- repo structure created
- frontend app bootstrapped
- backend app bootstrapped
- separate `.env` files
- SQLite configured
- local uploads folder configured
- initial AGENTS / README / docs updated as needed

## Build now
### Frontend
- scaffold Next.js app
- create shared layout and app shell
- define route structure

### Backend
- scaffold FastAPI app
- define modular folders:
  - intake
  - diagnosis
  - confidence
  - routing
  - guidance
  - storage
  - db

### Data/storage
- SQLite file
- upload directories
- simple DB models for incident + file metadata

## Output of this phase
A repository that runs locally with:
- frontend dev server
- backend dev server
- database and upload directories ready

# Phase 1 — MVP workflow shell (before dataset)
## Goal
Make the full product flow work end-to-end without depending on Round 1 training data.

## Deliverables
- Feature 1 basic intake flow
- Feature 2 VLM/API-first diagnosis baseline
- Feature 3 confidence-aware safety gate (initial version)
- Feature 4 deterministic routing engine
- Feature 5 templated output artifacts backed by starter KB

## Build now
### Feature 1 — Smart Incident Intake
Implement:
- QR/session entry placeholder support
- image upload
- image quality gate
- adaptive follow-up questions
- submit incident to backend

### Feature 2 — Progressive Hybrid Diagnosis Engine (phase 1)
Implement:
- VLM/API-first diagnosis endpoint
- OCR / display reading
- issue-category output
- evidence summary output
- top likely fault output placeholder
- unknown-safe fallback behavior

### Feature 3 — Confidence-Aware Safety Gate (phase 1)
Implement:
- confidence bands
- numeric score handling
- medium-confidence branch that can trigger 1–2 follow-up questions
- low-confidence escalation logic

### Feature 4 — Deterministic Resolver Routing
Implement:
- Tier 1: EV Driver
- Tier 2: Local Site Resolver
- Tier 3: Remote Ops
- Tier 4: Technician
- site capability handling
- safety override rules

### Feature 5 — Guided Resolution & Escalation Output
Implement:
- user action card
- local SOP card
- remote ops action pack
- technician dispatch packet
- starter structured KB
- retrieval-backed templates

## Output of this phase
A fully runnable local MVP that can demonstrate:

**image + symptoms -> diagnosis -> confidence -> routing -> action artifact**

Even if the diagnosis model is still mostly VLM/API-first.

# Phase 2 — Stabilize the baseline MVP
## Goal
Harden the end-to-end flow before the first dataset-driven training work begins.

## Deliverables
- clean UI states
- upload success/failure handling
- basic logging
- consistent data models
- better evidence display
- first internal demo path

## Build now
- clean error handling across frontend/backend
- image preview and incident state handling
- local annotation/evidence display plumbing
- resolver-specific output polish
- SQLite incident logging
- test critical paths:
  - upload
  - diagnosis response
  - routing output
  - action artifact rendering

## Output of this phase
A stable baseline MVP suitable for:
- internal dry runs
- mentor pre-checks
- dataset arrival integration

# Phase 3 — Round 1 integration
## Goal
Convert Round 1 data into structured intelligence and improve diagnosis quality.

## Inputs expected from organizer
- faulty EV charger photos
- solved explanations

## Deliverables
- cleaned fault taxonomy
- known-fault label mapping
- classifier-training-ready dataset
- updated troubleshooting KB entries
- measurable dataset-backed accuracy on known faults

## Build after receiving Round 1
### 3.1 Taxonomy design
Map solved explanations into a normalized internal taxonomy, for example:
- operational
- connectivity
- software
- physical damage
- safety / hardware risk
- unknown

Also create more specific fault types where possible.

### 3.2 Data cleaning
Prepare:
- image organization
- label cleanup
- duplicate handling
- ambiguous-case tagging
- unknown bucket where necessary

### 3.3 Guidance library enrichment
Convert solved explanations into:
- KB entries
- warnings
- escalation rules
- inspection notes
- evidence keyword hints

### 3.4 Classifier integration
Add the first known-fault classifier for repeated/common issues.

### 3.5 Confidence tuning
Use the dataset to improve:
- confidence mapping
- medium/low thresholds
- routing safety behavior on common errors

## Output of this phase
The MVP now has:
- a working zero-shot baseline
- a dataset-backed known-fault layer
- a richer guidance library

# Phase 4 — Mentoring Session 1 readiness / Round 2 readiness
## Goal
Be ready to test the MVP live on new data during mentoring.

## Deliverables
- model/classifier toggle support
- confidence-safe fallback for unseen cases
- robust routing regardless of classifier certainty
- fast update path for KB and taxonomy

## Build now
- keep VLM baseline always available
- make classifier additive, not required
- ensure low-confidence cases route safely
- ensure the system still works if the classifier misses a new pattern
- prepare manual taxonomy/KB update process for new data

## Output of this phase
A mentoring-ready MVP that can survive new examples without collapsing.

# Phase 5 — After Round 2 / pre-finals refinement
## Goal
Improve product quality, classifier accuracy where safe, and demo clarity.

## Deliverables
- refined KB
- improved known-fault mapping
- cleaner confidence displays
- stronger resolver-specific outputs
- better incident logging and demo polish

## Build now
- refine action cards
- refine remote ops packs
- refine technician packets
- add evidence highlights / annotations where helpful
- improve routing rationale display
- improve UI polish for demo clarity

## Optional if time allows
- anomaly support as a complement for novel physical damage
- richer evidence overlays
- better priority scoring

## Output of this phase
A polished MVP that is still robust, not just prettier.

# Phase 6 — Round 3 / late-data response plan
## Goal
Handle very late-arriving data safely and fast.

## Design rule
Do not depend on retraining the whole system right before D-Day.

## What to do when late data arrives
### If the new data fits known classes
- update mappings
- test existing classifier + VLM against examples
- adjust KB entries and thresholds if needed

### If the new data introduces unfamiliar faults
- rely on:
  - VLM baseline
  - confidence-safe fallback
  - deterministic routing
  - KB/routing updates
- classify them conservatively
- avoid risky low-tier guidance

### What to avoid
- large rushed retraining cycles
- architecture changes
- major infra changes
- new dependencies

## Output of this phase
A late-data-ready system that can still function safely even under distribution shift.

## 5. Build order by feature
### 5.1 Build first
1. frontend intake shell
2. backend upload + incident endpoint
3. VLM baseline diagnosis endpoint
4. confidence banding
5. deterministic routing
6. templated output artifacts
7. starter KB

### 5.2 Build second
1. better evidence summaries
2. local file metadata model
3. incident history/logging
4. improved UI polish
5. annotation/image highlight support

### 5.3 Build after Round 1 arrives
1. taxonomy normalization
2. known-fault classifier
3. dataset-driven confidence tuning
4. richer KB entries from solved explanations

### 5.4 Build only if time allows
1. anomaly support
2. cloud deployment
3. Dockerization
4. Postgres migration
5. manual-grounded richer retrieval layer

## 6. What to deliberately postpone
These should not block the MVP:
- Docker as a requirement
- cloud deployment
- Postgres
- full conformal prediction
- full anomaly detection
- manufacturer-manual-grounded RAG
- multi-service architecture

## 7. Recommended milestone checklist
### Milestone A — Local workflow MVP
Success means:
- app runs locally
- image upload works
- diagnosis returns something usable
- routing works
- output card/packet renders

### Milestone B — Pre-Round-1 stability
Success means:
- errors handled cleanly
- evidence shown clearly
- logs are captured
- all main routes work reliably

### Milestone C — Post-Round-1 intelligence upgrade
Success means:
- taxonomy exists
- known-fault classifier added
- KB enriched from solved explanations
- measurable evaluation on Round 1

### Milestone D — Mentoring-ready robustness
Success means:
- new/unseen cases do not break flow
- routing stays safe on uncertainty
- medium-confidence confirmation works
- team can explain architecture clearly

### Milestone E — Final demo polish
Success means:
- UI is clear
- action artifacts look resolver-specific
- evidence display is strong
- demo path is smooth
- fallback behavior is ready

## 8. Working rules during implementation
### 8.1 Preserve end-to-end flow
Do not over-focus on one model component at the expense of the full workflow.

### 8.2 Keep the classifier optional until it proves value
The app must still work without it.

### 8.3 Keep routing deterministic
Do not replace the routing engine with free-form LLM decisions.

### 8.4 Keep guidance controlled
Templates define structure. Retrieval adds trusted specifics.

### 8.5 Keep uploads and DB simple
Avoid overengineering storage during MVP.

## 9. Final roadmap summary
### The strategy
1. Build the product workflow first
2. Add the cold-start diagnosis baseline
3. Add the confidence and routing safety layer
4. Add the resolver-specific outputs
5. Integrate Round 1 to improve accuracy and guidance
6. Use Round 2 / Round 3 to test robustness, not to rewrite the system

### The core idea
The MVP should become useful before the organizer’s full data story is known.

That is the safest and strongest way to survive the staged competition format.
