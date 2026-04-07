param(
  [switch]$HotReload
)

$ErrorActionPreference = "Stop"

$studioRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $studioRoot "backend"
$webDir = Join-Path $studioRoot "web"
$versionFile = Join-Path $studioRoot "version.json"
$expectedBuild = $null

if (Test-Path $versionFile) {
  try {
    $expectedBuild = (Get-Content $versionFile -Raw | ConvertFrom-Json).build
  } catch {
    $expectedBuild = $null
  }
}

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
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

$backendOut = Join-Path $logDir "backend.stdout.log"
$backendErr = Join-Path $logDir "backend.stderr.log"
$frontendOut = Join-Path $logDir "frontend.stdout.log"
$frontendErr = Join-Path $logDir "frontend.stderr.log"
$frontendBuildOut = Join-Path $logDir "frontend.build.stdout.log"
$frontendBuildErr = Join-Path $logDir "frontend.build.stderr.log"

function Test-PortOpen {
  param([int]$Port)
  try {
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop | Select-Object -First 1
    return $null -ne $connection
  } catch {
    return $false
  }
}

function Get-ListeningProcessIds {
  param([int]$Port)
  try {
    return @(
      Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop |
        Select-Object -ExpandProperty OwningProcess -Unique
    )
  } catch {
    return @()
  }
}

function Stop-ProcessTree {
  param([int]$ProcessId)
  $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue
  foreach ($child in $children) {
    Stop-ProcessTree -ProcessId $child.ProcessId
  }

  Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
}

function Stop-ListeningProcesses {
  param([int]$Port)

  foreach ($processId in (Get-ListeningProcessIds -Port $Port)) {
    if ($processId -gt 0) {
      Stop-ProcessTree -ProcessId $processId
    }
  }
}

function Invoke-LoggedProcess {
  param(
    [string]$FilePath,
    [string[]]$ArgumentList,
    [string]$WorkingDirectory,
    [string]$StdOutPath,
    [string]$StdErrPath
  )

  $process = Start-Process -FilePath $FilePath `
    -ArgumentList $ArgumentList `
    -WorkingDirectory $WorkingDirectory `
    -RedirectStandardOutput $StdOutPath `
    -RedirectStandardError $StdErrPath `
    -Wait `
    -PassThru

  if ($process.ExitCode -ne 0) {
    throw "Command failed with exit code $($process.ExitCode): $FilePath $($ArgumentList -join ' ')"
  }
}

function Test-CurrentBackendBuild {
  param([string]$ExpectedBuild)
  if (-not $ExpectedBuild) {
    return $true
  }

  try {
    $payload = Invoke-RestMethod -Uri "http://127.0.0.1:8000/v1/version" -TimeoutSec 3
    $runningBuild = if ($payload.bootBuild) { $payload.bootBuild } else { $payload.build }
    return $runningBuild -eq $ExpectedBuild
  } catch {
    return $false
  }
}

function Wait-BackendReady {
  param(
    [string]$ExpectedBuild,
    [int]$TimeoutSeconds = 60
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $version = Invoke-RestMethod -Uri "http://127.0.0.1:8000/v1/version" -TimeoutSec 3
      $health = Invoke-RestMethod -Uri "http://127.0.0.1:8000/v1/healthz" -TimeoutSec 3
      $runningBuild = if ($version.bootBuild) { $version.bootBuild } else { $version.build }
      if (($ExpectedBuild -eq $null -or $runningBuild -eq $ExpectedBuild) -and $null -ne $health.status) {
        return @{
          Ready = $true
          Build = $runningBuild
          Health = $health.status
        }
      }
    } catch {
      Start-Sleep -Seconds 2
      continue
    }

    Start-Sleep -Seconds 2
  }

  return @{
    Ready = $false
    Build = $null
    Health = $null
  }
}

function Wait-FrontendReady {
  param([int]$TimeoutSeconds = 60)

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:5173/login" -TimeoutSec 3
      if ($response.StatusCode -eq 200 -and $response.Content -match "OmniaCreata Studio") {
        return $true
      }
    } catch {
      Start-Sleep -Seconds 2
      continue
    }

    Start-Sleep -Seconds 2
  }

  return $false
}

Write-Host ""
Write-Host "OmniaCreata Studio local stack" -ForegroundColor Cyan
Write-Host "Studio root: $studioRoot"
Write-Host "Runtime root: $runtimeRoot"
Write-Host "Logs: $logDir"
if ($expectedBuild) {
  Write-Host "Expected build: $expectedBuild"
}
Write-Host ""

