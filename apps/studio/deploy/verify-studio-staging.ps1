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

function Resolve-EnvFilePath {
  param([string]$PathValue)

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return $null
  }

  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return [System.IO.Path]::GetFullPath($PathValue)
  }

  return [System.IO.Path]::GetFullPath((Join-Path $deployDir $PathValue))
}

function Resolve-StagingRuntimeRoot {
  param([hashtable]$EnvValues)

  if ($EnvValues -and $EnvValues.ContainsKey("STAGING_RUNTIME_ROOT")) {
    $candidate = Resolve-AbsolutePath $EnvValues["STAGING_RUNTIME_ROOT"]
    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
      return $candidate
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($env:STAGING_RUNTIME_ROOT)) {
    $candidate = Resolve-AbsolutePath $env:STAGING_RUNTIME_ROOT
    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
      return $candidate
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($env:STUDIO_RUNTIME_ROOT)) {
    $candidate = Resolve-AbsolutePath $env:STUDIO_RUNTIME_ROOT
    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
      return $candidate
    }
  }

  if ($env:LOCALAPPDATA) {
    return Join-Path $env:LOCALAPPDATA "OmniaCreata\Studio\staging"
  }

  return Join-Path $HOME ".omnia_creata\studio\staging"
}

function Resolve-StagingVerifyBaseUrl {
  param(
    [hashtable]$EnvValues,
    [string]$ExplicitBaseUrl
  )

  if (-not [string]::IsNullOrWhiteSpace($ExplicitBaseUrl)) {
    return $ExplicitBaseUrl.Trim()
  }

  if ($EnvValues -and $EnvValues.ContainsKey("STAGING_VERIFY_BASE_URL")) {
    $candidate = [string]$EnvValues["STAGING_VERIFY_BASE_URL"]
    $candidate = $candidate.Trim()
    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
      return $candidate
    }
  }

  $webPort = ""
  if ($EnvValues -and $EnvValues.ContainsKey("WEB_PORT")) {
    $webPort = [string]$EnvValues["WEB_PORT"]
    $webPort = $webPort.Trim()
  }
  if ([string]::IsNullOrWhiteSpace($webPort)) {
    $webPort = "8080"
  }
  return "http://127.0.0.1:$webPort"
}

function Resolve-DefaultLocalRuntimeRoot {
  if ($env:LOCALAPPDATA) {
    return Join-Path $env:LOCALAPPDATA "OmniaCreata\Studio"
  }

  return Join-Path $HOME ".omnia_creata\studio"
}

function Sync-LocalStartupVerificationReport {
  param([string]$TargetRuntimeRoot)

  if ([string]::IsNullOrWhiteSpace($TargetRuntimeRoot)) {
    return
  }

  $sourceRuntimeRoot = Resolve-DefaultLocalRuntimeRoot
  $sourceReport = Join-Path $sourceRuntimeRoot "reports\local-verify-latest.json"
  $targetReport = Join-Path $TargetRuntimeRoot "reports\local-verify-latest.json"

  if (-not (Test-Path $sourceReport)) {
    return
  }

  if ((Resolve-AbsolutePath $sourceReport) -eq (Resolve-AbsolutePath $targetReport)) {
    return
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $targetReport) | Out-Null
  Copy-Item -Path $sourceReport -Destination $targetReport -Force
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

$runtimeRoot = Resolve-StagingRuntimeRoot -EnvValues @{}

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

$resolvedEnvFile = Resolve-EnvFilePath -PathValue $EnvFile
if (-not (Test-Path $resolvedEnvFile)) {
  Write-StagingVerifyBlockerReport `
    -Summary "Protected staging verify env file is missing." `
    -Detail "Create $resolvedEnvFile before running verify-studio-staging.ps1." `
    -BaseUrl $BaseUrl
  throw "Missing staging env file: $resolvedEnvFile"
}

$envValues = Get-EnvMap -PathValue $resolvedEnvFile
$runtimeRoot = Resolve-StagingRuntimeRoot -EnvValues $envValues
$reportDir = Join-Path $runtimeRoot "reports"
$blockerReportPath = Join-Path $reportDir "protected-staging-verify-latest.json"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
$env:STAGING_RUNTIME_ROOT = $runtimeRoot
$env:STUDIO_RUNTIME_ROOT = $runtimeRoot
$BaseUrl = Resolve-StagingVerifyBaseUrl -EnvValues $envValues -ExplicitBaseUrl $BaseUrl
Sync-LocalStartupVerificationReport -TargetRuntimeRoot $runtimeRoot

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
Write-Host "Runtime root:   $runtimeRoot"
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
