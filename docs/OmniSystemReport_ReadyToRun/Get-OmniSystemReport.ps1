# Get-OmniSystemReport.ps1  (ASCII-safe, UTF-8)
# Author: Ari
# Goal: Deepest possible inventory + health + config + perf snapshot + rich artifacts.
# Usage (Admin PS):
#   powershell -ExecutionPolicy Bypass -File ".\Get-OmniSystemReport.ps1" [-IncludeSensitive] [-SampleSeconds 15] [-ZipOutput]

param(
  [switch]$IncludeSensitive = $false,
  [int]$SampleSeconds = 10,
  [switch]$ZipOutput = $false,
  [string]$OutputRoot = "$env:USERPROFILE\Desktop"
)

function SafeRun($b){ try{ & $b }catch{ return $null } }
$ts = (Get-Date).ToString("yyyyMMdd_HHmmss")
$Out = Join-Path $OutputRoot "OmniSystemReport_$ts"
$Raw = Join-Path $Out "raw"
$Logs= Join-Path $Out "logs"
New-Item -Force -ItemType Directory -Path $Out,$Raw,$Logs | Out-Null

# Paths
$jsonPath = Join-Path $Out "OmniSystemReport_$ts.json"
$htmlPath = Join-Path $Out "OmniSystemReport_$ts.html"
$txtPath  = Join-Path $Out "OmniSystemReport_$ts.txt"

# Core objects
$compInfo = SafeRun { Get-ComputerInfo -ErrorAction SilentlyContinue }
$osWmi    = SafeRun { Get-CimInstance Win32_OperatingSystem }
$cs       = SafeRun { Get-CimInstance Win32_ComputerSystem }
$cpu      = SafeRun { Get-CimInstance Win32_Processor }
$board    = SafeRun { Get-CimInstance Win32_BaseBoard }
$bios     = SafeRun { Get-CimInstance Win32_BIOS }
$hotfixes = SafeRun { Get-HotFix }

# RAM
$memMods  = SafeRun { Get-CimInstance Win32_PhysicalMemory }
$memArr   = SafeRun { Get-CimInstance Win32_PhysicalMemoryArray }

# Storage + SMART + reliability
$physDisks= SafeRun { Get-PhysicalDisk }
$disks    = SafeRun { Get-Disk }
$parts    = SafeRun { Get-Partition }
$vols     = SafeRun { Get-Volume }
$storPools= SafeRun { Get-StoragePool -ErrorAction SilentlyContinue }
$relCtrs  = @(); try{ $relCtrs = Get-PhysicalDisk | ForEach-Object { try{ Get-StorageReliabilityCounter -PhysicalDisk $_ }catch{ $null } } | Where-Object { $_ } }catch{}
$smartStatus  = SafeRun { Get-WmiObject -Namespace root\wmi -Class MSStorageDriver_FailurePredictStatus -ErrorAction SilentlyContinue }
$smartData    = SafeRun { Get-WmiObject -Namespace root\wmi -Class MSStorageDriver_FailurePredictData -ErrorAction SilentlyContinue }
$smartThresh  = SafeRun { Get-WmiObject -Namespace root\wmi -Class MSStorageDriver_FailurePredictThresholds -ErrorAction SilentlyContinue }

# GPU / Display
$gpus     = SafeRun { Get-CimInstance Win32_VideoController }
$dispPnP  = SafeRun { Get-PnpDevice -Class Display -ErrorAction SilentlyContinue }
# EDID: monitor make/model via WMI
$monID    = SafeRun { Get-CimInstance -Namespace root\wmi -Class WmiMonitorID -ErrorAction SilentlyContinue }
$monBasic = SafeRun { Get-CimInstance -Namespace root\wmi -Class WmiMonitorBasicDisplayParams -ErrorAction SilentlyContinue }

