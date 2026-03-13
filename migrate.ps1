$ErrorActionPreference = "Stop"
$BasePath = "c:\Users\valiantlion\Desktop\OMNIA CREATA"

Write-Host "Creating ecosystem root directories..."
$RootDirs = @("website\omniacreata.com", "apps", "prototypes", "research", "assets", "docs", "backups", "temp")
foreach ($dir in $RootDirs) {
    if (-not (Test-Path "$BasePath\$dir")) {
        New-Item -ItemType Directory -Path "$BasePath\$dir" | Out-Null
    }
}

function New-AppStructure {
    param([string]$AppPath)
    $AppFull = "$BasePath\$AppPath"
    if (-not (Test-Path $AppFull)) {
        New-Item -ItemType Directory -Path $AppFull | Out-Null
    }
    $SubDirs = @("app", "docs", "assets", "config", "builds", "archive")
    foreach ($sub in $SubDirs) {
        if (-not (Test-Path "$AppFull\$sub")) {
            New-Item -ItemType Directory -Path "$AppFull\$sub" | Out-Null
        }
    }
}

Write-Host "Creating application structures..."
$AppList = @(
    "apps\studio",
    "apps\pixels",
    "apps\bench",
    "apps\gamehub",
    "apps\companion",
    "apps\organizer",
    "apps\tools",
    "apps\utilities\Pomodoro Timer",
    "apps\utilities\QR Master",
    "apps\utilities\SifreApp",
    "apps\utilities\Voice Fun",
    "apps\internal\control-center"
)

foreach ($app in $AppList) {
    New-AppStructure -AppPath $app
}

function Move-Safe {
    param([string]$Src, [string]$Dest)
    $SourcePath = "$BasePath\$Src"
    $DestPath = "$BasePath\$Dest"
    if (Test-Path $SourcePath) {
        if (-not (Test-Path $DestPath)) {
            New-Item -ItemType Directory -Path $DestPath -Force | Out-Null
        }
        Move-Item -Path $SourcePath -Destination $DestPath -ErrorAction Continue
        Write-Host "Moved $Src to $Dest"
    }
}

function Move-ContentToApp {
    param([string]$FolderToMove, [string]$AppDir)
    $SourcePath = "$BasePath\$FolderToMove"
    $DestPath = "$BasePath\$AppDir\app"
    if (Test-Path $SourcePath) {
        if (-not (Test-Path $DestPath)) {
            New-Item -ItemType Directory -Path $DestPath -Force | Out-Null
        }
        Move-Item -Path "$SourcePath\*" -Destination $DestPath -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $SourcePath -Force -Recurse -ErrorAction SilentlyContinue
        Write-Host "Moved contents of $FolderToMove to $AppDir"
    }
}

Write-Host "Migrating specific directories..."
Move-ContentToApp "Omnia Creata\Pomodoro Timer" "apps\utilities\Pomodoro Timer"
Move-ContentToApp "Omnia Creata\QR Master" "apps\utilities\QR Master"
Move-ContentToApp "Omnia Creata\SıfreApp" "apps\utilities\SifreApp"
Move-ContentToApp "Omnia Creata\Voice Fun" "apps\utilities\Voice Fun"
Move-ContentToApp "Omnia Creata\Omnia Creata Control Center" "apps\internal\control-center"
Move-ContentToApp "Omnia Creata\Omnia Creata Studio" "apps\studio"
Move-ContentToApp "Omnia Creata\OmniaOrganizer" "apps\organizer"

# Move specific zip/file items first
Move-Safe "Omnia Creata\Omnia Creata Planları.zip" "backups"
Move-Safe "Omnia Creata\Omnia Creata Planları" "docs"
Move-Safe "Omnia Creata\Omnia Index" "temp"

