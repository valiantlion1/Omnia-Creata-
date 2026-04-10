param()

$ErrorActionPreference = "Stop"

$startupFolder = [Environment]::GetFolderPath("Startup")
$launcherPath = Join-Path $startupFolder "OMNIA CREATA Antigravity Guard.cmd"

if (Test-Path -LiteralPath $launcherPath) {
    Remove-Item -LiteralPath $launcherPath -Force
    Write-Output "Removed startup launcher: $launcherPath"
} else {
    Write-Output "Startup launcher not found: $launcherPath"
}
