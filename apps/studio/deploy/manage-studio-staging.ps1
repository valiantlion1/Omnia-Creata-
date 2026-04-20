param(
  [ValidateSet("status", "logs", "up", "redeploy", "verify", "down", "restart", "report")]
  [string]$Action = "status",
  [string]$EnvFile = ".env.staging",
  [string]$Service,
  [int]$Tail = 150,
  [switch]$Follow,
  [switch]$SkipBuild,
  [switch]$NoVerify,
  [string]$VerifyBaseUrl,
  [string]$OwnerBearerToken,
  [switch]$PromptForOwnerToken,
  [switch]$RequireClosureReady
)

$ErrorActionPreference = "Stop"

$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$helperScript = Join-Path $deployDir "staging-runtime-helpers.ps1"
$composeFile = Join-Path $deployDir "docker-compose.staging.yml"
$startScript = Join-Path $deployDir "start-studio-staging.ps1"
$verifyScript = Join-Path $deployDir "verify-studio-staging.ps1"

if (-not (Test-Path $helperScript)) {
  throw "Missing staging runtime helper script: $helperScript"
}
. $helperScript

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

function Resolve-StagingContext {
  param([string]$RequestedEnvFile)

  $resolvedEnvFile = Resolve-EnvFilePath -DeployDir $deployDir -PathValue $RequestedEnvFile
  if (-not (Test-Path $resolvedEnvFile)) {
    throw "Missing staging env file: $resolvedEnvFile"
  }

  $sourceEnvValues = Get-EnvMap -PathValue $resolvedEnvFile
  $runtimeRoot = Resolve-StagingRuntimeRoot -EnvValues $sourceEnvValues
  New-Item -ItemType Directory -Force -Path $runtimeRoot | Out-Null

  $effectiveEnv = New-StagingEffectiveEnvFile -SourceEnvFile $resolvedEnvFile -RuntimeRoot $runtimeRoot
  $baseUrl = Resolve-StagingVerifyBaseUrl -EnvValues $effectiveEnv.Values -ExplicitBaseUrl $VerifyBaseUrl

  return @{
    ResolvedEnvFile = $resolvedEnvFile
    RuntimeRoot = $runtimeRoot
    EffectiveEnvFile = [string]$effectiveEnv.Path
    EffectiveEnvValues = $effectiveEnv.Values
    BaseUrl = $baseUrl
    ReportPath = Join-Path $runtimeRoot "reports\protected-staging-verify-latest.json"
  }
}

function Invoke-DockerCompose {
  param(
    [string[]]$ComposeArgs,
    [switch]$AllowFailure
  )

  $dockerCommandPath = Get-DockerCommandPath
  if ([string]::IsNullOrWhiteSpace($dockerCommandPath)) {
    throw "Docker is not installed or not available on PATH."
  }

  Ensure-PathContains -DirectoryPath (Split-Path -Parent $dockerCommandPath)
  & $dockerCommandPath @ComposeArgs
  if (-not $AllowFailure -and $LASTEXITCODE -ne 0) {
    throw "Docker compose command failed."
  }
}

function Show-StagingReportSummary {
  param([string]$ReportPath)

  if (-not (Test-Path $ReportPath)) {
    Write-Host "Latest report: missing ($ReportPath)" -ForegroundColor Yellow
    return
  }

  try {
    $report = Get-Content $ReportPath -Raw | ConvertFrom-Json
  } catch {
    Write-Host "Latest report: unreadable ($ReportPath)" -ForegroundColor Yellow
    return
  }

  $statusColor = switch ($report.status) {
    "pass" { "Green" }
    "warning" { "Yellow" }
    "blocked" { "Red" }
    default { "Cyan" }
  }

  Write-Host ""
  Write-Host "Latest protected staging report" -ForegroundColor Cyan
  Write-Host ("Status:        {0}" -f $report.status) -ForegroundColor $statusColor
  Write-Host ("Build:         {0}" -f $report.build)
  Write-Host ("Base URL:      {0}" -f $report.base_url)
  Write-Host ("Closure ready: {0}" -f $report.closure_ready)
  Write-Host ("Summary:       {0}" -f $report.summary)
  if ($report.closure_gaps -and $report.closure_gaps.Count -gt 0) {
    Write-Host "Closure gaps:" -ForegroundColor Yellow
    foreach ($gap in $report.closure_gaps) {
      Write-Host ("- {0}" -f $gap)
    }
  }
}

$context = Resolve-StagingContext -RequestedEnvFile $EnvFile

$composeBaseArgs = @(
  "compose",
  "-f",
  $composeFile,
  "--env-file",
  $context.EffectiveEnvFile
)

