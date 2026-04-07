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

if (Test-Path $versionFile) {
  try {
    $expectedBuild = (Get-Content $versionFile -Raw | ConvertFrom-Json).build
  } catch {
    $expectedBuild = $null
  }
}

$resolvedEnvFile = [System.IO.Path]::GetFullPath((Join-Path $deployDir $EnvFile))
if (-not (Test-Path $resolvedEnvFile)) {
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
