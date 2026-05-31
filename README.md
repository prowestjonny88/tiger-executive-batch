# ChargerDoc Theme 2 Triage

ChargerDoc Theme 2 Triage is an EV charger troubleshooting prototype for the ESUM Theme 2 guide. It accepts charger, EVDB, isolator, and optional EV app screenshot evidence, uses Gemini-backed visual perception with deterministic fallbacks, maps findings to the organizer's Theme 2 rules, and routes the result either to the customer or to `AS_TEAM_01`.

The current product is Theme 2 only. Round 1 known-case retrieval, pgvector, KB gates, `issue_family`, and `resolver_tier` are archived under `_archive/round1/` and are not part of the live runtime.

## System Architecture

```text
Browser
  -> Vercel Next.js frontend
  -> Next.js API proxy routes
  -> FastAPI backend on Cloud Run or local Uvicorn
  -> Gemini VLM for image/app-screenshot perception
  -> deterministic Theme 2 rule mapper
  -> Neon/local Postgres for incidents and triage_audits
  -> Google Cloud Storage or local disk for uploaded evidence
```

Live triage path:

```text
upload/demo input
-> Theme 2 perception
-> optional EV app screenshot parsing
-> organizer rule mapping
-> proof/follow-up prompts
-> customer guidance or after-sales routing
-> audit/history
```

## Current Features

- Charger, EVDB, and isolator evidence classification.
- Optional EV app screenshot upload for charger red/blinking-red cases.
- VLM extraction of visible charger serial number, brand/model, EVDB specs, isolator state, app status text, and object bounding boxes.
- Conservative fallback behavior when Gemini is unavailable.
- Organizer outputs: `input_component`, `observation_result`, `fault_type_v2`, `recipient_type`, optional `assigned_team_id`, action message, confidence, proof prompts, and evidence notes.
- Component-specific result display: charger identity, EVDB MCB/RCCB evidence, or isolator switch state.
- Dataset manifest, evaluation, pseudo-label, quarantine, video-frame, and unseen-image utility scripts.

## Repository Layout

- `backend/` - FastAPI app, Theme 2 perception, rule mapping, storage, persistence, and tests.
- `frontend/` - Next.js landing page and dashboard flow.
- `data/round2/` - Theme 2 rules, manifest/evaluation metadata, quarantine metadata, and summaries. Raw images stay ignored.
- `data/demo/` - text/demo scenarios.
- `scripts/` - dataset, evaluation, pseudo-label, smoke-test, and validation utilities.
- `docs/` - current architecture, contract, deployment, evaluation, demo, and report docs.
- `_archive/round1/` - archived Round 1 code/data/docs for reference only.

## Local Setup

Create `backend/.env`:

```env
DATABASE_URL=postgresql://omnitriage:omnitriage@localhost:5432/omnitriage
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3-flash-preview
STORAGE_BACKEND=local
UPLOAD_ROOT=uploads
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
API_BASE_URL=http://127.0.0.1:8001
```

Start local Postgres if needed:

```powershell
docker run --name rex-postgres `
  -e POSTGRES_USER=omnitriage `
  -e POSTGRES_PASSWORD=omnitriage `
  -e POSTGRES_DB=omnitriage `
  -p 5432:5432 `
  -d postgres:16
```

If it already exists:

```powershell
docker start rex-postgres
```

Install and run the backend:

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

Install and run the frontend:

```powershell
cd frontend
npm.cmd install
.\run-frontend.ps1
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/upload`
- `http://localhost:3000/history`

## Web Interface Test Flow

1. Open `/upload`.
2. Upload a charger, EVDB, or isolator image.
3. Confirm `/result` shows `Organizer Required Output`.
4. For charger red-light evidence, optionally upload an EV app screenshot from the result page.
5. Confirm bounding boxes highlight the detected evidence object when available.
6. Continue to `/guidance` for customer cases or `/escalation` for after-sales cases.

If the result shows `Vision model unavailable; using fallback interpretation`, confirm `GEMINI_API_KEY` is configured and restart the backend.

## Validation Commands

```powershell
cd backend
py -m pytest -q
py -m pyright -p pyrightconfig.json
```

```powershell
cd frontend
npm.cmd run build
```

Dataset/evaluation utilities:

```powershell
py scripts\build_round2_manifest.py --write-summary
py scripts\check_round2_eval_coverage.py
py scripts\evaluate_round2_cases.py --mode weak-label-sanity --show-failures
py scripts\evaluate_round2_cases.py --mode blind-image-eval --show-failures
py scripts\run_unseen_external_smoke.py
.\scripts\run_final_validation.ps1
```

Use `weak-label-sanity` only for pipeline regression checks. Use Gemini-enabled `blind-image-eval` for image-evaluation-like language. Raw images and generated reports stay local.

## Deployment

Frontend deploys on Vercel from `frontend/`.

Backend deploys on Cloud Run from the repo root.

Current infrastructure intentionally keeps the original Cloud Run service and bucket names for safety. Product/UI/docs copy should say `ChargerDoc`, but deployment commands should continue using:

- Cloud Run service: `rexharge-backend`
- Project: `rexharge-experiment`
- Upload bucket: `rexharge-uploads-rexharge-experiment`

```cmd
gcloud run deploy rexharge-backend ^
  --source . ^
  --region us-central1 ^
  --allow-unauthenticated ^
  --memory 512Mi ^
  --cpu 1 ^
  --min-instances 0 ^
  --max-instances 2 ^
  --timeout 120
```

Cloud Run should use:

```env
DATABASE_URL=postgresql://...
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3-flash-preview
STORAGE_BACKEND=gcs
GCS_BUCKET=rexharge-uploads-rexharge-experiment
GCS_UPLOAD_PREFIX=incidents
```

Get the Cloud Run URL:

```cmd
gcloud run services describe rexharge-backend --region us-central1 --format="value(status.url)"
```

Set that URL in Vercel:

```env
NEXT_PUBLIC_API_BASE_URL=https://YOUR-CLOUD-RUN-URL
API_BASE_URL=https://YOUR-CLOUD-RUN-URL
```

## Dataset Policy

Do not commit raw Dataset 2 images/videos, generated pseudo-label JSONL, eval reports, uploaded evidence, or extracted video frames.

Tracked dataset artifacts are limited to:

- `data/round2/theme2_rules.json`
- `data/round2/manifest.csv`
- `data/round2/manifest_summary.json`
- `data/round2/evaluation_cases.json`
- `data/round2/manual_review_cases.json`
- `data/round2/pseudo_label_summary.json`

Quarantined cases remain in `manual_review_cases.json` until human-reviewed fields are filled and promoted.

## Important Docs

- [Runtime contract](docs/theme2_runtime_contract.md)
- [Deployment guide](docs/deployment_cloudrun_vercel.md)
- [Evaluation methodology](docs/round2_evaluation_methodology.md)
- [Final demo runbook](docs/final_demo_runbook.md)
- [Final report metrics template](docs/final_report_metrics_template.md)
