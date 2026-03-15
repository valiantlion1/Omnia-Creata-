Omni System Report — by Ari

HOW TO USE
1) Extract the ZIP anywhere (e.g., Desktop).
2) Double-click: Run-OmniReport.bat
   - It will ask for Administrator permission.
   - It runs the deep system report and creates a folder on your Desktop
     like: OmniSystemReport_YYYYMMDD_HHMMSS
3) Open the HTML inside that folder to view the summary.
   - JSON, TXT, dxdiag, battery/energy reports, drivers CSV and RAW outputs are included.
4) Optionally, run directly:
   powershell -ExecutionPolicy Bypass -File ".\Get-OmniSystemReport.ps1" -SampleSeconds 15 -ZipOutput

NOTES
- No secrets are collected by default. To include serials etc., run with -IncludeSensitive.
- This script reads your system information and saves reports locally only.
- If Smart/Storage counters are unavailable on some hardware, their sections may be empty.

Need help? Share the TXT/JSON from the report folder and Ari will build an upgrade plan.