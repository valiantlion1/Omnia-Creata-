param(
  [string]$BackendMode = "unknown",
  [string]$FrontendMode = "unknown"
)

$ErrorActionPreference = "Stop"

$studioRoot = Split-Path -Parent $PSScriptRoot
$versionFile = Join-Path $studioRoot "version.json"
$expectedBuild = $null
$versionManifest = $null

function Resolve-AbsolutePath {
  param([string]$PathValue)

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return $null
  }

  return [System.IO.Path]::GetFullPath($PathValue)
}

if ($env:STUDIO_RUNTIME_ROOT) {
  $runtimeRoot = Resolve-AbsolutePath $env:STUDIO_RUNTIME_ROOT
} elseif ($env:LOCALAPPDATA) {
  $runtimeRoot = Join-Path $env:LOCALAPPDATA "OmniaCreata\Studio"
} else {
  $runtimeRoot = Join-Path $HOME ".omnia_creata\studio"
}

if ($env:STUDIO_LOG_DIRECTORY) {
  $logDir = Resolve-AbsolutePath $env:STUDIO_LOG_DIRECTORY
} else {
  $logDir = Join-Path $runtimeRoot "logs"
}

$reportDir = Join-Path $runtimeRoot "reports"
$reportPath = Join-Path $reportDir "local-verify-latest.json"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

if (Test-Path $versionFile) {
  try {
    $versionManifest = Get-Content $versionFile -Raw | ConvertFrom-Json
    $expectedBuild = $versionManifest.build
  } catch {
    $versionManifest = $null
    $expectedBuild = $null
  }
}

$report = [ordered]@{
  recorded_at = (Get-Date).ToUniversalTime().ToString("o")
  version = if ($versionManifest) { $versionManifest.version } else { $null }
  build = if ($versionManifest) { $versionManifest.build } else { $null }
  expected_build = $expectedBuild
  backend_build = $null
  backend_manifest_build = $null
  backend_health = $null
  backend_url = "http://127.0.0.1:8000"
  frontend_url = "http://127.0.0.1:5173"
  runtime_root = $runtimeRoot
  log_directory = $logDir
  backend_mode = $BackendMode
  frontend_mode = $FrontendMode
  checks = [ordered]@{
    backend_version_match = $false
    backend_health_present = $false
    frontend_login_ok = $false
    frontend_shell_ok = $false
  }
  failures = @()
  status = "blocked"
  summary = "Studio local verification has not completed yet."
}

function Write-VerificationReport {
  $report.recorded_at = (Get-Date).ToUniversalTime().ToString("o")
  $json = $report | ConvertTo-Json -Depth 8
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($reportPath, $json, $utf8NoBom)
}

function Fail-Verification {
  param([string]$Message)

  if ($report.failures -notcontains $Message) {
    $report.failures += $Message
  }
  $report.status = "blocked"
  $report.summary = "Studio local verification detected blocking issues."
  Write-VerificationReport
  throw $Message
}

function Get-Json {
  param(
    [string]$Uri,
    [int]$TimeoutSeconds = 5
  )

  return Invoke-RestMethod -Uri $Uri -TimeoutSec $TimeoutSeconds
}

function Get-Page {
  param(
    [string]$Uri,
    [int]$TimeoutSeconds = 5
  )

  return Invoke-WebRequest -UseBasicParsing -Uri $Uri -TimeoutSec $TimeoutSeconds
}

try {
  $version = Get-Json -Uri "http://127.0.0.1:8000/v1/version"
} catch {
  Fail-Verification "Studio backend version endpoint is unreachable."
}
$report.backend_build = $version.build
$report.backend_manifest_build = $version.build
$runningBuild = if ($version.bootBuild) { $version.bootBuild } else { $version.build }
$report.backend_build = $runningBuild

if ($expectedBuild) {
  if ($runningBuild -ne $expectedBuild) {
    Fail-Verification "Studio backend build mismatch. Expected $expectedBuild but got $runningBuild."
  }
  $report.checks.backend_version_match = $true
} else {
  $report.checks.backend_version_match = $true
}

try {
  $health = Get-Json -Uri "http://127.0.0.1:8000/v1/healthz"
} catch {
  Fail-Verification "Studio backend health endpoint is unreachable."
}
$report.backend_health = $health.status

if (-not $health.status) {
  Fail-Verification "Studio backend health did not return a status."
}
$report.checks.backend_health_present = $true

try {
  $loginPage = Get-Page -Uri "http://127.0.0.1:5173/login"
} catch {
  Fail-Verification "Studio frontend login page is unreachable."
}

if ($loginPage.StatusCode -ne 200 -or $loginPage.Content -notmatch "OmniaCreata Studio") {
  Fail-Verification "Studio frontend login page did not return the expected Studio shell."
}
$report.checks.frontend_login_ok = $true

if ($loginPage.Content -notmatch "<title>OmniaCreata Studio</title>") {
  Fail-Verification "Studio frontend shell did not return the expected Studio document title."
}
$report.checks.frontend_shell_ok = $true
$report.status = "pass"
$report.summary = "Studio local verification passed."
Write-VerificationReport

Write-Host ""
Write-Host "Studio local verification" -ForegroundColor Cyan
Write-Host "Backend build:  $runningBuild" -ForegroundColor Green
Write-Host "Backend health: $($health.status)" -ForegroundColor Green
Write-Host "Frontend login: ok" -ForegroundColor Green
Write-Host "Frontend shell: ok" -ForegroundColor Green
Write-Host "Report path:    $reportPath" -ForegroundColor Green
Write-Host ""
