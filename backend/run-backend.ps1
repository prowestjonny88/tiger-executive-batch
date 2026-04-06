$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$python = Join-Path $root '.venv\Scripts\python.exe'
if (-not (Test-Path $python)) {
  Write-Error "Missing backend/.venv. Create it first with: C:\Users\JON\AppData\Local\Programs\Python\Python312\python.exe -m venv backend\.venv"
  exit 1
}
& $python -m uvicorn app.main:app --host 127.0.0.1 --port 8001 --reload
