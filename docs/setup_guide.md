# Theme 2 Setup Guide

## Backend

```powershell
C:\Users\JON\AppData\Local\Programs\Python\Python312\python.exe -m venv backend\.venv
cd backend
.\.venv\Scripts\python.exe -m pip install -e .[dev]
.\run-backend.ps1
```

The backend still uses Postgres for `incidents` and `triage_audits`.

Health check:

```powershell
Invoke-RestMethod http://127.0.0.1:8001/api/v1/health
```

Expected runtime mode:

```text
theme2_round2_clean
```

## Frontend

```powershell
cd frontend
npm.cmd install
.\run-frontend.ps1
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8001
API_BASE_URL=http://127.0.0.1:8001
```

## Verification

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest -q
.\.venv\Scripts\python.exe -m pyright -p pyrightconfig.json
```

```powershell
cd frontend
npm.cmd run build
```

## Manual Smoke

1. Open `/upload`.
2. Switch to demo mode.
3. Run `Charger Red Light`.
4. Confirm the result shows charger, red light, charger issue, after-sales team, and `AS_TEAM_01`.
5. Run `Isolator OFF`.
6. Confirm the result shows isolator, open circuit, power cut, and customer action.
