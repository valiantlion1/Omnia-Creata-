$ErrorActionPreference = "Stop"

$studioRoot = Split-Path -Parent $PSScriptRoot
$backendDir = Join-Path $studioRoot "backend"
$comfyDir = Join-Path $backendDir "ComfyUI"
$comfyPython = Join-Path $comfyDir ".venv\Scripts\python.exe"
$backendOut = Join-Path $backendDir "studio-backend.out.log"
$backendErr = Join-Path $backendDir "studio-backend.err.log"
$comfyOut = Join-Path $comfyDir "comfyui.out.log"
$comfyErr = Join-Path $comfyDir "comfyui.err.log"

function Test-PortOpen {
  param([int]$Port)
  try {
    $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction Stop | Select-Object -First 1
    return $null -ne $connection
  } catch {
    return $false
  }
}

Write-Host ""
Write-Host "OmniaCreata Studio local stack" -ForegroundColor Cyan
Write-Host "Studio root: $studioRoot"
Write-Host ""

if (-not (Test-PortOpen -Port 8188)) {
  if (Test-Path $comfyPython) {
    Write-Host "Starting ComfyUI on http://127.0.0.1:8188 ..." -ForegroundColor Yellow
    Start-Process -FilePath $comfyPython `
      -ArgumentList "main.py", "--listen", "127.0.0.1", "--port", "8188" `
      -WorkingDirectory $comfyDir `
      -RedirectStandardOutput $comfyOut `
      -RedirectStandardError $comfyErr | Out-Null
  } else {
    Write-Warning "ComfyUI Python runtime not found at $comfyPython"
  }
} else {
  Write-Host "ComfyUI already running on port 8188." -ForegroundColor Green
}

if (-not (Test-PortOpen -Port 8000)) {
  Write-Host "Starting Studio backend on http://127.0.0.1:8000 ..." -ForegroundColor Yellow
  Start-Process -FilePath "python" `
    -ArgumentList "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8000" `
    -WorkingDirectory $backendDir `
    -RedirectStandardOutput $backendOut `
    -RedirectStandardError $backendErr | Out-Null
} else {
  Write-Host "Studio backend already running on port 8000." -ForegroundColor Green
}

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Backend docs: http://127.0.0.1:8000/docs" -ForegroundColor Green
Write-Host "Health:       http://127.0.0.1:8000/v1/healthz" -ForegroundColor Green
Write-Host "ComfyUI:      http://127.0.0.1:8188" -ForegroundColor Green
Write-Host ""
Write-Host "Open Studio web separately with your Vite server, then activate local owner mode from Settings." -ForegroundColor Cyan
