# OmniTriage Setup Guide

## Prerequisites

- Windows PowerShell
- Python 3.12
- Node.js and npm
- Git
- Optional: Gemini API key for live VLM diagnosis

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

Run the backend:

```powershell
.\run-backend.ps1
```

Verify:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/v1/health
.\.venv\Scripts\python.exe .\vlm_doctor.py
.\.venv\Scripts\python.exe .\test_live_api.py
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pyright
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

## 5. Troubleshooting

- Hydration errors about `<html>` under `<main>` mean a nested App Router layout is rendering document tags. Only `frontend/app/layout.tsx` should render `<html>` and `<body>`.
- If uploads do not render in the result page, confirm the backend is running and `frontend/.env.local` points to `http://127.0.0.1:8001`.
- If Gemini is configured but triage still behaves heuristically, inspect the latest `triage_audits` payload and check whether `diagnosis.raw_provider_output` says Gemini failed and heuristic fallback was used.
