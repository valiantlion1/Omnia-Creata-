# SystemCare_Pro_Safe.ps1
# Author: Ari (GPT-5)
# Purpose: Safe, one-click maintenance and health check for Windows.
# Notes: ASCII-only; no risky operations; keeps window open at the end.

# ------------------------- Settings -------------------------
$ErrorActionPreference = 'Continue'

# Admin check
function Ensure-Admin {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Host "Please run this script as Administrator." -ForegroundColor Yellow
        Read-Host "Press Enter to exit"
        exit 1
    }
}
Ensure-Admin

# Title
try { $host.UI.RawUI.WindowTitle = "SystemCare Pro - Safe Full Checkup" } catch {}

# Logging
$startTime = Get-Date
$logDir = Join-Path ([Environment]::GetFolderPath('MyDocuments')) "SystemCarePro_Reports"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null
$logPath = Join-Path $logDir ("Report_{0:yyyy-MM-dd_HH-mm-ss}.txt" -f $startTime)

function Log($msg) {
    $stamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[{0}] {1}" -f $stamp, $msg
    $line | Tee-Object -FilePath $logPath -Append
}

function Section($title) {
    "`n=== {0} ===" -f $title | Tee-Object -FilePath $logPath -Append | Out-Host
}

Write-Host "Starting SystemCare Pro... Log: $logPath" -ForegroundColor Cyan

# ------------------------- 1) Windows Update -------------------------
try {
    Section "Windows Update (PSWindowsUpdate)"
    if (-not (Get-Module -ListAvailable -Name PSWindowsUpdate)) {
        Log "Installing PSWindowsUpdate module..."
        Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force -ErrorAction SilentlyContinue | Out-Null
        Install-Module PSWindowsUpdate -Force -AllowClobber -ErrorAction SilentlyContinue
    }
    Import-Module PSWindowsUpdate -ErrorAction SilentlyContinue
    Log "Scanning and installing updates (no reboot)..."
    Get-WindowsUpdate -MicrosoftUpdate -AcceptAll -IgnoreReboot -Install | Out-Null
    Log "Windows Update step completed."
} catch {
    Log ("Windows Update error: " + $_.Exception.Message)
}

# ------------------------- 2) App Updates (winget) -------------------------
try {
    Section "App Updates (winget)"
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($null -ne $winget) {
        Log "Running: winget upgrade --all"
        winget upgrade --all --accept-source-agreements --accept-package-agreements | Tee-Object -FilePath $logPath -Append | Out-Null
    } else {
        Log "Winget not found. Install App Installer from Microsoft Store."
    }
} catch {
    Log ("Winget error: " + $_.Exception.Message)
}

# ------------------------- 3) System Files (SFC + DISM) -------------------------
try {
    Section "System Files (SFC and DISM)"
    Log "SFC /scannow"
    sfc /scannow | Tee-Object -FilePath $logPath -Append | Out-Null
    Log "DISM /Online /Cleanup-Image /RestoreHealth"
    DISM /Online /Cleanup-Image /RestoreHealth | Tee-Object -FilePath $logPath -Append | Out-Null
} catch {
    Log ("SFC/DISM error: " + $_.Exception.Message)
}

# ------------------------- 4) Defender Full Scan -------------------------
try {
    Section "Windows Defender (Full Scan)"
    if (Get-Command Start-MpScan -ErrorAction SilentlyContinue) {
        Log "Triggering Full Scan in background..."
        Start-MpScan -ScanType FullScan
    } else {
        Log "Defender cmdlets not available (third-party AV installed?)."
    }
} catch {
    Log ("Defender error: " + $_.Exception.Message)
}

