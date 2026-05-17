param(
    [switch]$StrictCoverage
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$failed = $false

function Run-Step {
    param(
        [string]$Name,
        [scriptblock]$Command
    )
    Write-Host ""
    Write-Host "== $Name =="
    try {
        & $Command
    } catch {
        $script:failed = $true
        Write-Host "FAILED: $Name"
        Write-Host $_
    }
}

if (-not (Test-Path (Join-Path $repoRoot "data/round2/images"))) {
    Write-Host "WARNING: data/round2/images is missing. Local image evaluation requires raw Dataset 2 images."
}

if (-not $env:GEMINI_API_KEY) {
    Write-Host "WARNING: GEMINI_API_KEY is not set. Blind image eval may exercise fallback behavior instead of the VLM path."
}

Run-Step "Checking backend tests" {
    Push-Location (Join-Path $repoRoot "backend")
    try {
        py -m pytest -q
    } finally {
        Pop-Location
    }
}

Run-Step "Checking backend pyright" {
    Push-Location (Join-Path $repoRoot "backend")
    try {
        py -m pyright -p pyrightconfig.json
    } finally {
        Pop-Location
    }
}

Run-Step "Checking frontend build" {
    Push-Location (Join-Path $repoRoot "frontend")
    try {
        npm.cmd run build
    } finally {
        Pop-Location
    }
}

Run-Step "Checking eval coverage" {
    Push-Location $repoRoot
    try {
        if ($StrictCoverage) {
            py scripts\check_round2_eval_coverage.py --strict
        } else {
            py scripts\check_round2_eval_coverage.py
        }
    } finally {
        Pop-Location
    }
}

Run-Step "Running weak-label sanity eval" {
    Push-Location $repoRoot
    try {
        py scripts\evaluate_round2_cases.py --mode weak-label-sanity --show-failures
    } finally {
        Pop-Location
    }
}

Run-Step "Running blind image eval" {
    Push-Location $repoRoot
    try {
        py scripts\evaluate_round2_cases.py --mode blind-image-eval --show-failures
    } finally {
        Pop-Location
    }
}

Write-Host ""
if ($failed) {
    Write-Host "FINAL VALIDATION FAILED - see above."
    exit 1
}

Write-Host "FINAL VALIDATION PASSED"
