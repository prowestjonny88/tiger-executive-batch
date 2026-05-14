# RExharge Theme 2 Triage

RExharge Theme 2 Triage is a VLM-assisted EV charger troubleshooting prototype for the organizer-scoped ESUM Theme 2 dataset. It inspects charger, EVDB, and isolator evidence; extracts visible observations and charger identity fields; maps the result to official Theme 2 fault types; and routes each case to either the customer or an after-sales team identifier.

The live runtime is now centered on:

- `input_component`: `charger`, `evdb`, `isolator`, or `unknown`
- `observation_result`: charger light state, EVDB protection state/spec, or isolator state
- `fault_type_v2`: organizer fault type such as `charger_issue`, `supply_issue`, `protection_issue`, or `power_cut`
- `recipient_type`: `customer`, `after_sales_team`, `none`, or `unknown`
- `assigned_team_id`: currently `AS_TEAM_01` for after-sales routing

## Repo Structure

- `frontend/` - Next.js app for upload, follow-up questions, result, guidance, escalation, history, and demo flows
- `backend/` - FastAPI backend for uploads, Theme 2 perception, organizer rule mapping, audit history, and persistence
- `data/round2/` - Theme 2 rule table and future manifest/evaluation assets
- `data/demo/` - text-first Theme 2 demo scenarios
- `docs/` - current Theme 2 setup and runtime notes
- `_archive/round1/` - archived Round 1 known-case retrieval runtime, tests, data, and old docs

## Current Runtime

The active path is:

```text
Upload / demo evidence
-> Theme 2 VLM or heuristic perception
-> deterministic organizer rule mapping
-> follow-up prompt generation
-> customer or after-sales output
-> Postgres incident/audit history
```

The live path no longer uses Round 1 known-case retrieval, pgvector indexing, issue-family routing, resolver tiers, or KB gates.

## Quick Start

### Backend

```powershell
C:\Users\JON\AppData\Local\Programs\Python\Python312\python.exe -m venv backend\.venv
cd backend
.\.venv\Scripts\python.exe -m pip install -e .[dev]
.\run-backend.ps1
```

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/v1/health
```

Expected health payload includes:

```json
{
  "runtime_mode": "theme2_round2_clean",
  "round1_runtime_enabled": false
}
```

### Frontend

```powershell
cd frontend
npm.cmd install
.\run-frontend.ps1
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/upload`
- `http://localhost:3000/history`

## Gemini / VLM Setup

Create `backend/.env` with:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

If Gemini is unavailable, the backend falls back to deterministic Theme 2 heuristics based on the uploaded metadata, symptom text, and follow-up answers.

## Frontend Backend Wiring

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
API_BASE_URL=http://127.0.0.1:8001
```

## Dataset Policy

Full raw Dataset 2 images should stay outside Git. The repo stores rules, demo scenarios, docs, and later may store manifests, pseudo-labels, evaluation cases, and a small curated `data/round2/sample_images/` set.

See:

- [Theme 2 runtime contract](docs/theme2_runtime_contract.md)
- [Round 2 dataset strategy](docs/round2_dataset_strategy.md)
- [Setup guide](docs/setup_guide.md)
