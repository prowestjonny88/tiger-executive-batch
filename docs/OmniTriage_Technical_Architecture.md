# OmniTriage — Technical Architecture Document

## 1. Purpose
This document captures the locked technical architecture for OmniTriage based on the full design discussion.

OmniTriage is an AI-assisted EV charger troubleshooting platform designed to:
- collect charger incident evidence from a mobile web flow
- diagnose likely charger issues
- express calibrated confidence and uncertainty
- route incidents to the safest appropriate resolver
- generate resolver-specific guidance or escalation output

This architecture is intentionally optimized for:
- an early working MVP
- staged dataset releases
- safe fallback behavior on uncertain cases
- a clean path from local MVP to a more production-ready deployment later

## 2. Architecture principles
### 2.1 Product-first architecture
The system is not “just a classifier.”
It is an end-to-end troubleshooting workflow:

**Intake -> Diagnosis -> Confidence Gate -> Resolver Routing -> Guided Output**

### 2.2 Modular monolith for MVP
The system is implemented as:
- one frontend application
- one backend application
- with clear internal module boundaries

### 2.3 Local-first development
The product must run fully on a local machine before any cloud deployment work is required.

### 2.4 Staged AI evolution
The diagnosis engine must work:
- before the dataset arrives
- after Round 1 data arrives
- under later data shifts in Round 2 / Round 3

### 2.5 Safety over overconfidence
The architecture is designed to avoid unsafe low-tier actions on uncertain or potentially hazardous cases.

## 3. High-level system shape
### 3.1 Approved system shape
- Frontend: separate web app
- Backend: separate API service
- Backend style: modular monolith
- Database: SQLite first, Postgres-ready later
- Uploads: local filesystem first, metadata stored in DB
- Knowledge layer: curated troubleshooting knowledge base with retrieval-backed templates

### 3.2 High-level component map
```text
[ Next.js Frontend ]
        |
        v
[ FastAPI Backend ]
   |- intake
   |- diagnosis
   |- confidence
   |- routing
   |- guidance
   |- storage
   |- db
        |
        +--> SQLite
        +--> Local uploads/
        +--> Curated knowledge base
        +--> External VLM/API provider
        +--> Optional later classifier
```

## 4. Frontend architecture
### 4.1 Approved frontend stack
- Next.js
- TypeScript

### 4.2 Frontend role
The frontend is responsible for:
- QR-triggered entry into the troubleshooting flow
- mobile-first intake UX
- photo upload
- image quality feedback
- adaptive follow-up questions
- diagnosis display
- confidence display
- resolver routing display
- guidance / escalation artifact rendering

### 4.3 Frontend boundaries
The frontend does not own:
- AI diagnosis logic
- safety decision logic
- resolver routing rules
- retrieval decision logic
- data persistence beyond client-side session state

Those responsibilities belong to the backend.

## 5. Backend architecture
### 5.1 Approved backend stack
- FastAPI
- Python

### 5.2 Backend role
The backend is responsible for:
- file intake and storage
- model/API orchestration
- issue diagnosis
- confidence and uncertainty processing
- deterministic routing
- retrieval-backed output generation
- persistence of incidents, files, and outputs

### 5.3 Backend module boundaries
#### `intake`
- upload endpoint
- QR/session metadata handling
- image quality checks
- adaptive follow-up question logic inputs

#### `diagnosis`
- baseline VLM/API diagnosis
- OCR / visible code extraction
- evidence summary generation
- later integration of known-fault classifier
- optional anomaly support later

#### `confidence`
- convert raw confidence into product-relevant confidence states
- apply safety-aware confidence logic
- handle medium-confidence confirmation flow
- expose numeric confidence and band

#### `routing`
- deterministic resolver routing
- safety override rules
- resolver availability logic
- site capability handling
- priority assignment

#### `guidance`
- retrieve appropriate troubleshooting content
- assemble action cards, SOP cards, remote ops packs, and dispatch packets
- attach retrieved snippets into controlled templates

