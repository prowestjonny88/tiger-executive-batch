# Cloud Run And Vercel Deployment Guide

This guide deploys the current ChargerDoc Theme 2 app:

- Frontend: Vercel
- Backend: Google Cloud Run
- Database: Neon Postgres
- Upload storage: Google Cloud Storage
- Vision model: Gemini

Raw Dataset 2 images are not deployed. Uploaded user evidence is stored in GCS.

## Naming Policy

`ChargerDoc` is the product name used in UI and docs. The deployed Google Cloud resources keep their existing legacy names to avoid creating a second backend or bucket by accident:

- Cloud Run service: `rexharge-backend`
- Google Cloud project: `rexharge-experiment`
- Upload bucket: `rexharge-uploads-rexharge-experiment`

Do not deploy to `chargerdoc-backend` unless you are intentionally migrating infrastructure.

## Architecture

```text
Browser
  -> Vercel Next.js frontend
  -> Next.js API proxy routes
  -> Cloud Run FastAPI backend
  -> Gemini API
  -> Neon Postgres for incidents/audits
  -> Google Cloud Storage for uploaded photos and app screenshots
```

Cloud Run local disk is ephemeral. Use GCS for deployment.

## Required Files

The backend deploys from the repository root:

- `Dockerfile`
- `.dockerignore`

The Dockerfile copies `backend/` and `data/` into the container. `.dockerignore` excludes raw datasets, videos, pseudo-labels, local builds, virtual environments, and `_archive/`.

## Backend Environment Variables

Required:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3-flash-preview
STORAGE_BACKEND=gcs
GCS_BUCKET=rexharge-uploads-rexharge-experiment
GCS_UPLOAD_PREFIX=incidents
```

Temporary local-disk smoke mode only:

```env
UPLOAD_ROOT=/tmp/chargerdoc/uploads
```

## Frontend Environment Variables

Set these in Vercel:

```env
NEXT_PUBLIC_API_BASE_URL=https://YOUR-CLOUD-RUN-URL
API_BASE_URL=https://YOUR-CLOUD-RUN-URL
```

Both are required because browser helpers and Next.js server proxy routes need the backend URL.

## Google Cloud Setup

Recommended region:

```text
us-central1
```

Enable APIs:

```cmd
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable storage.googleapis.com
```

Create the upload bucket:

```cmd
set PROJECT_ID=rexharge-experiment
set BUCKET=rexharge-uploads-%PROJECT_ID%

gcloud storage buckets create gs://%BUCKET% ^
  --location=US-CENTRAL1 ^
  --uniform-bucket-level-access
```

Grant the Cloud Run service account access:

```cmd
gcloud projects describe %PROJECT_ID% --format="value(projectNumber)"
```

Use the printed project number:

```cmd
gcloud storage buckets add-iam-policy-binding gs://%BUCKET% ^
  --member="serviceAccount:PROJECT_NUMBER-compute@developer.gserviceaccount.com" ^
  --role="roles/storage.objectAdmin"
```

## Manual Backend Redeploy

Run from the repo root:

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

If the service already has environment variables configured, this redeploy keeps them unless you overwrite them. Use this for quick iteration after backend commits.

Get the service URL:

```cmd
gcloud run services describe rexharge-backend --region us-central1 --format="value(status.url)"
```

Health check:

```cmd
curl https://YOUR-CLOUD-RUN-URL/api/v1/health
```

Expected fields:

```json
{
  "status": "ok",
  "runtime_mode": "theme2_round2_clean",
  "vlm_provider": "gemini",
  "round1_runtime_enabled": false
}
```

Read backend logs:

```cmd
gcloud run services logs read rexharge-backend --region us-central1 --limit 100
```

## Vercel Frontend

Project settings:

```text
Root Directory: frontend
Install Command: npm install
Build Command: npm run build
Output Directory: .next
```

After changing `NEXT_PUBLIC_API_BASE_URL` or `API_BASE_URL`, redeploy Vercel.

If only backend code changes and the Cloud Run URL stays the same, redeploy Cloud Run; Vercel env does not need to change.

## Final Smoke Test

1. Open the Vercel `/upload` page.
2. Upload a charger red-light image.
3. Confirm the result routes to after-sales team `AS_TEAM_01`.
4. Add an EV app screenshot if prompted and confirm triage reruns.
5. Upload an isolator OFF image and confirm customer power-cut guidance.
6. Open `/history` and confirm Theme 2 columns render.

## Common Failures

Backend cannot find rules:

```text
Deploy from repo root with --source . so data/ is included.
```

Neon connection fails:

```text
Check DATABASE_URL and sslmode=require.
```

Upload or app screenshot is unreadable after deploy:

```text
Use STORAGE_BACKEND=gcs and confirm Cloud Run has roles/storage.objectAdmin on the bucket.
```

Gemini fallback appears unexpectedly:

```text
Check GEMINI_API_KEY, Cloud Run logs, and uploaded object read access.
```

Frontend still calls old backend:

```text
Check Vercel NEXT_PUBLIC_API_BASE_URL and API_BASE_URL, then redeploy Vercel.
```
