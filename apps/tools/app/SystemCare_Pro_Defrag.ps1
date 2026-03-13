<# 
    SystemCare_Pro_Defrag.ps1
    Author: Ari (GPT-5)
    Purpose: Safe, one-click full maintenance & health check for Windows PC with Disk Optimization (Defrag / TRIM).
    Notes:
      - This script is a safe update of SystemCare_Pro: it AUTOMATICALLY chooses HDD defragmentation or SSD optimization (TRIM).
      - It won't perform risky operations (no BIOS/firmware updates, no forced driver installs, no registry edits).
      - Run as Administrator.
#>

# ------------------------- SAFETY & PREP -------------------------
$ErrorActionPreference = 'Stop'
$host.UI.RawUI.WindowTitle = "SystemCare Pro — Safe Full Checkup + Disk Optimization"
$StartTime = Get-Date
$LogDir   = Join-Path ([Environment]::GetFolderPath('MyDocuments')) "SystemCarePro_Reports"
New-Item -ItemType Directory -Force -Path $LogDir | Out-Null
$LogPath  = Join-Path $LogDir ("Report_{0:yyyy-MM-dd_HH-mm-ss}.txt" -f $StartTime)

Function Write-Log($msg) {
    $stamp = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
    $line = "[{0}] {1}" -f $stamp, $msg
    $line | Tee-Object -FilePath $LogPath -Append
}

Function Section($title) {
    "`n=== {0} ===" -f $title | Tee-Object -FilePath $LogPath -Append | Out-Host
}

Function Ensure-Admin {
    $isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
    if (-not $isAdmin) {
        Write-Host "⚠️ Lütfen dosyayı 'Run as Administrator' ile çalıştır." -ForegroundColor Yellow
        throw "Not running as Administrator."
    }
}
Ensure-Admin

Write-Host "🔧 SystemCare Pro (Defrag-enabled) başlıyor... (log: $LogPath)" -ForegroundColor Cyan

# ------------------------- 1) WINDOWS UPDATE -------------------------
try {
    Section "Windows Update (PSWindowsUpdate)"
    if (-not (Get-Module -ListAvailable -Name PSWindowsUpdate)) {
        Write-Log "PSWindowsUpdate modülü yükleniyor..."
        Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force -ErrorAction SilentlyContinue | Out-Null
        Install-Module PSWindowsUpdate -Force -AllowClobber -ErrorAction SilentlyContinue
    }
    Import-Module PSWindowsUpdate -ErrorAction SilentlyContinue
    Write-Log "Güncellemeler taranıyor..."
    Get-WindowsUpdate -MicrosoftUpdate -AcceptAll -IgnoreReboot -Install | Out-Null
    Write-Log "Windows Update tamamlandı (yeniden başlatma gerekebilir)."
} catch {
    Write-Log "Windows Update hatası: $($_.Exception.Message)"
}

# ------------------------- 2) APPS: WINGET -------------------------
try {
    Section "Uygulama Güncellemeleri (winget)"
    $winget = Get-Command winget -ErrorAction SilentlyContinue
    if ($null -ne $winget) {
        Write-Log "Winget upgrade --all çalıştırılıyor..."
        winget upgrade --all --accept-source-agreements --accept-package-agreements | Tee-Object -FilePath $LogPath -Append | Out-Null
    } else {
        Write-Log "Winget bulunamadı. Microsoft Store'dan App Installer yüklenmeli."
    }
} catch {
    Write-Log "Winget hatası: $($_.Exception.Message)"
}

# ------------------------- 3) SYSTEM FILES: SFC + DISM -------------------------
try {
    Section "Sistem Dosyaları (SFC & DISM)"
    Write-Log "SFC /scannow başlatılıyor..."
    sfc /scannow | Tee-Object -FilePath $LogPath -Append | Out-Null
    Write-Log "DISM onarım başlatılıyor..."
    DISM /Online /Cleanup-Image /RestoreHealth | Tee-Object -FilePath $LogPath -Append | Out-Null
} catch {
    Write-Log "SFC/DISM hatası: $($_.Exception.Message)"
}

# ------------------------- 4) DEFENDER FULL SCAN -------------------------
try {
    Section "Windows Defender (Tam Tarama)"
    if (Get-Command Start-MpScan -ErrorAction SilentlyContinue) {
        Write-Log "Tam tarama başlatılıyor (arka planda sürebilir)..."
        Start-MpScan -ScanType FullScan
        Write-Log "Defender tam tarama tetiklendi."
    } else {
        Write-Log "Defender cmdlet'leri bulunamadı (başka AV mi yüklü?)."
    }
} catch {
    Write-Log "Defender tarama hatası: $($_.Exception.Message)"
}