#### `storage`
- save and serve uploaded/derived images
- manage file metadata references
- support annotated evidence images later

#### `db`
- database models
- persistence layer
- migration path to Postgres later

## 6. Feature-to-architecture mapping
### 6.1 Feature 1 — Smart Incident Intake
Approved behavior:
- QR-triggered mobile web interface
- charger metadata prefilled when available
- image upload
- image quality gate
- adaptive follow-up questions when evidence is weak or incomplete

Architecture mapping:
- frontend captures input
- backend `intake` module validates and stores intake data

### 6.2 Feature 2 — Progressive Hybrid Diagnosis Engine
Approved behavior:
- now: VLM/API-first diagnosis baseline
- after Round 1: add known-fault classifier
- later if needed: anomaly support as complement, not replacement

Expected output:
- likely issue category
- top likely fault
- evidence summary
- uncertainty state / unknown flag support

Architecture mapping:
- backend `diagnosis` module
- external VLM/API integration first
- later local/hosted classifier integration

### 6.3 Feature 3 — Confidence-Aware Safety Gate
Approved behavior:
- confidence band + numeric score
- medium confidence triggers 1–2 extra confirmation questions
- low-confidence risky cases escalate
- safety-critical visible cases override confidence thresholds

Architecture mapping:
- backend `confidence` module
- frontend renders confidence state and confirmation prompts

### 6.4 Feature 4 — Deterministic Resolver Routing
Approved routing tiers:
- Tier 1: EV Driver
- Tier 2: Local Site Resolver
- Tier 3: Remote Ops
- Tier 4: Technician

Important rule:
- Tier 2 may not exist at some sites
- routing must account for resolver availability and escalate to the next safe available tier

Architecture mapping:
- backend `routing` module
- site capability profile is included in routing logic

### 6.5 Feature 5 — Guided Resolution & Escalation Output
Approved behavior:
- Tier 1 / 2: templated cards + small retrieved snippets
- Tier 3: remote ops action pack
- Tier 4: concise dispatch packet + annotated image / evidence highlight

Architecture mapping:
- backend `guidance` module
- curated KB + retrieval-backed templates
- `storage` module supports annotated evidence artifacts

## 7. AI layer architecture
### 7.1 Approved AI architecture
#### Phase 1 — pre-dataset
- VLM/API-first multimodal diagnosis
- OCR / screen reading
- broad issue inference
- evidence summary generation

#### Phase 2 — after Round 1
- add known-fault classifier
- improve accuracy on repeated/common classes
- fuse classifier signal with VLM baseline

#### Phase 3 — optional later
- anomaly support for novel physical issues
- used as a complement for escalation and evidence, not as the main diagnosis engine

### 7.2 Why this architecture was chosen
Because the competition is staged:
- the product must work before labeled data exists
- the product should improve once Round 1 arrives
- the product must remain robust if later data differs from Round 1

## 8. Confidence and safety architecture
### 8.1 Confidence model
Approved confidence states:
- High
- Medium
- Low

Also expose:
- numeric confidence score

### 8.2 Approved behavior
- High confidence: proceed normally
- Medium confidence: ask 1–2 extra confirmation questions before routing
- Low confidence: escalate conservatively
- Safety-critical visible evidence overrides confidence score and forces upward escalation

### 8.3 Deferred behavior
Not part of MVP lock:
- full conformal prediction as a hard requirement

## 9. Routing architecture
### 9.1 Resolver model
Routing is based on:
- top likely fault
- issue category
- evidence summary
- confidence state
- safety flags
- confirmation answers
- site capability profile

### 9.2 Site capability profile
The routing layer should support fields such as:
- EV driver actions allowed? yes/no
- local site resolver available? yes/no
- remote ops available? yes/no
- technician dispatch available? assumed yes

### 9.3 Critical override behavior
Examples that force Tier 4:
- visible cable damage
- connector deformation
- overheating / burn marks
- exposed internal components
- water ingress
- low-confidence safety ambiguity