# NVIDIA extra
$nvSmi = (Get-Command nvidia-smi.exe -ErrorAction SilentlyContinue).Source
$nvQ   = $null
if($nvSmi){
  $nvQ = SafeRun { & $nvSmi -q 2>&1 | Out-String }
  if($nvQ){ $nvQ | Out-File -Encoding UTF8 (Join-Path $Raw "nvidia-smi-q.txt") }
  $nvReBar = $null
  try{
    $nvReBar = (& $nvSmi -q 2>&1 | Select-String -SimpleMatch "Resizable BAR").ToString()
  }catch{}
}

# Thunderbolt / USB4 detection (multi-axis)
$tb1 = SafeRun { Get-PnpDevice -Class System,USB -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match 'Thunderbolt|USB4' -or $_.InstanceId -match 'TBT' } }
$tb2 = SafeRun { Get-PnpDevice -ErrorAction SilentlyContinue | Where-Object { $_.FriendlyName -match 'Thunderbolt|USB4' } }
$tbSvc = SafeRun { Get-Service | Where-Object { $_.Name -match 'Thunderbolt' } }
$tbReg = SafeRun { Get-ChildItem HKLM:\SYSTEM\CurrentControlSet\Services -ErrorAction SilentlyContinue | Where-Object { $_.PSChildName -match 'nhi|thunderbolt|tbt' } }

# Audio / USB
$audio   = SafeRun { Get-PnpDevice -Class MEDIA -ErrorAction SilentlyContinue }
$usb     = SafeRun { Get-PnpDevice -Class USB -ErrorAction SilentlyContinue }

# Network
$netAdapters = SafeRun { Get-NetAdapter }
$ipcfg       = SafeRun { Get-NetIPConfiguration }
$routes      = SafeRun { Get-NetRoute }
$dnsClient   = SafeRun { Get-DnsClientServerAddress }
$ipAll       = SafeRun { ipconfig /all | Out-String }
$wlanDrv     = SafeRun { netsh wlan show drivers | Out-String }
$wlanIf      = SafeRun { netsh wlan show interfaces | Out-String }
$arpTxt      = SafeRun { arp -a | Out-String }
$routeTxt    = SafeRun { route print | Out-String }
@{ "ipconfig_all.txt"=$ipAll; "wlan_show_drivers.txt"=$wlanDrv; "wlan_show_interfaces.txt"=$wlanIf; "arp_a.txt"=$arpTxt; "route_print.txt"=$routeTxt }.
GetEnumerator()|%{ if($_.Value){ $_.Value | Out-File -Encoding UTF8 (Join-Path $Raw $_.Key) } }

# Windows Features / OptionalFeatures / DISM
$optFeatures = SafeRun { Get-WindowsOptionalFeature -Online -ErrorAction SilentlyContinue }
$dismFeaturesTxt = Join-Path $Raw "dism_features.txt"; try{ dism /online /Get-Features /Format:Table | Out-File -Encoding UTF8 $dismFeaturesTxt }catch{}

# Defender / Firewall
$mpStatus = SafeRun { Get-MpComputerStatus }
$mpPrefs  = SafeRun { Get-MpPreference }
$fwAllTxt = SafeRun { netsh advfirewall show allprofiles | Out-String }
if($fwAllTxt){ $fwAllTxt | Out-File -Encoding UTF8 (Join-Path $Raw "firewall_profiles.txt") }
try{ netsh advfirewall export (Join-Path $Raw "firewall_policy.wfw") | Out-Null }catch{}

# Power: plans, energy, battery
$powerAvail = SafeRun { powercfg /a | Out-String }
$plansTxt   = SafeRun { powercfg /l | Out-String }
$qAllTxt    = SafeRun { powercfg /q | Out-String }    # very large
if($plansTxt){ $plansTxt | Out-File -Encoding UTF8 (Join-Path $Raw "power_plans.txt") }
if($qAllTxt){  $qAllTxt  | Out-File -Encoding UTF8 (Join-Path $Raw "power_cfg_full.txt") }
$energyHtml  = Join-Path $Out "energy-report.html"; try{ powercfg /energy /output "$energyHtml" /duration 10 | Out-Null }catch{}
$battHtml    = Join-Path $Out "battery-report.html"; try{ powercfg /batteryreport /output "$battHtml" | Out-Null }catch{}
$batWmi      = SafeRun { Get-CimInstance Win32_Battery -ErrorAction SilentlyContinue }

