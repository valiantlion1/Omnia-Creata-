param(
  [switch]$HotReload
)

$ErrorActionPreference = "Stop"

$studioRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $studioRoot "backend"
$webDir = Join-Path $studioRoot "web"
$versionFile = Join-Path $studioRoot "version.json"
$expectedBuild = $null
$expectedShellText = "Omnia Creata Studio"

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

function Import-UserEnvironmentVariable {
  param([string]$Name)

  $processValue = [Environment]::GetEnvironmentVariable($Name, "Process")
  if (-not [string]::IsNullOrWhiteSpace($processValue)) {
    return
  }

  $userValue = [Environment]::GetEnvironmentVariable($Name, "User")
  if (-not [string]::IsNullOrWhiteSpace($userValue)) {
    Set-Item -Path "Env:$Name" -Value $userValue
  }
}

foreach ($secretName in @(
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "DATABASE_URL",
  "REDIS_URL",
  "JWT_SECRET",
  "OPENAI_API_KEY",
  "OPENAI_IMAGE_DRAFT_MODEL",
  "OPENAI_IMAGE_MODEL",
  "OPENAI_SERVICE_TIER",
  "OPENROUTER_API_KEY",
  "HUGGINGFACE_TOKEN",
  "FAL_API_KEY",
  "RUNWARE_API_KEY",
  "GEMINI_API_KEY",
  "PADDLE_API_KEY",
  "PADDLE_WEBHOOK_SECRET",
  "PADDLE_CHECKOUT_BASE_URL",
  "STUDIO_OWNER_EMAIL",
  "STUDIO_OWNER_EMAILS",
  "STUDIO_ROOT_ADMIN_EMAILS"
)) {
  Import-UserEnvironmentVariable -Name $secretName
}

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

function Normalize-StudioShellText {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return ""
  }

  return (($Value -replace "\s+", "").Trim().ToLowerInvariant())
}

function Test-StudioShellContent {
  param([string]$Html)

  $expected = Normalize-StudioShellText $expectedShellText
  if ([string]::IsNullOrWhiteSpace($expected) -or [string]::IsNullOrWhiteSpace($Html)) {
    return $false
  }

  return (Normalize-StudioShellText $Html).Contains($expected)
}

function Start-BackendProcess {
  param([switch]$UseHotReload)

  Write-Host "Starting Studio backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
  $backendArgs = @("-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000")
  if ($UseHotReload) {
    $backendArgs += "--reload"
  }
  Start-Process -FilePath "python" `
    -ArgumentList $backendArgs `
    -WorkingDirectory $backendDir `
    -RedirectStandardOutput $backendOut `
    -RedirectStandardError $backendErr | Out-Null
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
      if ($response.StatusCode -eq 200 -and (Test-StudioShellContent -Html $response.Content)) {
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
Write-Host "Omnia Creata Studio local stack" -ForegroundColor Cyan
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
  Start-BackendProcess -UseHotReload:$HotReload
} else {
  Write-Host "Studio backend already running on port 8000." -ForegroundColor Green
}

$legacyFrontendPorts = @(4173)
foreach ($legacyFrontendPort in $legacyFrontendPorts) {
  if (Test-PortOpen -Port $legacyFrontendPort) {
    Write-Warning "Legacy Studio frontend port $legacyFrontendPort is occupied. Stopping it to keep 127.0.0.1:5173 as the only local frontend host."
    Stop-ListeningProcesses -Port $legacyFrontendPort
    Start-Sleep -Seconds 2
  }
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
$backendRecovered = $false
if ($expectedBuild -and $backendStatus.Build -ne $expectedBuild) {
  Write-Warning "Studio backend still reports build $($backendStatus.Build). Forcing one clean restart to recover the expected build $expectedBuild."
  Stop-ListeningProcesses -Port 8000
  Start-Sleep -Seconds 2
  Start-BackendProcess -UseHotReload:$HotReload
  $backendStatus = Wait-BackendReady -ExpectedBuild $expectedBuild
  $backendRecovered = $true
}
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
if ($backendRecovered) {
  Write-Host "Backend recovery: forced clean restart succeeded" -ForegroundColor Green
}
Write-Host ""
& (Join-Path $PSScriptRoot "verify-studio-local.ps1") `
  -BackendMode $(if ($HotReload) { 'hot-reload dev' } else { 'stable always-on' }) `
  -FrontendMode $(if ($HotReload) { 'hot-reload dev' } else { 'stable preview' })
Write-Host ""
Write-Host "This remains a local always-on dev stack. Your PC still needs to stay on." -ForegroundColor Cyan
