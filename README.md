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

## Current Status

| Area | Status | Notes |
|---|---:|---|
| Theme 2 runtime | Done | VLM/heuristic perception plus deterministic rule mapper |
| Customer/after-sales routing | Done | Uses `recipient_type` and `assigned_team_id` |
| Blind evaluation mode | Done | Uses neutral hints to avoid expected-label leakage |
| Dataset manifest | Done | Raw images stay local and ignored |
| Manual review quarantine | Done | Ambiguous cases are retained in `manual_review_cases.json` |
| Serial/brand exact OCR validation | Partial | Requires non-null reviewed charger-label ground truth |
| Isolator OFF coverage | Partial | Add confirmed OFF image cases when available |
| Video handling | Partial | Frame extraction utility is available; generated frames stay ignored |
| EVDB spec interpretation | Done | Normalizes 40A/pole/RCCB Type A evidence before rule mapping |

## Quick Start

### 1. Create Local Env Files

Create `backend/.env`:

```env
DATABASE_URL=postgresql://omnitriage:omnitriage@localhost:5432/omnitriage
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3-flash-preview
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
API_BASE_URL=http://127.0.0.1:8001
```

Both files are intentionally ignored by Git. Restart the backend after changing `backend/.env`, and restart the frontend after changing `frontend/.env.local`.

### 2. Start Postgres

The backend persists incidents and audit history in Postgres. If local Postgres is not already running on port `5432`, start a throwaway Docker instance:

```powershell
docker run --name rex-postgres `
  -e POSTGRES_USER=omnitriage `
  -e POSTGRES_PASSWORD=omnitriage `
  -e POSTGRES_DB=omnitriage `
  -p 5432:5432 `
  -d postgres:16
```

If the container already exists:

```powershell
docker start rex-postgres
```

Quick check:

```powershell
Test-NetConnection 127.0.0.1 -Port 5432
```

`TcpTestSucceeded` should be `True`. If the backend stays at `Waiting for application startup`, Postgres is the first thing to check.

### 3. Start Backend

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

### 4. Start Frontend

```powershell
cd frontend
npm.cmd install
.\run-frontend.ps1
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/upload`
- `http://localhost:3000/history`

### 5. Test From The Web Interface

1. Open `http://localhost:3000/upload`.
2. Upload an unseen charger, EVDB, or isolator image.
3. Confirm `/result` shows `Organizer Required Output`.
4. Check `Input Component`, `Observation Result`, `Fault Type`, `Recipient`, confidence, and proof prompts.
5. If the result says `Vision model unavailable; using fallback interpretation`, confirm `GEMINI_API_KEY` is present in `backend/.env` and restart the backend.

## Gemini / VLM Setup

For real image understanding, `backend/.env` must contain:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3-flash-preview
```

If Gemini is unavailable, the backend falls back to deterministic Theme 2 heuristics based on the uploaded metadata, symptom text, and follow-up answers.

## Frontend Backend Wiring

`frontend/.env.local` should point to the FastAPI backend port used by `backend/run-backend.ps1`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
API_BASE_URL=http://127.0.0.1:8001
```

## Dataset Policy

Full raw Dataset 2 images should stay outside Git. The repo stores rules, demo scenarios, docs, and later may store manifests, pseudo-labels, evaluation cases, and a small curated `data/round2/sample_images/` set.

Local validation workflow:

```powershell
python scripts\build_round2_manifest.py --write-summary
python scripts\pseudo_label_round2_with_theme2.py --limit 5
python scripts\summarize_round2_pseudo_labels.py
python scripts\check_round2_eval_coverage.py
.\scripts\run_final_validation.ps1
python scripts\evaluate_round2_cases.py --mode weak-label-sanity
python scripts\evaluate_round2_cases.py --mode blind-image-eval
python scripts\run_unseen_external_smoke.py
```

Use `weak-label-sanity` to check weak labels and rule wiring. Use `blind-image-eval` as the closer proxy for judging because it does not pass expected labels into the incident hint.
Place outside test images in ignored `data/round2/unseen_external/` and run `run_unseen_external_smoke.py` for prediction-only checks with no accuracy claims.
Use `.\scripts\run_final_validation.ps1 -StrictCoverage` only after adding human-reviewed EVDB, isolator, and exact OCR ground-truth cases.

See:

- [Theme 2 runtime contract](docs/theme2_runtime_contract.md)
- [Round 2 dataset strategy](docs/round2_dataset_strategy.md)
- [Round 2 evaluation methodology](docs/round2_evaluation_methodology.md)
- [Final demo runbook](docs/final_demo_runbook.md)
- [Final report metrics template](docs/final_report_metrics_template.md)
- [Setup guide](docs/setup_guide.md)
