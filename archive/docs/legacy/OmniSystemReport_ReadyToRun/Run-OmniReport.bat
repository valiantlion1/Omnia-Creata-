@echo off
:: Run-OmniReport.bat - Double-click launcher
:: It will request Admin rights, then run the PowerShell script.
setlocal

:: Determine script dir
set "SCRIPT_DIR=%~dp0"
set "PS1=%SCRIPT_DIR%Get-OmniSystemReport.ps1"

:: Check admin
net session >nul 2>&1
if %errorlevel% neq 0 (
  echo Requesting administrative privileges...
  powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)

:: Run the PowerShell script with recommended flags
powershell -NoProfile -ExecutionPolicy Bypass -File "%PS1%" -SampleSeconds 15 -ZipOutput

echo.
echo =====================================================================
echo Finished. The report folder was created on your Desktop.
echo Press any key to exit...
pause >nul