$restartBackend = $false
if (Test-PortOpen -Port 8000) {
  if (-not (Test-CurrentBackendBuild -ExpectedBuild $expectedBuild)) {
    Write-Warning "Port 8000 is occupied by a stale or mismatched backend. Restarting the Studio backend."
    Stop-ListeningProcesses -Port 8000
    Start-Sleep -Seconds 2
    $restartBackend = $true
  }
}

if ($restartBackend -or -not (Test-PortOpen -Port 8000)) {
  Write-Host "Starting Studio backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
  $backendArgs = @("-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000")
  if ($HotReload) {
    $backendArgs += "--reload"
  }
  Start-Process -FilePath "python" `
    -ArgumentList $backendArgs `
    -WorkingDirectory $backendDir `
    -RedirectStandardOutput $backendOut `
    -RedirectStandardError $backendErr | Out-Null
} else {
  Write-Host "Studio backend already running on port 8000." -ForegroundColor Green
}

if ($HotReload) {
  if (-not (Test-PortOpen -Port 5173)) {
    Write-Host "Starting Studio frontend on http://127.0.0.1:5173 (hot-reload dev) ..." -ForegroundColor Yellow
    Start-Process -FilePath "npm.cmd" `
      -ArgumentList "run", "dev", "--", "--host", "127.0.0.1", "--port", "5173" `
      -WorkingDirectory $webDir `
      -RedirectStandardOutput $frontendOut `
      -RedirectStandardError $frontendErr | Out-Null
  } else {
    Write-Host "Studio frontend already running on port 5173 (hot-reload dev)." -ForegroundColor Green
  }
} else {
  if (Test-PortOpen -Port 5173) {
    Write-Warning "Port 5173 is occupied. Restarting the Studio frontend in stable preview mode."
    Stop-ListeningProcesses -Port 5173
    Start-Sleep -Seconds 2
  }

  Write-Host "Building Studio frontend for stable preview mode ..." -ForegroundColor Yellow
  Invoke-LoggedProcess `
    -FilePath "npm.cmd" `
    -ArgumentList @("run", "build") `
    -WorkingDirectory $webDir `
    -StdOutPath $frontendBuildOut `
    -StdErrPath $frontendBuildErr

  Write-Host "Starting Studio frontend on http://127.0.0.1:5173 (stable preview) ..." -ForegroundColor Yellow
  Start-Process -FilePath "npm.cmd" `
    -ArgumentList "run", "preview", "--", "--host", "127.0.0.1", "--port", "5173", "--strictPort" `
    -WorkingDirectory $webDir `
    -RedirectStandardOutput $frontendOut `
    -RedirectStandardError $frontendErr | Out-Null
}

$backendStatus = Wait-BackendReady -ExpectedBuild $expectedBuild
$frontendReady = Wait-FrontendReady

if (-not $backendStatus.Ready) {
  Write-Error "Studio backend did not become ready within the expected startup window."
}

if (-not $frontendReady) {
  Write-Error "Studio frontend did not become ready within the expected startup window."
}

Write-Host ""
Write-Host "Frontend:     http://127.0.0.1:5173" -ForegroundColor Green
Write-Host "Backend docs: http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host "Health:       http://127.0.0.1:8000/v1/healthz" -ForegroundColor Green
Write-Host "Logs:         $logDir" -ForegroundColor Green
Write-Host "Backend mode: $(if ($HotReload) { 'hot-reload dev' } else { 'stable always-on' })" -ForegroundColor Green
Write-Host "Frontend mode: $(if ($HotReload) { 'hot-reload dev' } else { 'stable preview' })" -ForegroundColor Green
Write-Host "Backend build: $($backendStatus.Build)" -ForegroundColor Green
Write-Host "Backend health: $($backendStatus.Health)" -ForegroundColor Green
Write-Host ""
& (Join-Path $PSScriptRoot "verify-studio-local.ps1") `
  -BackendMode $(if ($HotReload) { 'hot-reload dev' } else { 'stable always-on' }) `
  -FrontendMode $(if ($HotReload) { 'hot-reload dev' } else { 'stable preview' })
Write-Host ""
Write-Host "This remains a local always-on dev stack. Your PC still needs to stay on." -ForegroundColor Cyan
