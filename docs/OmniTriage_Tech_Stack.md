# OmniTriage — Tech Stack Document

## Implementation Status Note
The current stack still remains valid, but the live application contract is now organizer-native rather than resolver-tier-first.

Current primary fields exposed across the app:
- `diagnosis.issue_type`
- `diagnosis.basic_conditions`
- `workflow.outcome`
- `workflow.rationale`

## 1. Purpose
This document captures the approved tech stack for OmniTriage and distinguishes between:
- Locked decisions
- Recommended additions
- Deferred / later-stage choices

This keeps the stack honest and prevents accidental overclaiming.

## 2. Locked stack decisions
### 2.1 System shape
- Architecture style: Modular monolith

### 2.2 Frontend
- Framework: Next.js
- Language: TypeScript

### 2.3 Backend
- Framework: FastAPI
- Language: Python

### 2.4 AI diagnosis stack
- Current baseline: Multimodal VLM / API-first diagnosis
- Later addition: Known-fault classifier after Round 1 dataset arrives
- Optional later addition: Anomaly support for novel physical faults

### 2.5 Database / persistence
- MVP database: SQLite
- Later production path: PostgreSQL

### 2.6 File handling
- MVP file storage: local filesystem
- DB stores: file metadata + path references
- Later production path: object/cloud storage if needed

### 2.7 Guidance / retrieval layer
- Strategy: Curated knowledge base + retrieval-backed templates
- KB format for MVP: JSON / YAML structured entries
- Retrieval matching: fault type + tier + evidence keywords + symptoms

### 2.8 Development posture
- Run mode: separate frontend/backend processes
- Primary dev environment: local-first
- Docker: not required for MVP
- Deployment: local first, cloud later if needed

## 3. Locked stack by layer

| Layer | Locked choice | Why it was chosen |
|---|---|---|
| System architecture | Modular monolith | Clean boundaries without microservice overhead |
| Frontend | Next.js + TypeScript | Strong app workflow fit, mobile web friendly, separate from backend |
| Backend | FastAPI + Python | Best fit for AI-heavy orchestration and file handling |
| Diagnosis baseline | VLM / API-first | Works before dataset arrives |
| Accuracy improvement layer | Later known-fault classifier | Improves accuracy after Round 1 without blocking MVP |
| Database | SQLite | Fast, cheap, local-first MVP |
| Upload storage | Local filesystem | Easy to debug and cheap for MVP |
| Guidance layer | Curated KB + retrieval-backed templates | Safer than full RAG, richer than static templates |
| Config | Separate `.env` files | Clean separation between frontend and backend settings |

## 4. Frontend stack details
### 4.1 Locked
- Next.js
- TypeScript

### 4.2 Recommended but not separately debated
These are reasonable defaults, but should be treated as working recommendations, not hard locks:
- Tailwind CSS for fast UI styling
- component-based UI architecture
- `lib/` folder for API client + UI helpers

### 4.3 Frontend responsibilities
The frontend owns:
- QR-triggered entry flow
- photo upload UI
- image quality feedback
- adaptive follow-up questions
- confidence + routing display
- resolver-specific output display

The frontend does not own:
- AI inference
- safety routing logic
- retrieval decisions
- persistence

## 5. Backend stack details
### 5.1 Locked
- FastAPI
- Python

### 5.2 Recommended backend support libraries
These are not hard-locked but are the most practical complements:
- Pydantic for request/response schemas (naturally aligned with FastAPI)
- `python-multipart` for file uploads
- a lightweight DB access layer
- image-processing/helper libraries if needed for preprocessing or annotation

### 5.3 Not yet locked
We did not fully lock:
- ORM choice (`SQLAlchemy` / `SQLModel` / other)
- migration tooling (`Alembic` later is likely, but not required immediately)
- background task queue
- async worker stack

For MVP, avoid adding more infrastructure than necessary.

