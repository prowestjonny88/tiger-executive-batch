# OmniTriage Setup Guide

Implementation note:
- the live app still follows the organizer decision tree for workflow closure and escalation
- the diagnosis layer is now branch-based on top of that workflow:
  - `hardware_visual_branch`
  - `ocr_text_branch`
  - `symptom_multimodal_branch`
- current live triage outputs remain organizer-native:
  - `issue_type`
  - `basic_conditions`
  - `workflow.outcome`
  - `workflow.rationale`
- branch/classifier/OCR details are additive metadata for audits, replay, and result transparency

## Prerequisites

- Windows PowerShell
- Python 3.12
- Node.js and npm
- Git
- Optional: Gemini API key for live VLM diagnosis / OCR assist
- Optional but recommended for the hardware visual branch: internet access on first DINOv2 model load unless the model is already cached locally

## 1. Clone and enter the repo

```powershell
git clone https://github.com/prowestjonny88/tiger-executive-batch
cd tiger-executive-batch
```

## 2. Backend setup

Create the virtual environment and install the backend package with dev dependencies:

```powershell
C:\Users\JON\AppData\Local\Programs\Python\Python312\python.exe -m venv backend\.venv
cd backend
.\.venv\Scripts\python.exe -m pip install -e .[dev]
```

Optional Gemini config in `backend/.env`:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash
```

Optional branch/runtime config in `backend/.env`:

```env
OMNITRIAGE_CLASSIFIER_ENABLED=true
OMNITRIAGE_OCR_ENABLED=true
OMNITRIAGE_OCR_GEMINI_ASSIST=false
OMNITRIAGE_DINO_MODEL_NAME=facebook/dinov2-base
```

Run the backend:

```powershell
.\run-backend.ps1
```

Verify:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/v1/health
.\.venv\Scripts\python.exe .\vlm_doctor.py
.\.venv\Scripts\python.exe .\test_live_api.py
.\.venv\Scripts\python.exe -m pytest -q backend/tests
.\.venv\Scripts\pyright.exe -p .\pyrightconfig.json
```

## 3. Frontend setup

From the repo root:

```powershell
cd frontend
npm.cmd install
```

To proxy to the live FastAPI backend, create `frontend/.env.local`:

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

## 4. How to tell Gemini is working

- `backend/.env` contains a valid `GEMINI_API_KEY`
- `.\.venv\Scripts\python.exe .\vlm_doctor.py` reports successful client initialization
- `.\.venv\Scripts\python.exe .\test_live_api.py` returns structured preview/triage results
- Stored audit payloads contain a meaningful `diagnosis.raw_provider_output` instead of a Gemini failure fallback message
- Stored audit payloads should also show:
  - organizer-native fields such as `diagnosis.issue_type` and `workflow.outcome`
  - additive branch metadata such as `diagnosis.branch_name` and `diagnosis.diagnosis_source`

## 4.1 Round 1 runtime assets

The repo now includes canonical Round 1 integration assets under:

- `backend/app/services/diagnosis_assets/`
- `backend/app/services/diagnosis_config/`

Still pending in the broader data-prep direction:

- `data/round1/manifest.csv`
- `data/round1/label_map.yaml`
- optional supporting docs such as `docs/round1_taxonomy.md`

## 5. Troubleshooting

- Hydration errors about `<html>` under `<main>` mean a nested App Router layout is rendering document tags. Only `frontend/app/layout.tsx` should render `<html>` and `<body>`.
- If uploads do not render in the result page, confirm the backend is running and `frontend/.env.local` points to `http://127.0.0.1:8001`.
- If Gemini is configured but triage still behaves heuristically, inspect the latest `triage_audits` payload and check whether `diagnosis.raw_provider_output` says Gemini failed and heuristic fallback was used.
- If the hardware visual branch does not activate, inspect:
  - `diagnosis.branch_name`
  - `diagnosis.classifier_metadata`
  - whether the first DINOv2 model download was blocked or failed
- If the UI still mentions driver/local resolver/remote ops/technician as the primary decision model, you are likely running stale frontend code. The current flow should show organizer issue type, shared basic checks, `resolved` or `escalate`, plus additive branch details when available.
- If docs appear to conflict, use this order:
  1. `docs/OmniTriage_Comprehensive_Execution_Plan.md`
  2. `docs/progress_tracker.md`
  3. `docs/prd_task_breakdown.md`