Move-ContentToApp "Projeler\VIRTUAL BELLA" "apps\companion"
Move-Safe "Projeler\VIRTUAL BELLA.zip" "backups"
Move-Safe "Projeler\AAAOmniaProjects" "temp"
Move-Safe "Projeler\ARİ VE ERDO" "temp"
Move-Safe "Projeler\CLIPART" "assets"
Move-Safe "Projeler\Detayli_Sistem_Analizi.txt" "docs"
Move-Safe "Projeler\My YouTube Music Library.csv" "temp"
Move-Safe "Projeler\MİNİMAX FİRST" "prototypes"
Move-Safe "Projeler\OmniSystemReport_20250920_141051.zip" "backups"
Move-Safe "Projeler\OmniSystemReport_20250920_141051" "docs"
Move-Safe "Projeler\OmniSystemReport_ReadyToRun.zip" "backups"
Move-Safe "Projeler\OmniSystemReport_ReadyToRun" "docs"
Move-Safe "Projeler\Omnia" "temp"
Move-Safe "Projeler\Omnia Creata" "temp\Projeler_Omnia_Creata"
Move-Safe "Projeler\Omnia Creata.zip" "backups"
Move-Safe "Projeler\OmniaCreata Projelerin planları" "docs"
Move-Safe "Projeler\OmniaOrganizer.zip" "backups"
Move-Safe "Projeler\SystemReport" "docs"
Move-Safe "Projeler\OmniaPixelsApp-main.zip" "backups"
Move-Safe "Projeler\PROJECTS" "temp"
Move-Safe "Omnia Creata\OmniaPixelsApp-main" "apps\pixels\archive"
Move-Safe "Omnia Creata\OmniaPixelsApp-main.zip" "backups"

# Move specific files into exact folders
$fileMaps = @(
    @("Projeler\OmniaOrganizer_FullPlan.txt", "apps\organizer\docs"),
    @("Projeler\SystemCare_Pro_Defrag.ps1", "apps\tools\app"),
    @("Projeler\SystemCare_Pro_Safe.ps1", "apps\tools\app"),
    @("Projeler\Update-All.ps1", "apps\tools\app"),
    @("Projeler\text_normalizer.py", "apps\tools\app")
)

foreach ($map in $fileMaps) {
    if (Test-Path "$BasePath\$($map[0])") {
        if (-not (Test-Path "$BasePath\$($map[1])")) {
            New-Item -ItemType Directory -Path "$BasePath\$($map[1])" -Force | Out-Null
        }
        Move-Item "$BasePath\$($map[0])" "$BasePath\$($map[1])" -Force
    }
}

Move-Safe "Projeler\TAMİLATAR.txt" "temp"
Move-Safe "Projeler\Trae.lnk" "temp"
Move-Safe "Projeler\ai üretim kitabı" "docs"
Move-Safe "Projeler\app bişeysi" "prototypes"
Move-Safe "Projeler\bişeyler ugabuga" "prototypes"
Move-Safe "Projeler\test app" "prototypes"
Move-Safe "Projeler\gsuite.txt" "temp"
# move residual txt files inside Projeler
if (Test-Path "$BasePath\Projeler\Yeni Metin Belgesi*.txt") {
    Move-Item "$BasePath\Projeler\Yeni Metin Belgesi*.txt" "$BasePath\temp" -Force
}

# The remaining items inside `Omnia Creata` main folder
if (Test-Path "$BasePath\Omnia Creata") {
    $leftovers = Get-ChildItem "$BasePath\Omnia Creata"
    if ($leftovers.Count -gt 0) {
        if (-not (Test-Path "$BasePath\temp\Omnia_Creata_Remaining")) {
            New-Item -ItemType Directory -Path "$BasePath\temp\Omnia_Creata_Remaining" | Out-Null
        }
        Move-Item "$BasePath\Omnia Creata\*" "$BasePath\temp\Omnia_Creata_Remaining" -Force -ErrorAction SilentlyContinue
    }
    Remove-Item "$BasePath\Omnia Creata" -Force -Recurse -ErrorAction SilentlyContinue
}

