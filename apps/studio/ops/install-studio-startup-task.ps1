$ErrorActionPreference = "Stop"

$taskName = "OmniaCreataStudioLocal"
$scriptPath = Join-Path (Split-Path -Parent $PSScriptRoot) "ops\start-studio-local.ps1"
$powershellPath = (Get-Command powershell.exe).Source
$currentUser = "$env:USERDOMAIN\$env:USERNAME"

$action = New-ScheduledTaskAction `
  -Execute $powershellPath `
  -Argument "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$scriptPath`""

$trigger = New-ScheduledTaskTrigger -AtLogOn -User $currentUser
$settings = New-ScheduledTaskSettingsSet `
  -AllowStartIfOnBatteries `
  -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit (New-TimeSpan -Hours 0) `
  -RestartCount 3 `
  -RestartInterval (New-TimeSpan -Minutes 1)

Register-ScheduledTask `
  -TaskName $taskName `
  -Action $action `
  -Trigger $trigger `
  -Settings $settings `
  -Description "Starts the OmniaCreata Studio local frontend and backend at logon in stable always-on mode." `
  -Force | Out-Null

Write-Host "Installed startup task: $taskName" -ForegroundColor Green
Write-Host "It will launch the local Studio stack automatically at logon in stable always-on mode." -ForegroundColor Cyan
