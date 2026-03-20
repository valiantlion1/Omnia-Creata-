$ErrorActionPreference = 'Stop'

$repoRoot = Split-Path -Parent $PSScriptRoot
$docsRoot = Join-Path $repoRoot 'docs'
$outFile = Join-Path $docsRoot 'STITCH-HANDOFF-COMPLETE.md'
$zipFile = Join-Path $docsRoot 'stitch-handoff-complete.zip'

$files = @(
  'BLUEPRINT.md',
  'EXECUTION-PLAN.md',
  'FOUNDER-MINIMAL-ACTIONS.md',
  'PRODUCT.md',
  'DATA-MODEL.md',
  'AI.md',
  'ARCHITECTURE.md',
  'PWA.md',
  'PLAY-STORE.md',
  'I18N.md',
  'DECISIONS.md'
)

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('# OmniaVault Stitch Handoff Pack')
$lines.Add('')
$lines.Add('> Generated: 2026-03-20')
$lines.Add('> Purpose: Single-file product, UX, architecture, and release context for external UI generation tools like Google Stitch.')
$lines.Add('> Recommended use: Upload this file alone first. Only upload additional files if the design tool asks for more detail.')
$lines.Add('')
$lines.Add('## What This File Is')
$lines.Add('')
$lines.Add('This is the single combined source-of-truth handoff for OmniaVault.')
$lines.Add('It combines the planning documents that matter most for redesigning the product UI from scratch.')
$lines.Add('')
$lines.Add('## What The Design Tool Should Understand')
$lines.Add('')
$lines.Add('- OmniaVault is a real mobile-first app, not a marketing website or dashboard template.')
$lines.Add('- The app is for capturing, organizing, revisiting, versioning, and refining ideas, notes, prompts, research fragments, and project thinking.')
$lines.Add('- The result must feel like a premium installed app, not a web dashboard.')
$lines.Add('- Home, Capture, Library, Projects, Entry Detail, Version History, Settings, Onboarding, Sync, and Offers are the main surfaces.')
$lines.Add('- The product should feel calmer and lighter than Notion.')
$lines.Add('- Version history and restore safety are core product features.')
$lines.Add('- AI is secondary and assistive, not a chat-first experience.')
$lines.Add('- Mobile-first clarity matters more than visual drama.')
$lines.Add('')
$lines.Add('## Included Documents')
$lines.Add('')

foreach ($file in $files) {
  $lines.Add("- $file")
}

$lines.Add('')
$lines.Add('---')
$lines.Add('')

foreach ($file in $files) {
  $path = Join-Path $docsRoot $file
  if (-not (Test-Path $path)) {
    continue
  }

  $lines.Add("# $file")
  $lines.Add('')
  foreach ($line in Get-Content -Path $path -Encoding UTF8) {
    $lines.Add($line)
  }
  $lines.Add('')
  $lines.Add('---')
  $lines.Add('')
}

Set-Content -Path $outFile -Value $lines -Encoding UTF8

if (Test-Path $zipFile) {
  Remove-Item $zipFile -Force
}

Compress-Archive -LiteralPath $outFile -DestinationPath $zipFile -Force

Get-Item $outFile, $zipFile | Select-Object FullName, Length, LastWriteTime
