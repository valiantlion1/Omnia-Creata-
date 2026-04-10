param(
    [string]$RepoRoot = "C:\Users\valiantlion\Desktop\OMNIA CREATA",
    [int]$IntervalSeconds = 2,
    [string]$LogDirectory = "$env:LOCALAPPDATA\OmniaCreata\antigravity-guard",
    [switch]$RunOnce
)

$ErrorActionPreference = "Stop"

function Write-GuardLog {
    param([string]$Message)

    if (-not (Test-Path -LiteralPath $LogDirectory)) {
        New-Item -ItemType Directory -Path $LogDirectory -Force | Out-Null
    }

    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Add-Content -LiteralPath (Join-Path $LogDirectory "guard.log") -Value "[$timestamp] $Message"
}

function Get-CleanConfigLines {
    param([string[]]$Lines)

    $blocks = [System.Collections.Generic.List[object]]::new()
    $currentHeader = $null
    $currentBody = [System.Collections.Generic.List[string]]::new()
    $removed = $false

    foreach ($line in $Lines) {
        if ($line -match '^\[(.+?)\]\s*$') {
            if ($null -ne $currentHeader) {
                $blocks.Add([pscustomobject]@{
                    Header = $currentHeader
                    Body = @($currentBody)
                })
            }

            $currentHeader = $line
            $currentBody = [System.Collections.Generic.List[string]]::new()
            continue
        }

        if ($currentHeader -eq "[extensions]" -and $line -match '^\s*worktreeConfig\s*=\s*true\s*$') {
            $removed = $true
            continue
        }

        $currentBody.Add($line)
    }

    if ($null -ne $currentHeader) {
        $blocks.Add([pscustomobject]@{
            Header = $currentHeader
            Body = @($currentBody)
        })
    }

    $result = [System.Collections.Generic.List[string]]::new()
    foreach ($block in $blocks) {
        $bodyLines = [string[]]$block.Body
        $bodyHasContent = $bodyLines | Where-Object { $_.Trim() -ne "" }

        if ($block.Header -eq "[extensions]" -and -not $bodyHasContent) {
            continue
        }

        $result.Add($block.Header)
        foreach ($bodyLine in $bodyLines) {
            $result.Add($bodyLine)
        }
    }

    return [pscustomobject]@{
        Changed = $removed
        Lines = @($result)
    }
}

function Repair-GitConfig {
    $configPath = Join-Path $RepoRoot ".git\config"

    if (-not (Test-Path -LiteralPath $configPath)) {
        Write-GuardLog "Repo config not found: $configPath"
        return
    }

    $content = Get-Content -LiteralPath $configPath
    $cleaned = Get-CleanConfigLines -Lines $content

    if (-not $cleaned.Changed) {
        return
    }

    Set-Content -LiteralPath $configPath -Value $cleaned.Lines
    Write-GuardLog "Removed [extensions].worktreeConfig from $configPath"
}

$mutex = New-Object System.Threading.Mutex($false, "Local\OmniaCreataAntigravityGuard")
$ownsMutex = $false

try {
    try {
        $ownsMutex = $mutex.WaitOne(0)
    } catch {
        $ownsMutex = $false
    }

    if (-not $ownsMutex) {
        Write-GuardLog "Another guard instance is already running."
        exit 0
    }

    Write-GuardLog "Guard started for $RepoRoot"

    while ($true) {
        try {
            $antigravityIsRunning = $null -ne (Get-Process -Name "Antigravity" -ErrorAction SilentlyContinue | Select-Object -First 1)
            if ($antigravityIsRunning) {
                Repair-GitConfig
            }
        } catch {
            Write-GuardLog "Guard cycle failed: $($_.Exception.Message)"
        }

        if ($RunOnce) {
            break
        }

        Start-Sleep -Seconds $IntervalSeconds
    }
} finally {
    if ($ownsMutex) {
        $mutex.ReleaseMutex() | Out-Null
    }
    $mutex.Dispose()
}
