param(
  [string]$EnvFile = ".env.staging",
  [string]$BaseUrl,
  [string]$ApiPrefix = "/api",
  [string]$Label = "protected-staging",
  [string]$OwnerBearerToken,
  [switch]$PromptForOwnerToken,
  [switch]$RequireClosureReady
)

$ErrorActionPreference = "Stop"

$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$studioRoot = Split-Path -Parent $deployDir
$backendDir = Join-Path $studioRoot "backend"
$helperScript = Join-Path $deployDir "staging-runtime-helpers.ps1"
$versionFile = Join-Path $studioRoot "version.json"
$expectedBuild = $null
$expectedVersion = $null

if (-not (Test-Path $helperScript)) {
  throw "Missing staging runtime helper script: $helperScript"
}
. $helperScript

function Read-OwnerBearerToken {
  param([string]$Prompt = "Paste the owner bearer token (Bearer prefix optional)")

  $secureToken = Read-Host -Prompt $Prompt -AsSecureString
  $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureToken)
  try {
    $plainToken = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
  }

  if ([string]::IsNullOrWhiteSpace($plainToken)) {
    return $null
  }

  $plainToken = $plainToken.Trim()
  if ($plainToken -match '^(?i:Bearer)\s+') {
    $plainToken = $plainToken -replace '^(?i:Bearer)\s+', ''
  }
  return $plainToken.Trim()
}

function Get-DeploymentReportFilename {
  param([string]$Value)

  $sourceValue = [string]$Value
  $normalized = [regex]::Replace($sourceValue.ToLowerInvariant(), "[^a-z0-9]+", "-").Trim("-")
  if ([string]::IsNullOrWhiteSpace($normalized)) {
    $normalized = "deployment"
  }
  return "$normalized-verify-latest.json"
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
$blockerReportPath = Join-Path $reportDir (Get-DeploymentReportFilename -Value $Label)
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

$resolvedEnvFile = Resolve-EnvFilePath -DeployDir $deployDir -PathValue $EnvFile
if (-not (Test-Path $resolvedEnvFile)) {
  Write-StagingVerifyBlockerReport `
    -Summary "Protected staging verify env file is missing." `
    -Detail "Create $resolvedEnvFile before running verify-studio-staging.ps1." `
    -BaseUrl $BaseUrl
  throw "Missing staging env file: $resolvedEnvFile"
}

$sourceEnvValues = Get-EnvMap -PathValue $resolvedEnvFile
$runtimeRoot = Resolve-StagingRuntimeRoot -EnvValues $sourceEnvValues
$reportDir = Join-Path $runtimeRoot "reports"
$blockerReportPath = Join-Path $reportDir (Get-DeploymentReportFilename -Value $Label)
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
$effectiveEnv = New-StagingEffectiveEnvFile -SourceEnvFile $resolvedEnvFile -RuntimeRoot $runtimeRoot
$effectiveEnvFile = [string]$effectiveEnv.Path
$envValues = $effectiveEnv.Values
$env:STAGING_RUNTIME_ROOT = $runtimeRoot
$env:STUDIO_RUNTIME_ROOT = $runtimeRoot
$env:STAGING_ENV_FILE = $effectiveEnvFile
$BaseUrl = Resolve-StagingVerifyBaseUrl -EnvValues $envValues -ExplicitBaseUrl $BaseUrl
Sync-LocalStartupVerificationReport -TargetRuntimeRoot $runtimeRoot
Sync-LocalProviderSmokeReport -TargetRuntimeRoot $runtimeRoot

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
if ([string]::IsNullOrWhiteSpace($OwnerBearerToken) -and $PromptForOwnerToken.IsPresent) {
  $OwnerBearerToken = Read-OwnerBearerToken
}
$effectiveRequireClosureReady = $RequireClosureReady.IsPresent
if (-not $effectiveRequireClosureReady -and -not [string]::IsNullOrWhiteSpace($OwnerBearerToken)) {
  $effectiveRequireClosureReady = $true
}
if ($effectiveRequireClosureReady -and [string]::IsNullOrWhiteSpace($OwnerBearerToken)) {
  Write-StagingVerifyBlockerReport `
    -Summary "Owner bearer token is missing for closure-grade staging verification." `
    -Detail "Set STUDIO_HEALTH_DETAIL_TOKEN, pass -OwnerBearerToken, or use -PromptForOwnerToken before enforcing closure_ready from verify-studio-staging.ps1." `
    -BaseUrl $BaseUrl
  throw "Owner bearer token is required when protected staging verification is asked to enforce closure_ready."
}
if ($effectiveRequireClosureReady) {
  $args += "--require-closure-ready"
}

Write-Host ""
Write-Host "Studio protected staging verification" -ForegroundColor Cyan
Write-Host "Env file:       $resolvedEnvFile"
Write-Host "Effective env:  $effectiveEnvFile"
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

$originalOwnerTokenPresent = Test-Path Env:STUDIO_HEALTH_DETAIL_TOKEN
$originalOwnerToken = $env:STUDIO_HEALTH_DETAIL_TOKEN
try {
  if (-not [string]::IsNullOrWhiteSpace($OwnerBearerToken)) {
    $env:STUDIO_HEALTH_DETAIL_TOKEN = $OwnerBearerToken
  }
  & python @args
} finally {
  if ($originalOwnerTokenPresent) {
    $env:STUDIO_HEALTH_DETAIL_TOKEN = $originalOwnerToken
  } else {
    Remove-Item Env:STUDIO_HEALTH_DETAIL_TOKEN -ErrorAction SilentlyContinue
  }
}
