# OmniTriage

OmniTriage is a pre-dataset MVP for confidence-aware EV charger troubleshooting. It combines a Next.js frontend, a FastAPI backend, seeded demo data, SQLite-backed audit history, and an optional Gemini-powered diagnosis path.

## Repo Structure

- `frontend/` - Next.js app for upload, questions, result, guidance, escalation, intake, history, and demo flows
- `backend/` - FastAPI backend for intake preview, diagnosis, confidence, routing, guidance, uploads, and persistence
- `data/` - Seeded sites, demo scenarios, and knowledge snippets
- `docs/` - Product, architecture, planning, and setup documentation
- `UI prototype/` - Static prototype/reference assets

## Current State

The repo currently includes:

- real upload handling with backend-served evidence files
- SQLite-backed incident and triage audit persistence
- seeded demo scenarios and sites
- frontend result/guidance/escalation flows wired to live backend data
- Gemini client support with heuristic fallback when the VLM is unavailable or fails
- replay/history support through persisted incident records

## Verified

Latest local verification completed in this workspace:

- `frontend`: `npm.cmd run build` -> PASS
- `backend`: `pytest -q` -> 14 passed
- `backend`: `pyright` -> 0 errors

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

### Frontend

```powershell
cd frontend
npm.cmd install
.\run-frontend.ps1
```

Open:

- `http://localhost:3000/`
- `http://localhost:3000/upload`
- `http://localhost:3000/intake`
- `http://localhost:3000/demo`

## Gemini / VLM Setup

Create `backend/.env` with:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.0-flash
```

Useful checks:

```powershell
cd backend
.\.venv\Scripts\python.exe .\vlm_doctor.py
.\.venv\Scripts\python.exe .\test_live_api.py
```

If Gemini is unavailable, the backend falls back to the heuristic diagnosis path.

## Frontend -> Backend Wiring

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
API_BASE_URL=http://127.0.0.1:8001
```

Then restart the frontend dev server.

## Setup Guide

A fuller setup and verification guide lives in [docs/setup_guide.md](docs/setup_guide.md).