# Virtualization / Hyper-V / WSL
$hvLaunch = SafeRun { bcdedit /enum | Out-String }
$hvFeatures = SafeRun { Get-WindowsOptionalFeature -Online -FeatureName *Hyper* -ErrorAction SilentlyContinue }
$wslFeat    = SafeRun { Get-WindowsOptionalFeature -Online -FeatureName *Subsystem* -ErrorAction SilentlyContinue }

# Security posture: Secure Boot / TPM
$secureBoot = $null; try{ $secureBoot = Confirm-SecureBootUEFI }catch{ $secureBoot = "Not UEFI or not available" }
$tpm        = SafeRun { Get-Tpm }

# HAGS (Hardware-Accelerated GPU Scheduling) + Game Mode
$hags = $null
try{
  $reg = "HKLM:\SYSTEM\CurrentControlSet\Control\GraphicsDrivers"
  $v = (Get-ItemProperty -Path $reg -Name HwSchMode -ErrorAction SilentlyContinue).HwSchMode
  $hags = if($v -eq 2){ "Enabled" } elseif($v -eq 1){ "Disabled" } else { "Default/NotSet" }
}catch{}
$gameMode = $null
try{
  $gReg = "HKCU:\Software\Microsoft\GameBar"
  $gm = (Get-ItemProperty -Path $gReg -Name AutoGameModeEnabled -ErrorAction SilentlyContinue).AutoGameModeEnabled
  $gameMode = if($gm -eq 1){"Enabled"}elseif($gm -eq 0){"Disabled"}else{"Unknown"}
}catch{}

# DirectX / DxDiag (and DirectStorage signal via heuristic)
$dxTxt = Join-Path $Out "dxdiag.txt"; try{ dxdiag /t "$dxTxt" | Out-Null }catch{}
$dsHeuristic = [PSCustomObject]@{
  NVMePresent = ($physDisks | Where-Object { $_.MediaType -match 'SSD' -and $_.BusType -match 'NVMe' }).Count -gt 0
  DX12Capable = ($gpus | Where-Object { $_.DriverVersion }).Count -gt 0
}

