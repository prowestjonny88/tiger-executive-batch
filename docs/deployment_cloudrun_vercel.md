# RExharge Theme 2 Deployment Guide

This guide deploys the RExharge Theme 2 app with:

- Frontend: Vercel
- Backend: Google Cloud Run
- Database: Neon Postgres
- Upload storage: Google Cloud Storage
- Vision model: Gemini via `GEMINI_API_KEY`

Raw Dataset 2 images remain local or in Google Drive. They are not committed and are not deployed as app storage.

## Architecture

```text
Browser
  -> Vercel Next.js frontend
  -> Next.js API proxy routes
  -> Cloud Run FastAPI backend
  -> Gemini API
  -> Neon Postgres for metadata/history/audits
  -> Google Cloud Storage for uploaded image bytes
```

Cloud Run local disk is ephemeral. For a quick smoke test, `UPLOAD_ROOT=/tmp/rexharge/uploads` with `--max-instances=1` can work, but the final demo should use GCS.

## Repository Deployment Files

The backend is deployed from the repo root so the container includes both `backend/` and `data/`.

Required root files:

- `Dockerfile`
- `.dockerignore`

The Dockerfile copies:

```text
backend/pyproject.toml
backend/app/
data/
```

The `.dockerignore` excludes raw images, videos, pseudo-labels, local build outputs, virtual environments, and archived Round 1 files from the Cloud Build context.

## Backend Environment Variables

Required:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DB?sslmode=require
GEMINI_API_KEY=...
GEMINI_MODEL=gemini-3-flash-preview
```

Recommended for final deployment:

```env
STORAGE_BACKEND=gcs
GCS_BUCKET=rexharge-uploads-<PROJECT_ID>
GCS_UPLOAD_PREFIX=incidents
```

Temporary filesystem mode:

```env
UPLOAD_ROOT=/tmp/rexharge/uploads
```

## Frontend Environment Variables

Set these in Vercel:

```env
NEXT_PUBLIC_API_BASE_URL=https://YOUR-CLOUD-RUN-URL
API_BASE_URL=https://YOUR-CLOUD-RUN-URL
```

Set both because browser-side helpers and server-side proxy routes need the backend URL.

## Neon Setup

1. Create a Neon Postgres project.
2. Copy the connection string.
3. Ensure it includes SSL:

```text
?sslmode=require
```

Neon stores incident metadata, audit payloads, and history. Do not store image bytes in Neon.

## Google Cloud Setup

Recommended region:

```text
us-central1
```

Enable required APIs:

```powershell
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable storage.googleapis.com
```

Create the upload bucket:

```powershell
$PROJECT_ID = "YOUR_PROJECT_ID"
$BUCKET = "rexharge-uploads-$PROJECT_ID"

gcloud storage buckets create gs://$BUCKET `
  --location=US-CENTRAL1 `
  --uniform-bucket-level-access
```

Grant Cloud Run access:

```powershell
$PROJECT_NUMBER = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$SERVICE_ACCOUNT = "$PROJECT_NUMBER-compute@developer.gserviceaccount.com"

gcloud storage buckets add-iam-policy-binding gs://$BUCKET `
  --member="serviceAccount:$SERVICE_ACCOUNT" `
  --role="roles/storage.objectAdmin"
```

## Deploy Backend

Run from the repo root:

```powershell
$PROJECT_ID = "YOUR_PROJECT_ID"
$REGION = "us-central1"
$SERVICE = "rexharge-backend"
$BUCKET = "rexharge-uploads-$PROJECT_ID"

gcloud run deploy $SERVICE `
  --source . `
  --region $REGION `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 2 `
  --timeout 120 `
  --set-env-vars DATABASE_URL="YOUR_NEON_DATABASE_URL" `
  --set-env-vars GEMINI_API_KEY="YOUR_GEMINI_API_KEY" `
  --set-env-vars GEMINI_MODEL="gemini-3-flash-preview" `
  --set-env-vars STORAGE_BACKEND="gcs" `
  --set-env-vars GCS_BUCKET="$BUCKET" `
  --set-env-vars GCS_UPLOAD_PREFIX="incidents"
```

Temporary filesystem smoke mode:

```powershell
gcloud run deploy $SERVICE `
  --source . `
  --region $REGION `
  --allow-unauthenticated `
  --memory 512Mi `
  --cpu 1 `
  --min-instances 0 `
  --max-instances 1 `
  --timeout 120 `
  --set-env-vars DATABASE_URL="YOUR_NEON_DATABASE_URL" `
  --set-env-vars GEMINI_API_KEY="YOUR_GEMINI_API_KEY" `
  --set-env-vars GEMINI_MODEL="gemini-3-flash-preview" `
  --set-env-vars UPLOAD_ROOT="/tmp/rexharge/uploads"
```

## Test Backend

```powershell
$BACKEND_URL = "https://YOUR-CLOUD-RUN-URL"
curl "$BACKEND_URL/api/v1/health"
```

Expected response includes:

```json
{
  "status": "ok",
  "runtime_mode": "theme2_round2_clean",
  "vlm_provider": "gemini",
  "round1_runtime_enabled": false
}
```

Read logs:

```powershell
gcloud run services logs read rexharge-backend `
  --region us-central1 `
  --limit 100
```

## Deploy Frontend

In Vercel:

```text
New Project
-> Import GitHub repo
-> Framework: Next.js
-> Root Directory: frontend
```

Build settings:

```text
Install Command: npm install
Build Command: npm run build
Output Directory: .next
```

Set environment variables:

```env
NEXT_PUBLIC_API_BASE_URL=https://YOUR-CLOUD-RUN-URL
API_BASE_URL=https://YOUR-CLOUD-RUN-URL
```

Redeploy after changing env vars.

## Final Smoke Test

1. Open Vercel app `/upload`.
2. Upload a charger red light image.
3. Confirm result shows:
   - input component: charger
   - observation: charger red light
   - fault type: charger issue
   - recipient: after-sales team
   - assigned team: `AS_TEAM_01`
4. Upload an isolator OFF image.
5. Confirm result routes to customer power-cut action.
6. Open `/history` and confirm Theme 2 history fields render.

## Common Failures

Backend cannot find Theme 2 rules:

```text
Docker build context missed data/.
Deploy from repo root with --source .
```

Neon connection fails:

```text
Check DATABASE_URL and sslmode=require.
```

Upload fails with 413:

```text
Compress images before upload. Target <= 1.5 MB.
```

Triage cannot read uploaded image:

```text
Use GCS storage backend. Cloud Run local disk is ephemeral.
```

Gemini fallback appears unexpectedly:

```text
Check GEMINI_API_KEY, Cloud Run logs, and whether image bytes can be read.
```