# Now handle `OmniaCreata` folder (no spaces)
Move-Safe "OmniaCreata\OmniaCreata.zip" "backups"
Move-Safe "OmniaCreata\OmniaPixels.zip" "backups"
Move-Safe "OmniaCreata\OmniaPixels_Android_Blueprint_v1.zip" "backups"
Move-Safe "OmniaCreata\OmniaPixels_Android_Pro_Blueprint_v2.zip" "backups"
Move-Safe "OmniaCreata\OmniaPixels_Full_CoreStructure_Part3.zip" "backups"
Move-Safe "OmniaCreata\OmniaPixels_MAP_PART4.zip" "backups"
Move-Safe "OmniaCreata\OmniaPixels_Stable_AI_Expanded.zip" "backups"
Move-Safe "OmniaCreata\OmniaPixels_Ultimate_Blueprint_Part1-32.docx" "docs"
Move-Safe "OmniaCreata\OmniaPixels_Ultimate_Blueprint_Part1-32 - Kopya.md" "docs"
Move-Safe "OmniaCreata\modül list.md" "docs"
Move-Safe "OmniaCreata\OmniaPixels" "apps\pixels\archive\OmniaPixels_from_no_space"
Move-Safe "OmniaCreata\OmniaPixels_Android_Blueprint_v1_unpacked" "temp"
Move-Safe "OmniaCreata\OmniaPixels_Android_Pro_Blueprint_v2_unpacked" "temp"
Move-Safe "OmniaCreata\OmniaPixels_Full_CoreStructure_Part3_unpacked" "temp"
Move-Safe "OmniaCreata\OmniaPixels_MAP_PART4_unpacked" "temp"
Move-Safe "OmniaCreata\OmniaPixels_Stable_AI_Expanded_unpacked" "temp"
Move-Safe "OmniaCreata\OmniaPixels_full" "temp"
Move-Safe "OmniaCreata\OmniaPixels_unpacked" "temp"

if (Test-Path "$BasePath\OmniaCreata") {
    $leftovers = Get-ChildItem "$BasePath\OmniaCreata"
    if ($leftovers.Count -gt 0) {
        if (-not (Test-Path "$BasePath\temp\OmniaCreata_Remaining")) {
            New-Item -ItemType Directory -Path "$BasePath\temp\OmniaCreata_Remaining" | Out-Null
        }
        Move-Item "$BasePath\OmniaCreata\*" "$BasePath\temp\OmniaCreata_Remaining" -Force -ErrorAction SilentlyContinue
    }
    Remove-Item "$BasePath\OmniaCreata" -Force -Recurse -ErrorAction SilentlyContinue
}

if (Test-Path "$BasePath\Projeler") {
    $leftovers = Get-ChildItem "$BasePath\Projeler"
    if ($leftovers.Count -gt 0) {
        if (-not (Test-Path "$BasePath\temp\Projeler_Remaining")) {
            New-Item -ItemType Directory -Path "$BasePath\temp\Projeler_Remaining" | Out-Null
        }
        Move-Item "$BasePath\Projeler\*" "$BasePath\temp\Projeler_Remaining" -Force -ErrorAction SilentlyContinue
    }
    Remove-Item "$BasePath\Projeler" -Force -Recurse -ErrorAction SilentlyContinue
}

# Now handle root level files
Move-ContentToApp "OmniaPixels" "apps\pixels"
Move-Safe "AGENT_SYSTEM_PROMPT.py" "research\agent_tests"
Move-Safe "AgentKit_PY.zip" "backups"
Move-Safe "FİGMA TASARIMI" "assets"
Move-Safe "OmniaCreata_MOVE_MAP.csv" "temp"
Move-Safe "OmniaCreata_PROJECT_MAP.json" "temp"
Move-Safe "OmniaCreata_text_only.zip" "backups"
Move-Safe "OmniaPixels.zip" "backups"
Move-Safe "OmniaPixels_Android_Pro_Blueprint_v2_text_only.zip" "backups"
Move-Safe "OmniaPixels_BACKUP_20250818_234700" "backups"
Move-Safe "OmniaPixels_ChatGPT_Review" "docs"
Move-Safe "Omnia_NoTXT_Agent_Bundle.zip" "backups"
Move-Safe "omnia_spec_pack_v1" "docs"

if (Test-Path "$BasePath\text_normalizer.py") {
    Move-Item "$BasePath\text_normalizer.py" "$BasePath\apps\tools\app" -Force
}

Write-Host "Migration completed successfully."
