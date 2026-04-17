# OmniTriage

OmniTriage is a confidence-aware EV charger troubleshooting MVP. It combines a Next.js frontend, a FastAPI backend, seeded demo data, SQLite-backed audit history, and a hybrid diagnosis layer that can route between hardware-visual, OCR/text, and symptom-first branches.

The current implementation is centered on the organizer decision tree:

- identify one of four issue types: `no_power`, `tripping_mcb_rccb`, `charging_slow`, `not_responding`
- assess the shared basic checks: main power supply, cable condition, indicator/error code
- produce branch SOP guidance
- finish with a single workflow outcome: `resolved` or `escalate`

The current diagnosis path is additive, not routing-authoritative:

- `hardware_visual_branch` for in-scope hardware photos using the Round 1 5-class classifier bundle
- `ocr_text_branch` for screenshot / app-log / display-text evidence
- `symptom_multimodal_branch` for symptom-heavy cases such as `Charger No Pulse`
- fallback to Gemini or organizer heuristics if a branch is unavailable

## Repo Structure

- `frontend/` - Next.js app for upload, questions, result, guidance, escalation, intake, history, and demo flows
- `backend/` - FastAPI backend for intake preview, branch-orchestrated diagnosis, confidence, organizer workflow decisioning, guidance, uploads, and persistence
- `data/` - Seeded sites, demo scenarios, and knowledge snippets
- `docs/` - Product, architecture, planning, and setup documentation

## Current State

The repo currently includes:

- real upload handling with backend-served evidence files
- SQLite-backed incident and triage audit persistence
- four seeded organizer-aligned demo scenarios and sites
- frontend result/guidance/escalation flows wired to live backend data
- organizer-native diagnosis fields: `issue_type`, `basic_conditions`, `workflow.outcome`, `workflow.rationale`
- additive diagnosis metadata: `branch_name`, `diagnosis_source`, classifier metadata, and OCR metadata
- integrated Round 1 classifier bundle and temporary classifier-use policy
- Gemini client support with heuristic fallback when the VLM is unavailable or fails
- replay/history support through persisted incident records

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
GEMINI_MODEL=.5-flash
```

Useful checks:

```powershell
cd backend
.\.venv\Scripts\python.exe .\vlm_doctor.py
.\.venv\Scripts\python.exe .\test_live_api.py
```

If Gemini is unavailable, the backend falls back to the heuristic diagnosis path.

## Visual Classifier Runtime

The backend now ships with a hardware-visual classifier integration that expects:

- `backend/app/services/diagnosis_assets/model_5class_logreg.pkl`
- `backend/app/services/diagnosis_assets/label_encoder_5class.pkl`
- `backend/app/services/diagnosis_assets/classifier_policy_temp.json`

The DINOv2 embedding runtime uses `torch` and `transformers`. On first live hardware-branch use, Hugging Face weights may need to download unless they are already cached locally.

Useful environment toggles:

```env
OMNITRIAGE_CLASSIFIER_ENABLED=true
OMNITRIAGE_OCR_ENABLED=true
OMNITRIAGE_OCR_GEMINI_ASSIST=false
OMNITRIAGE_DINO_MODEL_NAME=facebook/dinov2-base
```

## Frontend -> Backend Wiring

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
API_BASE_URL=http://127.0.0.1:8001
```

Then restart the frontend dev server.

## Setup Guide

A fuller setup and verification guide lives in [docs/setup_guide.md](docs/setup_guide.md).
