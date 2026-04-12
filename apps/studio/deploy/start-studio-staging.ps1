param(
  [string]$EnvFile = ".env.staging",
  [switch]$SkipBuild,
  [switch]$NoVerify,
  [string]$VerifyBaseUrl,
  [string]$OwnerBearerToken,
  [switch]$PromptForOwnerToken,
  [switch]$RequireClosureReady
)

$ErrorActionPreference = "Stop"

$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$studioRoot = Split-Path -Parent $deployDir
$backendDir = Join-Path $studioRoot "backend"
$composeFile = Join-Path $deployDir "docker-compose.staging.yml"
$helperScript = Join-Path $deployDir "staging-runtime-helpers.ps1"
$verifyScript = Join-Path $deployDir "verify-studio-staging.ps1"
$versionFile = Join-Path $studioRoot "version.json"
$versionManifest = $null
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

function Get-DockerCommandPath {
  $dockerCommand = Get-Command docker -ErrorAction SilentlyContinue
  if ($dockerCommand -and -not [string]::IsNullOrWhiteSpace($dockerCommand.Source)) {
    return $dockerCommand.Source
  }

  $candidates = @(
    "C:\Program Files\Docker\Docker\resources\bin\docker.exe",
    "C:\Program Files\Docker\Docker\resources\docker.exe",
    (Join-Path $env:LOCALAPPDATA "Programs\Docker\Docker\resources\bin\docker.exe")
  )
  foreach ($candidate in $candidates) {
    if (-not [string]::IsNullOrWhiteSpace($candidate) -and (Test-Path $candidate)) {
      return $candidate
    }
  }
  return $null
}

function Ensure-PathContains {
  param([string]$DirectoryPath)

  if ([string]::IsNullOrWhiteSpace($DirectoryPath)) {
    return
  }

  $segments = @($env:PATH -split ';' | Where-Object { -not [string]::IsNullOrWhiteSpace($_) })
  if ($segments -contains $DirectoryPath) {
    return
  }
  $env:PATH = "$DirectoryPath;$env:PATH"
}

function Test-DockerEngineReady {
  param([string]$DockerCommandPath)

  if ([string]::IsNullOrWhiteSpace($DockerCommandPath)) {
    return $false
  }

  $quotedDockerCommandPath = '"' + $DockerCommandPath + '"'
  $probeCommand = "$quotedDockerCommandPath info --format ""{{.ServerVersion}}"" >nul 2>nul"
  cmd /c $probeCommand | Out-Null
  return ($LASTEXITCODE -eq 0)
}

if (Test-Path $versionFile) {
  try {
    $versionManifest = Get-Content $versionFile -Raw | ConvertFrom-Json
    $expectedBuild = $versionManifest.build
    $expectedVersion = $versionManifest.version
  } catch {
    $versionManifest = $null
  }
}

$resolvedEnvFile = Resolve-EnvFilePath -DeployDir $deployDir -PathValue $EnvFile

$runtimeRoot = Resolve-StagingRuntimeRoot -EnvValues @{}

$reportDir = Join-Path $runtimeRoot "reports"
$blockerReportPath = Join-Path $reportDir "protected-staging-verify-latest.json"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null

