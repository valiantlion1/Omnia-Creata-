$ErrorActionPreference = "Stop"

$taskName = "OmniaCreataStudioLocal"

if (Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue) {
  Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
  Write-Host "Removed startup task: $taskName" -ForegroundColor Green
} else {
  Write-Host "Startup task not found: $taskName" -ForegroundColor Yellow
}
