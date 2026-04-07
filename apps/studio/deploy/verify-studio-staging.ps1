param(
  [string]$EnvFile = ".env.staging",
  [string]$BaseUrl,
  [string]$ApiPrefix = "/api",
  [string]$Label = "protected-staging",
  [string]$OwnerBearerToken,
  [switch]$RequireClosureReady
)

$ErrorActionPreference = "Stop"

$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$studioRoot = Split-Path -Parent $deployDir
$backendDir = Join-Path $studioRoot "backend"
$versionFile = Join-Path $studioRoot "version.json"
$expectedBuild = $null
$expectedVersion = $null

function Get-EnvMap {
  param([string]$PathValue)

  $values = @{}
  foreach ($rawLine in Get-Content -Path $PathValue) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      continue
    }
    $parts = $line.Split("=", 2)
    $values[$parts[0].Trim()] = $parts[1].Trim()
  }
  return $values
}

function Resolve-AbsolutePath {
  param([string]$PathValue)

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return $null
  }

  return [System.IO.Path]::GetFullPath($PathValue)
}

if (Test-Path $versionFile) {
  try {
    $versionManifest = Get-Content $versionFile -Raw | ConvertFrom-Json
    $expectedBuild = $versionManifest.build
    $expectedVersion = $versionManifest.version
  } catch {
    $expectedBuild = $null
    $expectedVersion = $null
  }
}

if ($env:STUDIO_RUNTIME_ROOT) {
  $runtimeRoot = Resolve-AbsolutePath $env:STUDIO_RUNTIME_ROOT
} elseif ($env:LOCALAPPDATA) {
  $runtimeRoot = Join-Path $env:LOCALAPPDATA "OmniaCreata\Studio"
} else {
  $runtimeRoot = Join-Path $HOME ".omnia_creata\studio"
}

$reportDir = Join-Path $runtimeRoot "reports"
$blockerReportPath = Join-Path $reportDir "protected-staging-verify-latest.json"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

function Write-StagingVerifyBlockerReport {
  param(
    [string]$Summary,
    [string]$Detail,
    [string]$BaseUrl = ""
  )

  $payload = [ordered]@{
    recorded_at = (Get-Date).ToUniversalTime().ToString("o")
    version = $expectedVersion
    build = $expectedBuild
    label = $Label
    base_url = $BaseUrl
    status = "blocked"
    summary = $Summary
    blocking_count = 1
    warning_count = 0
    expected_build = $expectedBuild
    actual_build = $null
    health_status = $null
    owner_health_checked = (-not [string]::IsNullOrWhiteSpace($OwnerBearerToken))
    closure_ready = $false
    closure_summary = "Protected staging verification cannot proceed until this verification blocker is cleared."
    closure_gaps = @($Detail)
    checks = @(
      [ordered]@{
        key = "staging_verification"
        status = "blocked"
        summary = $Summary
        detail = $Detail
      }
    )
  }

  $json = $payload | ConvertTo-Json -Depth 8
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($blockerReportPath, $json, $utf8NoBom)
}

$resolvedEnvFile = [System.IO.Path]::GetFullPath((Join-Path $deployDir $EnvFile))
if (-not (Test-Path $resolvedEnvFile)) {
  Write-StagingVerifyBlockerReport `
    -Summary "Protected staging verify env file is missing." `
    -Detail "Create $resolvedEnvFile before running verify-studio-staging.ps1." `
    -BaseUrl $BaseUrl
  throw "Missing staging env file: $resolvedEnvFile"
}

$envValues = Get-EnvMap -PathValue $resolvedEnvFile
if (-not $BaseUrl) {
  $publicUrl = $envValues["PUBLIC_WEB_BASE_URL"]
  if (-not [string]::IsNullOrWhiteSpace($publicUrl)) {
    $BaseUrl = $publicUrl
  } else {
    $webPort = $envValues["WEB_PORT"]
    if ([string]::IsNullOrWhiteSpace($webPort)) {
      $webPort = "8080"
    }
    $BaseUrl = "http://127.0.0.1:$webPort"
  }
}

$args = @(
  (Join-Path $backendDir "scripts\deployment_verify.py"),
  "--base-url",
  $BaseUrl,
  "--api-prefix",
  $ApiPrefix,
  "--label",
  $Label
)
if ($expectedBuild) {
  $args += @("--expected-build", $expectedBuild)
}
if ([string]::IsNullOrWhiteSpace($OwnerBearerToken) -and -not [string]::IsNullOrWhiteSpace($env:STUDIO_HEALTH_DETAIL_TOKEN)) {
  $OwnerBearerToken = $env:STUDIO_HEALTH_DETAIL_TOKEN
}
if (-not [string]::IsNullOrWhiteSpace($OwnerBearerToken)) {
  $args += @("--owner-bearer-token", $OwnerBearerToken)
}
$effectiveRequireClosureReady = $RequireClosureReady.IsPresent
if (-not $effectiveRequireClosureReady -and -not [string]::IsNullOrWhiteSpace($OwnerBearerToken)) {
  $effectiveRequireClosureReady = $true
}
if ($effectiveRequireClosureReady) {
  $args += "--require-closure-ready"
}

Write-Host ""
Write-Host "Studio protected staging verification" -ForegroundColor Cyan
Write-Host "Env file:       $resolvedEnvFile"
Write-Host "Base URL:       $BaseUrl"
if ($expectedBuild) {
  Write-Host "Expected build: $expectedBuild"
}
if (-not [string]::IsNullOrWhiteSpace($OwnerBearerToken)) {
  Write-Host "Owner detail:   enabled"
} else {
  Write-Host "Owner detail:   skipped (no bearer token)"
}
Write-Host "Closure gate:   $(if ($effectiveRequireClosureReady) { 'enforced' } else { 'advisory only' })"
Write-Host ""

& python @args