function Write-StagingBlockerReport {
  param(
    [string]$Summary,
    [string]$Detail,
    [string]$BaseUrl = ""
  )

  $payload = [ordered]@{
    recorded_at = (Get-Date).ToUniversalTime().ToString("o")
    version = $expectedVersion
    build = $expectedBuild
    label = "protected-staging"
    base_url = $BaseUrl
    status = "blocked"
    summary = $Summary
    blocking_count = 1
    warning_count = 0
    expected_build = $expectedBuild
    actual_build = $null
    health_status = $null
    owner_health_checked = $false
    closure_ready = $false
    closure_summary = "Protected staging verification cannot proceed until the environment blocker is cleared."
    closure_gaps = @($Detail)
    checks = @(
      [ordered]@{
        key = "staging_environment"
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

$sourceEnvValues = Get-EnvMap -PathValue $resolvedEnvFile
$runtimeRoot = Resolve-StagingRuntimeRoot -EnvValues $sourceEnvValues
$reportDir = Join-Path $runtimeRoot "reports"
$blockerReportPath = Join-Path $reportDir "protected-staging-verify-latest.json"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $runtimeRoot "logs") | Out-Null
$effectiveEnv = New-StagingEffectiveEnvFile -SourceEnvFile $resolvedEnvFile -RuntimeRoot $runtimeRoot
$effectiveEnvFile = [string]$effectiveEnv.Path
$envValues = $effectiveEnv.Values
$env:STAGING_RUNTIME_ROOT = $runtimeRoot
$env:STUDIO_RUNTIME_ROOT = $runtimeRoot
$env:STAGING_ENV_FILE = $effectiveEnvFile

$baseUrl = Resolve-StagingVerifyBaseUrl -EnvValues $envValues -ExplicitBaseUrl $VerifyBaseUrl

if ([string]::IsNullOrWhiteSpace($OwnerBearerToken) -and -not [string]::IsNullOrWhiteSpace($env:STUDIO_HEALTH_DETAIL_TOKEN)) {
  $OwnerBearerToken = $env:STUDIO_HEALTH_DETAIL_TOKEN
}
if ([string]::IsNullOrWhiteSpace($OwnerBearerToken) -and $PromptForOwnerToken.IsPresent) {
  $OwnerBearerToken = Read-OwnerBearerToken
}
$closureGateRequested = $RequireClosureReady.IsPresent

if (-not (Test-Path $resolvedEnvFile)) {
  Write-StagingBlockerReport `
    -Summary "Protected staging env file is missing." `
    -Detail "Create $resolvedEnvFile before attempting protected beta staging bring-up." `
    -BaseUrl $baseUrl
  throw "Missing staging env file: $resolvedEnvFile"
}

$dockerCommandPath = Get-DockerCommandPath
if ([string]::IsNullOrWhiteSpace($dockerCommandPath)) {
  Write-StagingBlockerReport `
    -Summary "Docker is missing on this machine." `
    -Detail "Protected beta staging requires Docker Desktop or a compatible docker CLI on PATH or in the standard Docker Desktop install path." `
    -BaseUrl $baseUrl
  throw "Docker is not installed or not available on PATH or in the standard Docker Desktop install path. Protected beta staging requires Docker Desktop or a compatible docker CLI."
}

Ensure-PathContains -DirectoryPath (Split-Path -Parent $dockerCommandPath)

if (-not (Test-DockerEngineReady -DockerCommandPath $dockerCommandPath)) {
  Write-StagingBlockerReport `
    -Summary "Docker engine is not running." `
    -Detail "Protected beta staging requires a running Docker daemon. Start Docker Desktop (or another compatible engine) before retrying protected staging bring-up." `
    -BaseUrl $baseUrl
  throw "Docker engine is not running. Start Docker Desktop (or another compatible engine) before retrying protected staging bring-up."
}

if ($closureGateRequested -and [string]::IsNullOrWhiteSpace($OwnerBearerToken)) {
  Write-StagingBlockerReport `
    -Summary "Owner bearer token is missing for closure-grade staging bring-up." `
    -Detail "Set STUDIO_HEALTH_DETAIL_TOKEN, pass -OwnerBearerToken, or use -PromptForOwnerToken before running protected staging with -RequireClosureReady." `
    -BaseUrl $baseUrl
  throw "Owner bearer token is required when protected staging bring-up is asked to enforce closure_ready."
}

Write-Host ""
Write-Host "Studio protected staging bring-up" -ForegroundColor Cyan
Write-Host "Compose file: $composeFile"
Write-Host "Env file:     $resolvedEnvFile"
Write-Host "Effective env:$effectiveEnvFile"
Write-Host "Runtime root: $runtimeRoot"
Write-Host "Verify URL:   $baseUrl"
Write-Host "Owner detail: $(if (-not [string]::IsNullOrWhiteSpace($OwnerBearerToken)) { 'enabled' } else { 'skipped (no bearer token)' })"
Write-Host "Closure gate: $(if ($closureGateRequested -or -not [string]::IsNullOrWhiteSpace($OwnerBearerToken)) { 'enforced during verify' } else { 'advisory only' })"
Write-Host ""

& python (Join-Path $backendDir "scripts\deployment_preflight.py") --env-file $effectiveEnvFile
if ($LASTEXITCODE -ne 0) {
  Write-StagingBlockerReport `
    -Summary "Studio deployment preflight failed." `
    -Detail "Fix the staging env/topology issues reported by deployment_preflight.py before retrying protected beta staging bring-up." `
    -BaseUrl $baseUrl
  throw "Studio deployment preflight failed."
}

$composeArgs = @(
  "compose",
  "-f",
  $composeFile,
  "--env-file",
  $effectiveEnvFile,
  "up"
)
if (-not $SkipBuild) {
  $composeArgs += "--build"
}
$composeArgs += "-d"

& $dockerCommandPath @composeArgs
if ($LASTEXITCODE -ne 0) {
  Write-StagingBlockerReport `
    -Summary "Docker compose bring-up failed." `
    -Detail "Protected staging did not reach a running topology. Inspect docker compose output and runtime logs before retrying." `
    -BaseUrl $baseUrl
  throw "Docker compose bring-up failed."
}

if (-not $NoVerify) {
  $verifyArgs = @(
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $verifyScript,
    "-EnvFile",
    $effectiveEnvFile,
    "-BaseUrl",
    $baseUrl
  )
  if ($RequireClosureReady.IsPresent) {
    $verifyArgs += "-RequireClosureReady"
  }
  $originalOwnerTokenPresent = Test-Path Env:STUDIO_HEALTH_DETAIL_TOKEN
  $originalOwnerToken = $env:STUDIO_HEALTH_DETAIL_TOKEN
  try {
    if (-not [string]::IsNullOrWhiteSpace($OwnerBearerToken)) {
      $env:STUDIO_HEALTH_DETAIL_TOKEN = $OwnerBearerToken
    }
    & powershell @verifyArgs
    if ($LASTEXITCODE -ne 0) {
      throw "Protected staging verification failed."
    }
  } finally {
    if ($originalOwnerTokenPresent) {
      $env:STUDIO_HEALTH_DETAIL_TOKEN = $originalOwnerToken
    } else {
      Remove-Item Env:STUDIO_HEALTH_DETAIL_TOKEN -ErrorAction SilentlyContinue
    }
  }
}
