param(
    [switch]$StartNow
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$guardScript = Join-Path $PSScriptRoot "guard-antigravity-repo.ps1"
$startupFolder = [Environment]::GetFolderPath("Startup")
$launcherPath = Join-Path $startupFolder "OMNIA CREATA Antigravity Guard.cmd"

if (-not (Test-Path -LiteralPath $guardScript)) {
    throw "Guard script not found: $guardScript"
}

$launcherContent = @"
@echo off
start "" powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File "$guardScript" -RepoRoot "$repoRoot"
"@

Set-Content -LiteralPath $launcherPath -Value $launcherContent

if ($StartNow) {
    Start-Process -FilePath "powershell.exe" -ArgumentList @(
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-WindowStyle", "Hidden",
        "-File", $guardScript,
        "-RepoRoot", $repoRoot
    ) | Out-Null
}

Write-Output "Installed startup launcher: $launcherPath"
if ($StartNow) {
    Write-Output "Started guard for current session."
}
