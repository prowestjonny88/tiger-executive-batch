# OmniTriage Setup Guide

Implementation note:
- the live app now follows the Round 1 hard-replacement runtime
- the primary contract is taxonomy-first:
  - `issue_family`
  - `fault_type`
  - `evidence_type`
  - `hazard_level`
  - `resolver_tier`
- the active diagnosis path is package-backed retrieval plus optional Gemini VLM assist
- the active primary store is Postgres + pgvector
- old SQLite records are only used for replay/history compatibility

## Prerequisites

- Windows PowerShell
- Python 3.12
- Node.js and npm
- Git
- Docker Desktop
- Optional: Gemini API key for live VLM diagnosis and Gemini embedding provider

## 1. Clone and enter the repo

```powershell
git clone https://github.com/prowestjonny88/tiger-executive-batch
cd tiger-executive-batch
```

## 2. Start local Postgres + pgvector

From the repo root:

```powershell
docker compose up -d omnitriage-postgres
```

Default local database target used by the backend:

```env
DATABASE_URL=postgresql://omnitriage:omnitriage@localhost:5432/omnitriage
```

## 3. Backend setup

Create the virtual environment and install the backend package with dev dependencies:

```powershell
C:\Users\JON\AppData\Local\Programs\Python\Python312\python.exe -m venv backend\.venv
cd backend
.\.venv\Scripts\python.exe -m pip install -e .[dev]
```

Recommended `backend/.env`:

```env
DATABASE_URL=postgresql://omnitriage:omnitriage@localhost:5432/omnitriage
LEGACY_SQLITE_PATH=backend/omnitriage.sqlite3
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.0-flash
OMNITRIAGE_EMBEDDING_PROVIDER=hash
```

Notes:
- use `OMNITRIAGE_EMBEDDING_PROVIDER=hash` for deterministic local verification
- switch to `gemini` only when you want the embedding provider to call Gemini
- the Round 1 package is expected at `data/round1/`

Run the backend:

```powershell
.\run-backend.ps1
```

Verify:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/v1/health
.\.venv\Scripts\python.exe -m pytest -q backend/tests/test_api.py backend/tests/test_triage.py backend/tests/test_gemini.py
.\.venv\Scripts\pyright.exe -p .\pyrightconfig.json
```

## 4. Frontend setup

From the repo root:

```powershell
cd frontend
npm.cmd install
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
API_BASE_URL=http://127.0.0.1:8001
```

Run the frontend:

```powershell
.\run-frontend.ps1
```

Useful routes:

- `http://localhost:3000/`
- `http://localhost:3000/upload`
- `http://localhost:3000/intake`
- `http://localhost:3000/result`
- `http://localhost:3000/demo`
- `http://localhost:3000/history`

Important:
- the frontend no longer synthesizes preview, triage, or upload results locally
- `NEXT_PUBLIC_API_BASE_URL` or `API_BASE_URL` must point to a reachable backend for `/upload`, `/intake`, and `/result` flows to work

## 5. How to tell Gemini is working

Configuration checks:
- `backend/.env` contains a valid `GEMINI_API_KEY`
- The Python terminal output immediately reports `[gemini_client] Gemini client initialized successfully` automatically on boot if the key is valid.

Runtime checks:
- `diagnosis.diagnosis_source` should switch from retrieval-only fallback to a Gemini-assisted source when Gemini is actually used
- `diagnosis.raw_provider_output` should contain structured VLM output instead of a Gemini failure message
- `diagnosis.retrieval_metadata.provider_name` should show the active embedding provider path

Practical note:
- the repo defaults cleanly without Gemini
- Gemini is assistive in the current runtime; it is not required for the app to function locally

## 6. Round 1 package expectations

The active package path is:

- `data/round1/manifest.csv`
- `data/round1/roi_annotations.csv`
- `data/round1/roi_ontology.csv`
- `data/round1/roi_label_normalization.csv`
- `data/round1/label_map.yaml`
- `data/round1/known_cases_seed.jsonl`
- `data/round1/images/*`

The root `round1_v1/` directory may still exist in the repo as the imported source snapshot, but runtime code should treat `data/round1/` as canonical.

## 7. Troubleshooting

- If backend startup fails with Postgres connection errors, make sure Docker Desktop is running and `docker compose up -d omnitriage-postgres` has completed successfully.
- If API tests fail immediately with database errors, check `DATABASE_URL` and confirm the Postgres container is healthy.
- If the result/history UI still mentions `issue_type`, `basic_conditions`, or `resolved/escalate`, you are running stale frontend code.
- If uploads do not render in the result page, confirm the backend is running and `frontend/.env.local` points to `http://127.0.0.1:8001`.
- If preview, triage, or upload returns `503`, the frontend cannot reach the live backend and will not fall back to a local synthetic engine.
- If Gemini is configured but the app still behaves like retrieval-only fallback, inspect the latest triage payload for `diagnosis.raw_provider_output` and `diagnosis.diagnosis_source`.
- If docs conflict, use this order:
  1. `docs/OmniTriage_Comprehensive_Execution_Plan.md`
  2. `docs/progress_tracker.md`
  3. `docs/prd_task_breakdown.md`