# ------------------------- 5) DISK HEALTH & CHKDSK (ONLINE) -------------------------
try {
    Section "Disk Sağlığı (SMART) ve CHKDSK (online)"
    Write-Log "Get-PhysicalDisk özet:"
    Get-PhysicalDisk | Select FriendlyName, MediaType, Size, HealthStatus, OperationalStatus | Format-Table | Out-String | Tee-Object -FilePath $LogPath -Append | Out-Null

    Write-Log "WMIC durumları:"
    wmic diskdrive get model, status | Tee-Object -FilePath $LogPath -Append | Out-Null

    $sysDrive = (Get-WmiObject Win32_OperatingSystem).SystemDrive.TrimEnd('\')
    Write-Log "CHKDSK $sysDrive üzerinde çevrimiçi tarama (yalnızca kontrol, onarım yok)."
    chkdsk $sysDrive /scan | Tee-Object -FilePath $LogPath -Append | Out-Null
} catch {
    Write-Log "Disk sağlık/CHKDSK hatası: $($_.Exception.Message)"
}

# ------------------------- 6) DISK OPTIMIZATION (DEFRAg / TRIM safe) -------------------------
try {
    Section "Disk Optimizasyonu (HDD defrag / SSD TRIM)"
    # List logical drives
    $volumes = Get-Volume | Where-Object { $_.DriveType -eq 'Fixed' -and $_.FileSystem -ne $null }
    foreach ($v in $volumes) {
        $letter = $v.DriveLetter
        if (-not $letter) { continue }
        Write-Log "İşlem: Sürücü $letter`:"
        # Map partition -> disk
        $parts = Get-Partition -DriveLetter $letter -ErrorAction SilentlyContinue
        if (-not $parts) {
            Write-Log "  Partition bulunamadı, Optimize-Volume ile denenecek."
            # Fallback: use Optimize-Volume auto choice
            try {
                Optimize-Volume -DriveLetter $letter -Verbose | Tee-Object -FilePath $LogPath -Append | Out-Null
                Write-Log "  Optimize-Volume çalıştırıldı (fallback)."
            } catch {
                Write-Log "  Optimize-Volume fallback hatası: $($_.Exception.Message)"
            }
            continue
        }
        $diskNums = $parts | ForEach-Object { $_.DiskNumber } | Sort-Object -Unique
        $mediaTypes = @()
        foreach ($dn in $diskNums) {
            $d = Get-Disk -Number $dn -ErrorAction SilentlyContinue
            if ($d) { $mediaTypes += $d.MediaType }
        }
        $mediaTypes = $mediaTypes | Select-Object -Unique
        # Decide action
        if ($mediaTypes -contains 'SSD' -and $mediaTypes.Count -eq 1) {
            Write-Log "  Fiziksel: SSD tespit edildi. TRIM (Optimize-Volume -ReTrim) uygulanıyor."
            try {
                Optimize-Volume -DriveLetter $letter -ReTrim -Verbose | Tee-Object -FilePath $LogPath -Append | Out-Null
                Write-Log "  TRIM tamamlandı."
            } catch {
                Write-Log "  TRIM hatası: $($_.Exception.Message)"
            }
        } elseif ($mediaTypes -contains 'HDD' -and $mediaTypes.Count -eq 1) {
            Write-Log "  Fiziksel: HDD tespit edildi. Defragmentasyon uygulanıyor."
            try {
                Optimize-Volume -DriveLetter $letter -Defrag -Verbose | Tee-Object -FilePath $LogPath -Append | Out-Null
                Write-Log "  Defragmentasyon tamamlandı."
            } catch {
                Write-Log "  Defrag hatası: $($_.Exception.Message)"
            }
        } else {
            Write-Log "  Karışık veya tespit edilemeyen fiziksel medya. Güvenli fallback: Optimize-Volume çalıştırılıyor."
            try {
                Optimize-Volume -DriveLetter $letter -Verbose | Tee-Object -FilePath $LogPath -Append | Out-Null
                Write-Log "  Optimize-Volume (fallback) tamamlandı."
            } catch {
                Write-Log "  Optimize-Volume fallback hatası: $($_.Exception.Message)"
            }
        }
    }
} catch {
    Write-Log "Disk optimizasyon hatası: $($_.Exception.Message)"
}

# ------------------------- 7) STORAGE USAGE -------------------------
try {
    Section "Depolama Kullanımı"
    Get-PSDrive -PSProvider FileSystem | Select Name, @{n='Free(GB)';e={[math]::Round($_.Free/1GB,2)}}, @{n='Used(GB)';e={[math]::Round(($_.Used)/1GB,2)}}, @{n='Total(GB)';e={[math]::Round(($_.Used+$_.Free)/1GB,2)}} |
        Format-Table | Out-String | Tee-Object -FilePath $LogPath -Append | Out-Null
} catch {
    Write-Log "Depolama sorgu hatası: $($_.Exception.Message)"
}

# ------------------------- 8) CPU/RAM/GPU SNAPSHOT -------------------------
try {
    Section "CPU/RAM/GPU Anlık Durum"
    $cpuLoad = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
    $ram   = Get-CimInstance Win32_OperatingSystem
    $total = [math]::Round($ram.TotalVisibleMemorySize/1KB, 2)
    $free  = [math]::Round($ram.FreePhysicalMemory/1KB, 2)
    $used  = [math]::Round($total - $free, 2)
    Write-Log ("CPU Yükü: {0}% | RAM: {1}GB / {2}GB (Kullanım: {3}GB)" -f $cpuLoad, $used, $total, $used)

    $gpus = Get-CimInstance Win32_VideoController | Select Name, AdapterRAM, DriverVersion
    $gpus | Format-Table | Out-String | Tee-Object -FilePath $LogPath -Append | Out-Null
} catch {
    Write-Log "CPU/RAM/GPU sorgu hatası: $($_.Exception.Message)"
}

# ------------------------- 9) NETWORK TESTS (PING) + DNS FLUSH -------------------------
try {
    Section "Ağ Testleri"
    $hosts = @('1.1.1.1','8.8.8.8','github.com','microsoft.com')
    foreach ($h in $hosts) {
        Write-Log "Ping: $h"
        $res = Test-Connection -ComputerName $h -Count 2 -ErrorAction SilentlyContinue
        if ($res) {
            Write-Log ("  Ortalama ms: " + ($res | Measure-Object -Property ResponseTime -Average).Average)
        } else {
            Write-Log "  Ping başarısız."
        }
    }
    Write-Log "DNS önbelleği temizleniyor (güvenli)."
    ipconfig /flushdns | Tee-Object -FilePath $LogPath -Append | Out-Null
} catch {
    Write-Log "Ağ testi hatası: $($_.Exception.Message)"
}

# ------------------------- 10) DRIVERS (REPORT ONLY) -------------------------
try {
    Section "Sürücü Raporu (Değişiklik YOK)"
    Get-WmiObject Win32_PnPSignedDriver | 
        Select DeviceName, DriverVersion, DriverProviderName, DriverDate |
        Sort-Object DeviceName |
        Format-Table | Out-String | Tee-Object -FilePath $LogPath -Append | Out-Null
    Write-Log "Not: Güvenlik için otomatik sürücü güncellemesi yapılmadı. İstenirse ayrı araçla yapılabilir."
} catch {
    Write-Log "Sürücü rapor hatası: $($_.Exception.Message)"
}

# ------------------------- 11) STARTUP & SERVICES (REPORT ONLY) -------------------------
try {
    Section "Başlangıç Programları ve Servisler (Rapor)"
    Write-Log "Startup (Registry Run)"
    $runKeys = @(
        "HKLM:\Software\Microsoft\Windows\CurrentVersion\Run",
        "HKCU:\Software\Microsoft\Windows\CurrentVersion\Run"
    )
    foreach ($rk in $runKeys) {
        if (Test-Path $rk) {
            Get-ItemProperty $rk | Out-String | Tee-Object -FilePath $LogPath -Append | Out-Null
        }
    }
    Write-Log "Services (Running, non-Microsoft)"
    Get-Service | Where-Object { $_.Status -eq 'Running' } | 
        Where-Object { $_.Name -notmatch '^(.*?Microsoft.*|.*Windows.*)$' } |
        Select Name, DisplayName, Status |
        Format-Table | Out-String | Tee-Object -FilePath $LogPath -Append | Out-Null
} catch {
    Write-Log "Startup/Servis rapor hatası: $($_.Exception.Message)"
}

# ------------------------- 12) EVENT LOG QUICK SCAN -------------------------
try {
    Section "Olay Günlükleri (Son 48 Saat Hata/Çok Önemli)"
    $since = (Get-Date).AddHours(-48)
    $events = Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2; StartTime=$since} -ErrorAction SilentlyContinue
    if ($events) {
        $events | Select TimeCreated, Id, LevelDisplayName, ProviderName, Message | 
            Format-Table | Out-String | Tee-Object -FilePath $LogPath -Append | Out-Null
    } else {
        Write-Log "Kritik/ERROR kayıt yok."
    }
} catch {
    Write-Log "Event Log tarama hatası: $($_.Exception.Message)"
}

# ------------------------- 13) CLEANUP (SAFE) -------------------------
try {
    Section "Temizlik (Güvenli)"
    Write-Log "Temp klasörleri temizleniyor..."
    $tempPaths = @($env:TEMP, $env:TMP, "$env:WINDIR\Temp")
    foreach ($tp in $tempPaths) {
        if (Test-Path $tp) {
            Get-ChildItem $tp -Force -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Log "Temizlik tamam."
} catch {
    Write-Log "Temizlik hatası: $($_.Exception.Message)"
}

# ------------------------- SUMMARY -------------------------
$EndTime = Get-Date
$Duration = New-TimeSpan -Start $StartTime -End $EndTime

Section "Özet"
Write-Log ("Başlangıç : {0}" -f $StartTime)
Write-Log ("Bitiş      : {0}" -f $EndTime)
Write-Log ("Süre       : {0} dakika {1} saniye" -f [int]$Duration.TotalMinutes, $Duration.Seconds)
Write-Log "Detaylı rapor: $LogPath"

Write-Host "`n✅ SystemCare Pro (Defrag-enabled) tamamlandı. Rapor: $LogPath" -ForegroundColor Cyan
# Notepad ile açmak istersen: notepad $LogPath
Pause