# ------------------------- 5) Disk Health and CHKDSK (online) -------------------------
try {
    Section "Disk Health (SMART) and CHKDSK (online)"
    Log "Get-PhysicalDisk summary:"
    Get-PhysicalDisk | Select FriendlyName, MediaType, Size, HealthStatus, OperationalStatus | Format-Table | Out-String | Tee-Object -FilePath $logPath -Append | Out-Null

    Log "WMIC disk status:"
    wmic diskdrive get model, status | Tee-Object -FilePath $logPath -Append | Out-Null

    $sysDrive = (Get-CimInstance Win32_OperatingSystem).SystemDrive.TrimEnd('\')
    Log ("CHKDSK " + $sysDrive + " /scan")
    chkdsk $sysDrive /scan | Tee-Object -FilePath $logPath -Append | Out-Null
} catch {
    Log ("Disk health/CHKDSK error: " + $_.Exception.Message)
}

# ------------------------- 6) Disk Optimization (SSD TRIM / HDD Defrag) -------------------------
try {
    Section "Disk Optimization (SSD TRIM / HDD Defrag)"
    $volumes = Get-Volume | Where-Object { $_.DriveType -eq 'Fixed' -and $_.FileSystem -ne $null }
    foreach ($v in $volumes) {
        $letter = $v.DriveLetter
        if (-not $letter) { continue }
        Log ("Processing drive " + $letter + ":")
        $parts = Get-Partition -DriveLetter $letter -ErrorAction SilentlyContinue
        if (-not $parts) {
            try {
                Optimize-Volume -DriveLetter $letter -Verbose | Tee-Object -FilePath $logPath -Append | Out-Null
                Log "Optimize-Volume fallback executed."
            } catch { Log ("Optimize-Volume fallback error: " + $_.Exception.Message) }
            continue
        }
        $diskNums = $parts | ForEach-Object { $_.DiskNumber } | Sort-Object -Unique
        $mediaTypes = @()
        foreach ($dn in $diskNums) {
            $d = Get-Disk -Number $dn -ErrorAction SilentlyContinue
            if ($d) { $mediaTypes += $d.MediaType }
        }
        $mediaTypes = $mediaTypes | Select-Object -Unique
        if ($mediaTypes -contains 'SSD' -and $mediaTypes.Count -eq 1) {
            Log "Detected SSD. Running TRIM (ReTrim)."
            try { Optimize-Volume -DriveLetter $letter -ReTrim -Verbose | Tee-Object -FilePath $logPath -Append | Out-Null } catch { Log ("TRIM error: " + $_.Exception.Message) }
        } elseif ($mediaTypes -contains 'HDD' -and $mediaTypes.Count -eq 1) {
            Log "Detected HDD. Running defrag."
            try { Optimize-Volume -DriveLetter $letter -Defrag -Verbose | Tee-Object -FilePath $logPath -Append | Out-Null } catch { Log ("Defrag error: " + $_.Exception.Message) }
        } else {
            Log "Mixed or unknown media. Running safe Optimize-Volume."
            try { Optimize-Volume -DriveLetter $letter -Verbose | Tee-Object -FilePath $logPath -Append | Out-Null } catch { Log ("Optimize-Volume error: " + $_.Exception.Message) }
        }
    }
} catch {
    Log ("Disk optimization error: " + $_.Exception.Message)
}

# ------------------------- 7) Storage Usage -------------------------
try {
    Section "Storage Usage"
    Get-PSDrive -PSProvider FileSystem | Select Name, @{n='Free(GB)';e={[math]::Round($_.Free/1GB,2)}}, @{n='Used(GB)';e={[math]::Round(($_.Used)/1GB,2)}}, @{n='Total(GB)';e={[math]::Round(($_.Used+$_.Free)/1GB,2)}} |
        Format-Table | Out-String | Tee-Object -FilePath $logPath -Append | Out-Null
} catch {
    Log ("Storage query error: " + $_.Exception.Message)
}

# ------------------------- 8) CPU/RAM/GPU Snapshot -------------------------
try {
    Section "CPU/RAM/GPU Snapshot"
    $cpuLoad = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
    $ram   = Get-CimInstance Win32_OperatingSystem
    $total = [math]::Round($ram.TotalVisibleMemorySize/1KB, 2)
    $free  = [math]::Round($ram.FreePhysicalMemory/1KB, 2)
    $used  = [math]::Round($total - $free, 2)
    Log ("CPU Load: {0}% | RAM: {1}GB used / {2}GB total" -f $cpuLoad, $used, $total)

    $gpus = Get-CimInstance Win32_VideoController | Select Name, AdapterRAM, DriverVersion
    $gpus | Format-Table | Out-String | Tee-Object -FilePath $logPath -Append | Out-Null
} catch {
    Log ("CPU/RAM/GPU query error: " + $_.Exception.Message)
}

# ------------------------- 9) Network Tests + DNS flush -------------------------
try {
    Section "Network Tests"
    $hosts = @('1.1.1.1','8.8.8.8','github.com','microsoft.com')
    foreach ($h in $hosts) {
        Log ("Ping: " + $h)
        $res = Test-Connection -ComputerName $h -Count 2 -ErrorAction SilentlyContinue
        if ($res) {
            $avg = ($res | Measure-Object -Property ResponseTime -Average).Average
            Log ("  Avg ms: " + [math]::Round($avg,2))
        } else {
            Log "  Ping failed."
        }
    }
    Log "Flushing DNS cache..."
    ipconfig /flushdns | Tee-Object -FilePath $logPath -Append | Out-Null
} catch {
    Log ("Network test error: " + $_.Exception.Message)
}

# ------------------------- 10) Driver Report (no changes) -------------------------
try {
    Section "Driver Report (no changes)"
    Get-WmiObject Win32_PnPSignedDriver | 
        Select DeviceName, DriverVersion, DriverProviderName, DriverDate |
        Sort-Object DeviceName |
        Format-Table | Out-String | Tee-Object -FilePath $logPath -Append | Out-Null
    Log "Note: No automatic driver updates for safety."
} catch {
    Log ("Driver report error: " + $_.Exception.Message)
}

# ------------------------- 11) Startup & Services Report -------------------------
try {
    Section "Startup Items and Services (report)"
    Log "Startup (Registry Run)"
    $runKeys = @(
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
    )
    foreach ($rk in $runKeys) {
        if (Test-Path $rk) {
            Get-ItemProperty $rk | Out-String | Tee-Object -FilePath $logPath -Append | Out-Null
        }
    }
    Log "Running Services (non-Microsoft)"
    Get-Service | Where-Object { $_.Status -eq 'Running' } | 
        Where-Object { $_.Name -notmatch '^(.*?Microsoft.*|.*Windows.*)$' } |
        Select Name, DisplayName, Status |
        Format-Table | Out-String | Tee-Object -FilePath $logPath -Append | Out-Null
} catch {
    Log ("Startup/Services report error: " + $_.Exception.Message)
}

# ------------------------- 12) Event Log Quick Scan -------------------------
try {
    Section "Event Logs (last 48h, Critical/Error)"
    $since = (Get-Date).AddHours(-48)
    $events = Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2; StartTime=$since} -ErrorAction SilentlyContinue
    if ($events) {
        $events | Select TimeCreated, Id, LevelDisplayName, ProviderName, Message | 
            Format-Table | Out-String | Tee-Object -FilePath $logPath -Append | Out-Null
    } else {
        Log "No critical/error events in last 48h."
    }
} catch {
    Log ("Event Log scan error: " + $_.Exception.Message)
}

# ------------------------- 13) Cleanup (safe) -------------------------
try {
    Section "Cleanup (safe temp)"
    Log "Cleaning temp folders..."
    $tempPaths = @($env:TEMP, $env:TMP, "$env:WINDIR\Temp")
    foreach ($tp in $tempPaths) {
        if (Test-Path $tp) {
            Get-ChildItem $tp -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    Log "Cleanup done."
} catch {
    Log ("Cleanup error: " + $_.Exception.Message)
}

# ------------------------- Summary -------------------------
$endTime = Get-Date
$duration = New-TimeSpan -Start $startTime -End $endTime

Section "Summary"
Log ("Start    : {0}" -f $startTime)
Log ("End      : {0}" -f $endTime)
Log ("Duration : {0} minutes {1} seconds" -f [int]$duration.TotalMinutes, $duration.Seconds)
Log ("Report   : $logPath")

Write-Host ""
Write-Host "SystemCare Pro finished. Report: $logPath" -ForegroundColor Cyan
Read-Host "Press Enter to exit"