switch ($Action) {
  "status" {
    Write-Host ""
    Write-Host "Studio staging operator status" -ForegroundColor Cyan
    Write-Host "Env file:     $($context.ResolvedEnvFile)"
    Write-Host "Effective env:$($context.EffectiveEnvFile)"
    Write-Host "Runtime root: $($context.RuntimeRoot)"
    Write-Host "Base URL:     $($context.BaseUrl)"
    Write-Host ""
    Invoke-DockerCompose -ComposeArgs ($composeBaseArgs + @("ps")) -AllowFailure
    Show-StagingReportSummary -ReportPath $context.ReportPath
  }
  "report" {
    Show-StagingReportSummary -ReportPath $context.ReportPath
  }
  "logs" {
    $logArgs = @("logs", "--tail", [string][Math]::Max($Tail, 1))
    if ($Follow) {
      $logArgs += "-f"
    }
    if (-not [string]::IsNullOrWhiteSpace($Service)) {
      $logArgs += $Service
    }
    Invoke-DockerCompose -ComposeArgs ($composeBaseArgs + $logArgs)
  }
  "up" {
    $upArgs = @(
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      $startScript,
      "-EnvFile",
      $context.ResolvedEnvFile
    )
    if ($SkipBuild) {
      $upArgs += "-SkipBuild"
    }
    if ($NoVerify) {
      $upArgs += "-NoVerify"
    }
    if (-not [string]::IsNullOrWhiteSpace($VerifyBaseUrl)) {
      $upArgs += @("-VerifyBaseUrl", $VerifyBaseUrl)
    }
    if (-not [string]::IsNullOrWhiteSpace($OwnerBearerToken)) {
      $upArgs += @("-OwnerBearerToken", $OwnerBearerToken)
    }
    if ($PromptForOwnerToken) {
      $upArgs += "-PromptForOwnerToken"
    }
    if ($RequireClosureReady) {
      $upArgs += "-RequireClosureReady"
    }
    & powershell @upArgs
    if ($LASTEXITCODE -ne 0) {
      throw "Protected staging bring-up failed."
    }
  }
  "redeploy" {
    $redeployArgs = @(
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      $startScript,
      "-EnvFile",
      $context.ResolvedEnvFile
    )
    if ($SkipBuild) {
      $redeployArgs += "-SkipBuild"
    }
    if ($NoVerify) {
      $redeployArgs += "-NoVerify"
    }
    if (-not [string]::IsNullOrWhiteSpace($VerifyBaseUrl)) {
      $redeployArgs += @("-VerifyBaseUrl", $VerifyBaseUrl)
    }
    if (-not [string]::IsNullOrWhiteSpace($OwnerBearerToken)) {
      $redeployArgs += @("-OwnerBearerToken", $OwnerBearerToken)
    }
    if ($PromptForOwnerToken) {
      $redeployArgs += "-PromptForOwnerToken"
    }
    if ($RequireClosureReady) {
      $redeployArgs += "-RequireClosureReady"
    }
    & powershell @redeployArgs
    if ($LASTEXITCODE -ne 0) {
      throw "Protected staging redeploy failed."
    }
  }
  "verify" {
    $verifyArgs = @(
      "-ExecutionPolicy",
      "Bypass",
      "-File",
      $verifyScript,
      "-EnvFile",
      $context.ResolvedEnvFile
    )
    if (-not [string]::IsNullOrWhiteSpace($VerifyBaseUrl)) {
      $verifyArgs += @("-BaseUrl", $VerifyBaseUrl)
    }
    if (-not [string]::IsNullOrWhiteSpace($OwnerBearerToken)) {
      $verifyArgs += @("-OwnerBearerToken", $OwnerBearerToken)
    }
    if ($PromptForOwnerToken) {
      $verifyArgs += "-PromptForOwnerToken"
    }
    if ($RequireClosureReady) {
      $verifyArgs += "-RequireClosureReady"
    }
    & powershell @verifyArgs
    if ($LASTEXITCODE -ne 0) {
      throw "Protected staging verification failed."
    }
  }
  "restart" {
    if (-not [string]::IsNullOrWhiteSpace($Service)) {
      Invoke-DockerCompose -ComposeArgs ($composeBaseArgs + @("restart", $Service))
    } else {
      Invoke-DockerCompose -ComposeArgs ($composeBaseArgs + @("restart"))
    }
    Write-Host ""
    Write-Host "Restart completed. Run verify if you want a fresh deployment report." -ForegroundColor Cyan
  }
  "down" {
    Invoke-DockerCompose -ComposeArgs ($composeBaseArgs + @("down"))
  }
}
