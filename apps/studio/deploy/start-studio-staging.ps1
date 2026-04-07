param(
  [string]$EnvFile = ".env.staging",
  [switch]$SkipBuild,
  [switch]$NoVerify,
  [string]$OwnerBearerToken
)

$ErrorActionPreference = "Stop"

$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$studioRoot = Split-Path -Parent $deployDir
$backendDir = Join-Path $studioRoot "backend"
$composeFile = Join-Path $deployDir "docker-compose.staging.yml"
$verifyScript = Join-Path $deployDir "verify-studio-staging.ps1"
$resolvedEnvFile = [System.IO.Path]::GetFullPath((Join-Path $deployDir $EnvFile))

if (-not (Test-Path $resolvedEnvFile)) {
  throw "Missing staging env file: $resolvedEnvFile"
}

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker is not installed or not available on PATH. Sprint 8 protected staging requires Docker Desktop or a compatible docker CLI."
}

Write-Host ""
Write-Host "Studio protected staging bring-up" -ForegroundColor Cyan
Write-Host "Compose file: $composeFile"
Write-Host "Env file:     $resolvedEnvFile"
Write-Host ""

& python (Join-Path $backendDir "scripts\deployment_preflight.py") --env-file $resolvedEnvFile
if ($LASTEXITCODE -ne 0) {
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

& docker @composeArgs
if ($LASTEXITCODE -ne 0) {
  throw "Docker compose bring-up failed."
}

if (-not $NoVerify) {
  $verifyArgs = @(
    "-ExecutionPolicy",
    "Bypass",
    "-File",
    $verifyScript,
    "-EnvFile",
    $resolvedEnvFile
  )
  if (-not [string]::IsNullOrWhiteSpace($OwnerBearerToken)) {
    $verifyArgs += @("-OwnerBearerToken", $OwnerBearerToken)
  }
  & powershell @verifyArgs
  if ($LASTEXITCODE -ne 0) {
    throw "Protected staging verification failed."
  }
}