## 6. AI stack details
### 6.1 Locked high-level AI strategy
#### Staged hybrid
- Now: VLM/API-first diagnosis
- After Round 1: add known-fault classifier
- Later if needed: anomaly support

### 6.2 Current baseline
Use a multimodal vision model/API for:
- OCR / display reading
- visible issue interpretation
- issue-category suggestion
- evidence summary generation

### 6.3 Later classifier layer
Add a lightweight classifier after Round 1 arrives for:
- repeated/common classes
- measurable accuracy improvement
- stronger known-fault performance

### 6.4 Optional anomaly layer
Anomaly support is explicitly deferred / optional, not MVP-critical.

### 6.5 Confidence stack
Locked behavior:
- numeric confidence score
- confidence bands (high / medium / low)
- medium confidence triggers 1–2 extra confirmation questions
- safety-critical visible evidence overrides confidence thresholds

### 6.6 Not yet locked
We did not hard-lock:
- exact VLM provider
- exact classifier model family
- exact anomaly implementation
- full conformal prediction as MVP requirement

Those should be chosen later based on:
- dataset quality
- implementation speed
- cost
- local/dev constraints

## 7. Data and storage stack details
### 7.1 Locked
- SQLite first
- Postgres later if/when needed

### 7.2 Why SQLite first
- very low ops overhead
- good for local-first MVP
- fast to set up
- enough for early incident/session logging

### 7.3 Why Postgres later
- better concurrency
- stronger production readiness
- cleaner team/shared usage at scale

### 7.4 File storage
Locked MVP approach:
- save files to local filesystem
- store file metadata/path in SQLite

### 7.5 Knowledge base storage
Locked MVP approach:
- structured entries in JSON or YAML
- stored as versioned repository assets
- retrieval uses fault, tier, evidence keywords, symptoms

## 8. Config and environment strategy
### 8.1 Locked
- `frontend/.env.local`
- `backend/.env`

### 8.2 Recommended environment variables
#### Frontend
- `NEXT_PUBLIC_API_BASE_URL`
- any non-secret frontend-only flags

#### Backend
- `APP_ENV`
- `DATABASE_URL`
- `UPLOAD_DIR`
- `AI_MODE`
- `ENABLE_CLASSIFIER`
- `ENABLE_ANOMALY`
- provider API keys
- optional demo flags later

### 8.3 Rule
Secrets stay backend-only.

## 9. Development workflow stack
### 9.1 Locked
- separate frontend/backend processes
- no Docker required for MVP
- local-first development

### 9.2 Local run model
- frontend runs in one terminal
- backend runs in another terminal
- SQLite local
- uploads local
- env files local

### 9.3 Deferred
- Docker as a hard requirement
- full cloud deployment
- multi-service orchestration

## 10. Guidance / retrieval stack
### 10.1 Locked
Curated KB + retrieval-backed templates

### 10.2 Output model by tier
- Tier 1: user action card
- Tier 2: local SOP card
- Tier 3: remote ops action pack
- Tier 4: dispatch packet + annotated evidence highlight

### 10.3 Why this stack was chosen
Because it is:
- safer than fully generative guidance
- more adaptive than static text
- less brittle than full manual-grounded RAG in MVP

## 11. Deferred / later-stage stack decisions
These are intentionally not locked for MVP:
- Docker from day one
- cloud object storage from day one
- PostgreSQL from day one
- hosted deployment as day-one requirement
- full manufacturer-manual-grounded RAG
- mandatory anomaly detection in v1
- full conformal prediction in v1
- microservices

## 12. Final stack summary
### 12.1 Locked stack
- Frontend: Next.js + TypeScript
- Backend: FastAPI + Python
- AI: VLM/API-first now, classifier later
- DB: SQLite first
- Files: local filesystem
- Guidance: structured KB + retrieval-backed templates
- Dev: separate local processes, no Docker required for MVP

### 12.2 Philosophy
The approved stack favors:
- speed to MVP
- safe fallback behavior
- low infra overhead
- clarity for judges
- a clean path to later hardening and deployment
