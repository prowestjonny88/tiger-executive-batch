# OmniTriage - Tech Stack Document

## Implementation Status Note
This document is updated to match the current live runtime, not the retired organizer/classifier-first stack.

Current live shape:
- frontend: Next.js + TypeScript
- backend: FastAPI + Python
- dataset intelligence: `data/round1/`
- diagnosis: retrieval-first with optional Gemini VLM assist
- persistence: Postgres + pgvector
- compatibility: legacy SQLite replay/history reads only

## 1. Purpose
This document captures the approved current stack for the shipped Round 1 runtime and distinguishes between:
- locked current choices
- supporting libraries
- deferred choices

## 2. Locked stack decisions

### 2.1 System shape
- Architecture style: modular monolith

### 2.2 Frontend
- Framework: Next.js
- Language: TypeScript

### 2.3 Backend
- Framework: FastAPI
- Language: Python

### 2.4 Intelligence layer
- Dataset-backed case intelligence from `data/round1/`
- Retrieval-first diagnosis path
- OCR/text extraction support
- Optional Gemini VLM synthesis
- Embedding abstraction layer

### 2.5 Database / persistence
- Primary runtime database: PostgreSQL
- Vector extension: pgvector
- Legacy compatibility source: SQLite read-only replay/history normalization

### 2.6 File handling
- local filesystem uploads
- backend serves stored evidence files directly

### 2.7 Development posture
- separate frontend/backend processes
- Dockerized Postgres for local development
- local-first development

## 3. Locked stack by layer

| Layer | Locked choice | Why it was chosen |
|---|---|---|
| System architecture | Modular monolith | Keeps the replacement manageable without microservice overhead |
| Frontend | Next.js + TypeScript | Good fit for multi-surface workflow UI |
| Backend | FastAPI + Python | Good fit for API orchestration and AI-facing logic |
| Dataset intelligence | Round 1 package in `data/round1/` | Gives a stable local source of truth for case semantics |
| Retrieval layer | Embedding-backed known-case retrieval | Supports package-backed reasoning from the first pass |
| Embedding abstraction | Provider interface with Gemini-capable implementation | Avoids hard vendor lock-in |
| Primary database | Postgres + pgvector | Matches the hard-replacement storage target |
| Upload storage | Local filesystem | Keeps evidence handling simple during MVP/demo stage |
| Guidance layer | Structured KB + resolver-tier artifacts | Keeps outputs deterministic and explainable |
| Config | `.env` per app plus Docker Compose | Practical local reproducibility |

## 4. Frontend stack details

### Locked
- Next.js App Router
- TypeScript

### Responsibilities
The frontend owns:
- intake flow
- upload flow
- follow-up question flow
- result view
- guidance view
- escalation view
- history/replay rendering

The frontend does not own:
- dataset interpretation
- retrieval logic
- routing logic
- persistence

### Current contract expectations
Frontend pages now expect:
- `diagnosis.issue_family`
- `diagnosis.fault_type`
- `diagnosis.evidence_type`
- `diagnosis.hazard_level`
- `routing.resolver_tier`
- `routing.routing_rationale`
- `routing.recommended_next_step`

## 5. Backend stack details

### Locked
- FastAPI
- Pydantic
- psycopg
- pgvector
- PyYAML

### Runtime support libraries
- `google-genai` for Gemini client access
- `python-dotenv` for local env loading
- `pillow` for image handling

### Not locked
- ORM choice
- migration tool choice
- async worker stack
- long-term hosted deployment target

## 6. Intelligence stack details

### Active diagnosis strategy
- package-backed retrieval is first-class
- Gemini VLM can add synthesis when available
- OCR/text extraction remains part of the diagnosis signal
- the active runtime no longer depends on the previous classifier path

### Embedding strategy
- use an embedding provider interface
- current implementation supports:
  - Gemini-backed embedding provider
  - deterministic fallback/hash embedding provider for local verification

### Important runtime rule
The old classifier code is archival only. It is not part of the active production diagnosis path.

## 7. Data and storage details

### Locked
- canonical package path: `data/round1/`
- canonical store: PostgreSQL
- vector-ready store: pgvector enabled

### Round 1 package files
- `manifest.csv`
- `roi_annotations.csv`
- `roi_ontology.csv`
- `roi_label_normalization.csv`
- `label_map.yaml`
- `known_cases_seed.jsonl`
- `images/`

### Storage responsibilities
Postgres stores:
- incidents
- triage audits
- known-case index snapshots

SQLite is retained only so older records can still render through replay/history normalization.

## 8. Local environment strategy

### Locked
- `frontend/.env.local`
- `backend/.env`
- Docker Compose for local Postgres

### Important variables

#### Frontend
- `NEXT_PUBLIC_API_BASE_URL`
- `API_BASE_URL`

#### Backend
- `DATABASE_URL`
- `LEGACY_SQLITE_PATH`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `OMNITRIAGE_EMBEDDING_PROVIDER`
- `UPLOAD_ROOT`

## 9. Deferred choices

Not locked yet:
- hosted cloud database target
- object storage migration
- long-term retrieval ranking strategy
- richer OCR pipeline
- manufacturer-manual grounding

## 10. Final stack summary

### Current live stack
- Frontend: Next.js + TypeScript
- Backend: FastAPI + Python
- Dataset intelligence: Round 1 package loaders
- Retrieval: embedding-backed known-case matching
- AI assist: optional Gemini VLM
- DB: Postgres + pgvector
- Files: local filesystem uploads
- Dev infra: Docker Compose for Postgres

### Philosophy
The current stack favors:
- a real package-backed runtime
- deterministic routing
- local reproducibility
- judge/demo credibility
- a cleaner path to future retrieval and OCR improvements
