# OmniTriage

OmniTriage is a confidence-aware EV charger troubleshooting MVP. It combines a Next.js frontend, a FastAPI backend, seeded demo data, Postgres-backed audit history, and a hybrid diagnosis layer that combines VLM, OCR, and known-case retrieval.

The current implementation is centered on a taxonomy-first approach:

- identify one of five issue families: `no_power`, `tripping`, `charging_slow`, `not_responding`, `unknown_mixed`
- identify the fault type and hazard level
- produce resolver-specific SOP guidance
- route the incident to the appropriate resolver: `driver`, `local_site`, `remote_ops`, or `technician`

The current diagnosis path relies on:
- `data/round1/` package for known-case semantic retrieval
- `Gemini Diagnosis Provider` acting as an intelligent VLM assist
- Heuristic deterministic fallback policies when AI reasoning is unavailable

## Repo Structure

- `frontend/` - Next.js app for upload, questions, result, guidance, escalation, intake, history, and demo flows
- `backend/` - FastAPI backend for intake preview, branch-orchestrated diagnosis, confidence, organizer workflow decisioning, guidance, uploads, and persistence
- `data/` - Seeded sites, demo scenarios, and knowledge snippets
- `docs/` - Product, architecture, planning, and setup documentation

## Current State

The repo currently includes:

- real upload handling with backend-served evidence files
- Postgres-backed incident and triage audit persistence with full JSONB payload replay tracking
- four seeded organizer-aligned demo scenarios and sites
- frontend result/guidance/escalation/history flows wired to live backend data powered by the new `issue_family` paradigm
- Gemini client support enforcing `application/json` models over `gemini-2.5-flash` natively.
- deterministic resolver routing engine
- deterministic fallback heuristic paths for offline scenarios

## Verified

Latest local verification completed in this workspace:

- `frontend`: `npm.cmd run build` -> PASS
- `backend`: `pytest -q backend/tests` -> 24 passed
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
GEMINI_MODEL=gemini-2.5-flash
```

Useful checks:
Terminal will print `[gemini_client] Gemini client initialized successfully` on backend boot if everything is properly connected.

If Gemini is unavailable, the backend falls back to the heuristic diagnosis path.

## Dataset-Backed Intelligence Runtime

The backend now ships with a knowledge package integration that expects a taxonomy layout mapping located strictly at:
- `data/round1/label_map.yaml`
- `data/round1/known_cases_seed.jsonl`

Postgres is required because `pgvector` dependencies track known-case anomaly overlaps.

## Frontend -> Backend Wiring

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
API_BASE_URL=http://127.0.0.1:8001
```

Then restart the frontend dev server.

## Setup Guide

A fuller setup and verification guide lives in [docs/setup_guide.md](docs/setup_guide.md).
