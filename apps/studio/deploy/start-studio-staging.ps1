param(
  [string]$EnvFile = ".env.staging",
  [switch]$SkipBuild,
  [switch]$NoVerify,
  [string]$VerifyBaseUrl,
  [string]$OwnerBearerToken,
  [switch]$RequireClosureReady
)

$ErrorActionPreference = "Stop"

$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$studioRoot = Split-Path -Parent $deployDir
$backendDir = Join-Path $studioRoot "backend"
$composeFile = Join-Path $deployDir "docker-compose.staging.yml"
$verifyScript = Join-Path $deployDir "verify-studio-staging.ps1"
$versionFile = Join-Path $studioRoot "version.json"
$versionManifest = $null
$expectedBuild = $null
$expectedVersion = $null

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

function Get-EnvMap {
  param([string]$PathValue)

  $values = @{}
  if (-not (Test-Path $PathValue)) {
    return $values
  }

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

if (Test-Path $versionFile) {
  try {
    $versionManifest = Get-Content $versionFile -Raw | ConvertFrom-Json
    $expectedBuild = $versionManifest.build
    $expectedVersion = $versionManifest.version
  } catch {
    $versionManifest = $null
  }
}

$resolvedEnvFile = Resolve-EnvFilePath -PathValue $EnvFile

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

$envValues = Get-EnvMap -PathValue $resolvedEnvFile
$runtimeRoot = Resolve-StagingRuntimeRoot -EnvValues $envValues
$reportDir = Join-Path $runtimeRoot "reports"
$blockerReportPath = Join-Path $reportDir "protected-staging-verify-latest.json"
New-Item -ItemType Directory -Force -Path $reportDir | Out-Null
New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $runtimeRoot "logs") | Out-Null
$env:STAGING_RUNTIME_ROOT = $runtimeRoot
$env:STUDIO_RUNTIME_ROOT = $runtimeRoot

$baseUrl = Resolve-StagingVerifyBaseUrl -EnvValues $envValues -ExplicitBaseUrl $VerifyBaseUrl

if (-not (Test-Path $resolvedEnvFile)) {
  Write-StagingBlockerReport `
    -Summary "Protected staging env file is missing." `
    -Detail "Create $resolvedEnvFile before attempting Sprint 8 staging bring-up." `
    -BaseUrl $baseUrl
  throw "Missing staging env file: $resolvedEnvFile"
}

$dockerCommandPath = Get-DockerCommandPath
if ([string]::IsNullOrWhiteSpace($dockerCommandPath)) {
  Write-StagingBlockerReport `
    -Summary "Docker is missing on this machine." `
    -Detail "Sprint 8 protected staging requires Docker Desktop or a compatible docker CLI on PATH or in the standard Docker Desktop install path." `
    -BaseUrl $baseUrl
  throw "Docker is not installed or not available on PATH or in the standard Docker Desktop install path. Sprint 8 protected staging requires Docker Desktop or a compatible docker CLI."
}

Ensure-PathContains -DirectoryPath (Split-Path -Parent $dockerCommandPath)

Write-Host ""
Write-Host "Studio protected staging bring-up" -ForegroundColor Cyan
Write-Host "Compose file: $composeFile"
Write-Host "Env file:     $resolvedEnvFile"
Write-Host "Runtime root: $runtimeRoot"
Write-Host "Verify URL:   $baseUrl"
Write-Host ""

& python (Join-Path $backendDir "scripts\deployment_preflight.py") --env-file $resolvedEnvFile
if ($LASTEXITCODE -ne 0) {
  Write-StagingBlockerReport `
    -Summary "Studio deployment preflight failed." `
    -Detail "Fix the staging env/topology issues reported by deployment_preflight.py before retrying Sprint 8 staging bring-up." `
    -BaseUrl $baseUrl
  throw "Studio deployment preflight failed."
}

$composeArgs = @(
  "compose",
  "-f",
  $composeFile,
  "--env-file",
  $resolvedEnvFile,
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
    $resolvedEnvFile,
    "-BaseUrl",
    $baseUrl
  )
  if (-not [string]::IsNullOrWhiteSpace($OwnerBearerToken)) {
    $verifyArgs += @("-OwnerBearerToken", $OwnerBearerToken)
  }
  if ($RequireClosureReady.IsPresent) {
    $verifyArgs += "-RequireClosureReady"
  }
  & powershell @verifyArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Protected staging verification failed."
  }
}