## 10. Guidance / retrieval architecture
### 10.1 Approved guidance strategy
Curated knowledge base + retrieval-backed templates

### 10.2 Why this was chosen
This is safer than:
- full open-ended generation
- full manufacturer-manual RAG in MVP

and more adaptive than:
- static templates only

### 10.3 Approved KB structure
Structured entries should be stored in JSON or YAML, not loose prose only.

Recommended fields:
- `id`
- `fault_type`
- `resolver_tier`
- `title`
- `issue_category`
- `symptom_keywords`
- `safe_steps`
- `warning`
- `escalation_rule`
- `evidence_patterns`
- `priority_hint`
- `remote_action_notes`
- `inspection_notes`

### 10.4 Approved retrieval logic
Retrieval should match on:
- fault type
- resolver tier
- evidence keywords
- symptoms

## 11. Data and storage architecture
### 11.1 Approved MVP database
- SQLite

### 11.2 Approved later production path
- Postgres when moving beyond local MVP

### 11.3 Upload storage
Approved MVP strategy:
- local filesystem
- SQLite stores metadata and file references only

### 11.4 File storage pattern
```text
backend/uploads/incidents/<date>/<incident_id>/
  original.jpg
  processed.jpg
  annotated.jpg
```

The exact derived files can be phased in, but originals should not be overwritten.

### 11.5 Why this was chosen
This keeps:
- the database light
- the file system debuggable
- the migration path to object storage clean later

## 12. Development architecture
### 12.1 Approved dev posture
- separate frontend/backend processes
- no Docker required for MVP
- local-first run path

### 12.2 Config strategy
Approved:
- `frontend/.env.local`
- `backend/.env`

Use feature flags for:
- AI mode
- demo mode
- classifier enablement
- anomaly enablement later
- API base URLs
- upload/storage paths

### 12.3 Deployment posture
Approved for now:
- local-first only
- cloud deployment later after local stability is proven

## 13. Recommended repository structure
```text
project-root/
├─ frontend/
│  ├─ app/
│  ├─ components/
│  ├─ lib/
│  ├─ public/
│  ├─ styles/
│  ├─ .env.local
│  ├─ package.json
│  └─ tsconfig.json
│
├─ backend/
│  ├─ app/
│  │  ├─ main.py
│  │  ├─ core/
│  │  ├─ intake/
│  │  ├─ diagnosis/
│  │  ├─ confidence/
│  │  ├─ routing/
│  │  ├─ guidance/
│  │  ├─ storage/
│  │  ├─ db/
│  │  ├─ schemas/
│  │  └─ services/
│  ├─ uploads/
│  │  └─ incidents/
│  ├─ knowledge_base/
│  │  ├─ faults/
│  │  ├─ tiers/
│  │  └─ templates/
│  ├─ tests/
│  ├─ .env
│  ├─ requirements.txt
│  └─ alembic/   # optional later
│
├─ docs/
├─ data/
├─ scripts/
├─ README.md
└─ AGENTS.md
```

## 14. Deferred / not-yet-locked items
These are intentionally not part of the locked MVP architecture:
- Docker as a required day-one development dependency
- hosted deployment as an immediate requirement
- full conformal prediction in MVP
- anomaly detection as a mandatory v1 capability
- cloud object storage from day one
- manufacturer-manual-grounded RAG as a hard dependency
- microservices

## 15. Final architecture summary
### Locked decisions
- System shape: modular monolith
- Frontend: Next.js + TypeScript
- Backend: FastAPI + Python
- AI layer: staged hybrid
- DB: SQLite first, Postgres-ready later
- Uploads: local filesystem + DB metadata references
- Guidance: curated KB + retrieval-backed templates
- Dev posture: separate local frontend/backend processes, no Docker required for MVP
- Deployment posture: local-first, cloud later

### Core value of this architecture
This architecture is optimized to:
- ship a working MVP early
- remain understandable to judges
- evolve safely when datasets arrive
- reduce unnecessary complexity
- keep the system explainable and safety-aware
