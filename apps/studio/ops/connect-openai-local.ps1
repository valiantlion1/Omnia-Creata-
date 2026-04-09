param(
  [string]$DraftModel = "gpt-image-1-mini",
  [string]$FinalModel = "gpt-image-1.5",
  [string]$ServiceTier = "paid"
)

$ErrorActionPreference = "Stop"

function ConvertTo-PlainText {
  param([Security.SecureString]$SecureValue)

  if ($null -eq $SecureValue) {
    return ""
  }

  $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
  } finally {
    if ($bstr -ne [IntPtr]::Zero) {
      [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
    }
  }
}

Write-Host ""
Write-Host "OmniaCreata Studio - OpenAI local connector" -ForegroundColor Cyan
Write-Host "The API key will be stored in your Windows user environment, not in the repo." -ForegroundColor DarkGray
Write-Host ""

$secureKey = Read-Host "Paste your OpenAI API key" -AsSecureString
$plainKey = ConvertTo-PlainText -SecureValue $secureKey

if ([string]::IsNullOrWhiteSpace($plainKey)) {
  throw "OpenAI API key was empty. Nothing was changed."
}

[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", $plainKey, "User")
[Environment]::SetEnvironmentVariable("OPENAI_IMAGE_DRAFT_MODEL", $DraftModel, "User")
[Environment]::SetEnvironmentVariable("OPENAI_IMAGE_MODEL", $FinalModel, "User")
[Environment]::SetEnvironmentVariable("OPENAI_SERVICE_TIER", $ServiceTier, "User")

Write-Host ""
Write-Host "OpenAI local image settings saved for the current Windows user." -ForegroundColor Green
Write-Host "Draft model: $DraftModel" -ForegroundColor Green
Write-Host "Final model: $FinalModel" -ForegroundColor Green
Write-Host "Service tier: $ServiceTier" -ForegroundColor Green
Write-Host ""
