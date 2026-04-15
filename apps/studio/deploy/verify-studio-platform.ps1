param(
  [string]$EnvFile = ".env.platform",
  [string]$BaseUrl,
  [string]$Label = "render-vercel-staging",
  [string]$OwnerBearerToken,
  [switch]$PromptForOwnerToken,
  [switch]$RequireClosureReady
)

$ErrorActionPreference = "Stop"

$deployDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$helperScript = Join-Path $deployDir "staging-runtime-helpers.ps1"
$verifyScript = Join-Path $deployDir "verify-studio-staging.ps1"

if (-not (Test-Path $helperScript)) {
  throw "Missing staging runtime helper script: $helperScript"
}
. $helperScript

$resolvedEnvFile = Resolve-EnvFilePath -DeployDir $deployDir -PathValue $EnvFile
if (-not (Test-Path $resolvedEnvFile)) {
  throw "Missing platform env file: $resolvedEnvFile"
}

$envValues = Get-EnvMap -PathValue $resolvedEnvFile
if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  $BaseUrl = [string]$envValues["PUBLIC_WEB_BASE_URL"]
}
if ([string]::IsNullOrWhiteSpace($BaseUrl)) {
  throw "PUBLIC_WEB_BASE_URL is required for verify-studio-platform.ps1 unless -BaseUrl is passed explicitly."
}

$args = @(
  "-ExecutionPolicy",
  "Bypass",
  "-File",
  $verifyScript,
  "-EnvFile",
  $resolvedEnvFile,
  "-BaseUrl",
  $BaseUrl,
  "-Label",
  $Label
)
if (-not [string]::IsNullOrWhiteSpace($OwnerBearerToken)) {
  $args += @("-OwnerBearerToken", $OwnerBearerToken)
}
if ($PromptForOwnerToken.IsPresent) {
  $args += "-PromptForOwnerToken"
}
if ($RequireClosureReady.IsPresent) {
  $args += "-RequireClosureReady"
}

& powershell @args
exit $LASTEXITCODE