# Drivers & Programs & Tasks & Startup
$driversCsv = Join-Path $Raw "drivers_full.csv"; try{ cmd /c "driverquery /v /fo csv > `"$driversCsv`"" | Out-Null }catch{}
function Get-InstalledPrograms {
  $roots=@("HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*","HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*","HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*")
  $L=@(); foreach($r in $roots){ try{
    Get-ItemProperty $r -ErrorAction SilentlyContinue | %{
      if($_.DisplayName){ $L += [PSCustomObject]@{ Name=$_.DisplayName; Version=$_.DisplayVersion; Publisher=$_.Publisher; InstallDate=$_.InstallDate; UninstallString=$_.UninstallString } }
    }}catch{} }
  $L | Sort-Object Name -Unique
}
$programs = SafeRun { Get-InstalledPrograms }
$services = SafeRun { Get-Service | Select Name,DisplayName,Status,StartType }
function Get-StartupEntries{
  $paths=@("HKCU:\Software\Microsoft\Windows\CurrentVersion\Run","HKLM:\Software\Microsoft\Windows\CurrentVersion\Run","HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce","HKLM:\Software\Microsoft\Windows\CurrentVersion\RunOnce")
  $it=@(); foreach($p in $paths){ try{
    Get-ItemProperty $p -ErrorAction SilentlyContinue | %{
      $_.PSObject.Properties | ?{ $_.Name -notin @("PSPath","PSParentPath","PSChildName","PSDrive","PSProvider") } | %{
        $it += [PSCustomObject]@{ Root=$p; Name=$_.Name; Command=$_.Value }
      }
    }}catch{} }
  $sfU="$env:APPDATA\Microsoft\Windows\Start Menu\Programs\Startup"; $sfA="$env:ProgramData\Microsoft\Windows\Start Menu\Programs\Startup"
  foreach($sf in @($sfU,$sfA)){ if(Test-Path $sf){ Get-ChildItem $sf | %{
    $it += [PSCustomObject]@{ Root=$sf; Name=$_.Name; Command=$_.FullName }
  }}}
  $it
}
$startup = SafeRun { Get-StartupEntries }
$tasks = SafeRun { Get-ScheduledTask | ?{ $_.Settings.Enabled } | Select TaskName,TaskPath,State,LastRunTime,NextRunTime,Author }

# Fonts, Environment, Pagefile
$fonts = SafeRun { Get-ChildItem "$env:WINDIR\Fonts" -ErrorAction SilentlyContinue | Select-Object Name,Length,LastWriteTime }
$pagefile = SafeRun { Get-CimInstance Win32_PageFileSetting }
$envVars = Get-ChildItem Env: | Sort-Object Name

# PCI / PnP inventory
$pnpWide = SafeRun { Get-PnpDevice -PresentOnly -ErrorAction SilentlyContinue | Select-Object Class,FriendlyName,InstanceId,Manufacturer,Status }

# Events (errors)
function Get-Err($log,$n=200){ try{
  Get-WinEvent -LogName $log -ErrorAction Stop | ?{ $_.LevelDisplayName -in @("Error","Critical") } |
   Select-Object -First $n TimeCreated,Id,LevelDisplayName,ProviderName,Message
}catch{ @() } }
$appErr = Get-Err "Application" 200
$sysErr = Get-Err "System" 200

# Temps
$acpiTemps = $null; try{ $acpiTemps = Get-WmiObject MSAcpi_ThermalZoneTemperature -Namespace "root/wmi" -ErrorAction SilentlyContinue | Select InstanceName,CurrentTemperature }catch{}
$gpuTempsCsv = $null
if($nvSmi){
  try{
    $gpuTempsCsv = (& $nvSmi --query-gpu=timestamp,name,temperature.gpu,power.draw,clocks.gr,clocks.sm,clocks.mem --format=csv,noheader | Out-String)
    if($gpuTempsCsv){ $gpuTempsCsv | Out-File -Encoding UTF8 (Join-Path $Out "nvidia-temps.csv") }
  }catch{}
}

# Perf snapshot
function PerfSnap([int]$Sec=10){
  $S=@(); $sw=[Diagnostics.Stopwatch]::StartNew()
  while($sw.Elapsed.TotalSeconds -lt $Sec){
    $cpuPct=(Get-Counter '\Processor(_Total)\% Processor Time').CounterSamples.CookedValue
    $mem=Get-CimInstance Win32_OperatingSystem
    $freeMB=[math]::Round($mem.FreePhysicalMemory/1024,1); $totMB=[math]::Round($mem.TotalVisibleMemorySize/1024,1)
    $memPct= if($totMB -gt 0){ [math]::Round((($totMB-$freeMB)/$totMB)*100,1) }else{0}
    $dq=(Get-Counter '\PhysicalDisk(_Total)\Current Disk Queue Length').CounterSamples.CookedValue
    $rx=(Get-Counter '\Network Interface(*)\Bytes Received/sec').CounterSamples | Measure-Object CookedValue -Sum | % Sum
    $tx=(Get-Counter '\Network Interface(*)\Bytes Sent/sec').CounterSamples | Measure-Object CookedValue -Sum | % Sum
    $S += [pscustomobject]@{ Time=(Get-Date).ToString("HH:mm:ss"); CpuPct=[math]::Round($cpuPct,1); MemUsedPct=$memPct; DiskQueue=[math]::Round($dq,2); NetRecvKBs=[math]::Round($rx/1024,1); NetSentKBs=[math]::Round($tx/1024,1) }
    Start-Sleep -Milliseconds 900
  }
  $S
}
$perf = SafeRun { PerfSnap -Sec $SampleSeconds }
if($perf){ $perf | Export-Csv -NoTypeInformation -Encoding UTF8 (Join-Path $Out "perf_sample.csv") }

# Privacy scrub
if(-not $IncludeSensitive){
  try{ $bios      | % { $_.PSObject.Properties.Remove('SerialNumber') | Out-Null } }catch{}
  try{ $physDisks | % { $_.PSObject.Properties.Remove('SerialNumber') | Out-Null } }catch{}
  try{ $gpus      | % { $_.PSObject.Properties.Remove('PNPDeviceID')   | Out-Null } }catch{}
}

# Build report
$report = [ordered]@{
  GeneratedAt = (Get-Date).ToString("s")
  ComputerName= $env:COMPUTERNAME
  OS = @{
    ProductName   = $compInfo.WindowsProductName
    Version       = $compInfo.WindowsVersion
    Build         = $compInfo.WindowsBuildLabEx
    Edition       = $compInfo.OsEdition
    Architecture  = $compInfo.OsArchitecture
    InstallDate   = $compInfo.WindowsInstallDate
    LastBoot      = $osWmi.LastBootUpTime
    WinDir        = $osWmi.WindowsDirectory
    HotFixCount   = if($hotfixes){$hotfixes.Count}else{0}
  }
  ComputerSystem = @{
    Manufacturer  = $cs.Manufacturer
    Model         = $cs.Model
    TotalPhysicalMemory = $cs.TotalPhysicalMemory
    Domain        = $cs.Domain
  }
  BaseBoard  = $board | Select Manufacturer,Product,Version,SerialNumber
  BIOS       = $bios  | Select Manufacturer,SMBIOSBIOSVersion,Version,ReleaseDate,SerialNumber
  CPU        = $cpu   | Select Name,Manufacturer,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed,AddressWidth
  Memory = @{
    Modules    = $memMods | Select BankLabel,Capacity,Speed,Manufacturer,PartNumber,DeviceLocator,ConfiguredClockSpeed
    Array      = $memArr  | Select MemoryDevices,MaxCapacity
    TotalGB    = if($cs.TotalPhysicalMemory){ [math]::Round($cs.TotalPhysicalMemory/1GB,2) } else { $null }
  }
  GPU        = $gpus | Select Name,AdapterRAM,DriverVersion,VideoProcessor
  Nvidia     = @{
    Query      = if($nvQ){ "raw/nvidia-smi-q.txt" } else { $null }
    ResizableBAR = $nvReBar
  }
  Display = @{
    PnP     = $dispPnP | Select FriendlyName,InstanceId,Status
    Monitors= @{
      IDs   = $monID | Select InstanceName,ManufacturerName,ProductCodeID,SerialNumberID,UserFriendlyName
      Basic = $monBasic | Select InstanceName,MaxHorizontalImageSize,MaxVerticalImageSize,SupportedDisplayModes
    }
  }
  Thunderbolt = @{
    PnpUSBSystem = $tb1
    PnpAny       = $tb2
    Services     = $tbSvc
    ServicesReg  = $tbReg | Select PSChildName
  }
  Audio     = $audio | Select FriendlyName,Status
  USB       = $usb   | Select FriendlyName,Status
  Storage   = @{
    PhysicalDisks   = $physDisks | Select FriendlyName,MediaType,Size,BusType,HealthStatus,OperationalStatus,SerialNumber
    Disks           = $disks | Select Number,FriendlyName,PartitionStyle,OperationalStatus,HealthStatus,NumberOfPartitions,IsBoot,IsSystem,BusType
    Partitions      = $parts | Select DiskNumber,PartitionNumber,DriveLetter,Size,Type,GptType
    Volumes         = $vols  | Select DriveLetter,FileSystemLabel,FileSystem,HealthStatus,Size,SizeRemaining
    StoragePools    = $storPools | Select FriendlyName,HealthStatus,OperationalStatus,Size
    ReliabilityCounters = $relCtrs
    Smart = @{
      Status      = $smartStatus
      Data        = $smartData
      Thresholds  = $smartThresh
    }
  }
  Network   = @{
    Adapters   = $netAdapters | Select Name,InterfaceDescription,Status,LinkSpeed,MacAddress
    IPConfig   = $ipcfg | Select InterfaceAlias,IPv4Address,IPv6Address,DnsServers
    Routes     = $routes | Select DestinationPrefix,NextHop,RouteMetric,InterfaceAlias
    DnsClient  = $dnsClient | Select InterfaceAlias,ServerAddresses
    RawFiles   = @("raw/ipconfig_all.txt","raw/wlan_show_drivers.txt","raw/wlan_show_interfaces.txt","raw/arp_a.txt","raw/route_print.txt")
  }
  WindowsFeatures = @{
    Optional  = $optFeatures | Select FeatureName,State
    DismList  = "raw/dism_features.txt"
  }
  Security = @{
    SecureBoot = $secureBoot
    TPM        = $tpm
    Defender   = @{
      Status   = $mpStatus
      Prefs    = $mpPrefs
    }
    FirewallProfiles = "raw/firewall_profiles.txt"
    FirewallPolicy   = "raw/firewall_policy.wfw"
  }
  Power = @{
    Availability = $powerAvail
    Plans        = $plansTxt
    EnergyReport = if(Test-Path $energyHtml){ "energy-report.html" } else { $null }
    BatteryReport= if(Test-Path $battHtml){ "battery-report.html" } else { $null }
    BatteryWMI   = $batWmi
  }
  Virtualization = @{
    Bcdedit   = $hvLaunch
    HyperV    = $hvFeatures
    WSL       = $wslFeat
  }
  GraphicsToggles = @{
    HAGS      = $hags
    GameMode  = $gameMode
  }
  DirectX = @{
    DxDiagTxt = if(Test-Path $dxTxt){ "dxdiag.txt" } else { $null }
    DirectStorageHeuristic = $dsHeuristic
  }
  Programs  = $programs
  DriversCsv= if(Test-Path $driversCsv){ "raw/drivers_full.csv" } else { $null }
  Services  = $services
  Startup   = $startup
  Tasks     = $tasks
  Fonts     = $fonts
  Pagefile  = $pagefile
  EnvVars   = $envVars | Select Name,Value
  PnPWide   = $pnpWide
  Events    = @{
    ApplicationErrors = $appErr
    SystemErrors      = $sysErr
  }
  Thermals  = @{
    Acpi    = $acpiTemps
    Nvidia  = if($gpuTempsCsv){ "nvidia-temps.csv" } else { $null }
  }
  PerfSampleCsv = if(Test-Path (Join-Path $Out "perf_sample.csv")){ "perf_sample.csv" } else { $null }
  Artifacts = @{
    Json = (Split-Path $jsonPath -Leaf)
    Txt  = (Split-Path $txtPath -Leaf)
    Html = (Split-Path $htmlPath -Leaf)
    RawDir = "raw"
    LogsDir= "logs"
  }
}

# Save JSON
$report | ConvertTo-Json -Depth 6 | Out-File -Encoding UTF8 $jsonPath

# TXT summary
$sb = New-Object System.Text.StringBuilder
$null = $sb.AppendLine("Omni System Report - $($env:COMPUTERNAME) - $ts")
$null = $sb.AppendLine("OS: $($compInfo.WindowsProductName) $($compInfo.WindowsVersion) ($($compInfo.OsArchitecture)) Build:$($compInfo.WindowsBuildLabEx)")
if($cpu){ $null = $sb.AppendLine("CPU: $($cpu.Name)  Cores:$($cpu.NumberOfCores)  Threads:$($cpu.NumberOfLogicalProcessors)") }
if($memMods){ $null = $sb.AppendLine("RAM Total: $([math]::Round($cs.TotalPhysicalMemory/1GB,2)) GB  Slots: $((($memMods)|Measure-Object).Count)  SMBIOS MaxCapacity: $([math]::Round(($memArr.MaxCapacity/1MB),0)) GB") }
if($gpus){ $null = $sb.AppendLine("GPU(s): " + (($gpus|Select -Expand Name) -join '; ')) }
if($nvReBar){ $null = $sb.AppendLine("Resizable BAR: $nvReBar") }
$null = $sb.AppendLine("Thunderbolt/USB4: " + (if(($tb1 -or $tb2)){"Detected"}else{"Not detected (check drivers)"}))
if($vols){
  $null = $sb.AppendLine("Volumes:")
  foreach($v in $vols){
    $sz= if($v.Size){ [math]::Round($v.Size/1GB,2) }else{"n/a"}
    $fr= if($v.SizeRemaining){ [math]::Round($v.SizeRemaining/1GB,2) }else{"n/a"}
    $dl= if($v.DriveLetter){ $v.DriveLetter }else{"-"}
    $null = $sb.AppendLine(" - $dl $($v.FileSystem) Size:$sz GB Free:$fr GB Health:$($v.HealthStatus)")
  }
}
$null = $sb.AppendLine("Power: HAGS=$hags  GameMode=$gameMode  SecureBoot=$secureBoot  TPMPresent=" + (if($tpm){$tpm.TpmPresent}else{"Unknown"}))
$null = $sb.AppendLine("Artifacts: JSON/TXT/HTML + raw/ (dxdiag, drivers, powercfg, wlan, firewall, etc.)")
$sb.ToString() | Out-File -Encoding UTF8 $txtPath

# HTML (simple pretty)
@"
<html><head><meta charset='utf-8'><title>Omni Report - $ts</title>
<style>body{font-family:Segoe UI,Arial;padding:18px}pre{white-space:pre-wrap;border:1px solid #ddd;padding:10px;border-radius:6px}</style>
</head><body>
<h1>Omni System Report — $env:COMPUTERNAME <small>$ts</small></h1>
<ul>
<li><b>JSON</b>: $(Split-Path $jsonPath -Leaf)</li>
<li><b>TXT</b>: $(Split-Path $txtPath -Leaf)</li>
<li><b>dxdiag</b>: dxdiag.txt</li>
<li><b>Battery</b>: battery-report.html</li>
<li><b>Energy</b>: energy-report.html</li>
<li><b>Drivers CSV</b>: raw/drivers_full.csv</li>
<li><b>Raw</b>: raw\</li>
</ul>
<h2>Summary</h2>
<pre>$([System.Web.HttpUtility]::HtmlEncode((Get-Content $txtPath -Raw)))</pre>
<h2>JSON</h2>
<pre>$([System.Web.HttpUtility]::HtmlEncode(($report | ConvertTo-Json -Depth 6)))</pre>
</body></html>
"@ | Out-File -Encoding UTF8 $htmlPath

# Optional ZIP
if($ZipOutput){
  try{
    $zipPath = "$Out.zip"
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [IO.Compression.ZipFile]::CreateFromDirectory($Out,$zipPath)
    Write-Host "ZIP: $zipPath"
  }catch{ Write-Host "ZIP failed: $($_.Exception.Message)" }
}

Write-Host "Report folder: $Out"
Write-Host "JSON: $jsonPath"
Write-Host "HTML: $htmlPath"
Write-Host "TXT: $txtPath"
Write-Host "Done."
