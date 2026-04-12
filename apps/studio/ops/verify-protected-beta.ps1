param(
  [switch]$SkipFrontend
)

$ErrorActionPreference = "Stop"

$opsDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$studioRoot = Split-Path -Parent $opsDir
$backendDir = Join-Path $studioRoot "backend"

$env:PYTHONPATH = "$studioRoot;$backendDir"

function Invoke-Check {
  param(
    [string]$Label,
    [scriptblock]$Action
  )

  Write-Host ""
  Write-Host "==> $Label" -ForegroundColor Cyan
  & $Action
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed."
  }
}

Push-Location $backendDir
try {
  Invoke-Check -Label "Backend shard: route/security/readiness" -Action {
    python -m pytest tests/test_router_security.py tests/test_launch_readiness.py tests/test_deployment_verification.py -q
  }

  Invoke-Check -Label "Backend shard: provider/billing/llm" -Action {
    python -m pytest tests/test_llm_gateway.py tests/test_provider_smoke.py tests/test_billing_ops.py -q
  }

  Invoke-Check -Label "Backend shard: store/deployment/staging" -Action {
    python -m pytest tests/test_store.py tests/test_deployment_preflight.py -q
  }

  Invoke-Check -Label "Backend compile sanity" -Action {
    python -m compileall studio_platform
  }
} finally {
  Pop-Location
}

if (-not $SkipFrontend.IsPresent) {
  Push-Location (Join-Path $studioRoot "web")
  try {
    Invoke-Check -Label "Frontend type-check" -Action {
      npm run type-check
    }
    Invoke-Check -Label "Frontend build" -Action {
      npm run build
    }
  } finally {
    Pop-Location
  }
}
