param(
  [switch]$Execute
)

$ErrorActionPreference = "Stop"

$repoRoot = Split-Path -Parent $PSScriptRoot
$candidateDirectoryNames = @(
  ".next",
  ".turbo",
  "__pycache__",
  ".pytest_cache",
  "build",
  "coverage",
  "dist",
  "out"
)
$candidateFileNames = @(
  "backend_error.log",
  "preview.log",
  "tsconfig.tsbuildinfo"
)
$scanRoots = @("apps", "website")
$rootCandidateDirectoryNames = @(
  ".playwright-cli",
  ".pytest_cache",
  "output"
)

function Get-RelativePath([string]$BasePath, [string]$TargetPath) {
  $normalizedBase = [System.IO.Path]::GetFullPath($BasePath)
  if (-not $normalizedBase.EndsWith("\")) {
    $normalizedBase += "\"
  }

  $baseUri = New-Object System.Uri($normalizedBase)
  $targetUri = New-Object System.Uri([System.IO.Path]::GetFullPath($TargetPath))
  return $baseUri.MakeRelativeUri($targetUri).ToString().Replace("/", "\")
}

function Test-IgnoredPath([string]$RelativePath) {
  & git check-ignore -- $RelativePath *> $null
  return $LASTEXITCODE -eq 0
}

function Remove-ArtifactPath([string]$PathToRemove) {
  if (-not (Test-Path -LiteralPath $PathToRemove)) {
    return
  }

  try {
    Remove-Item -LiteralPath $PathToRemove -Recurse -Force -ErrorAction Stop
    return
  }
  catch {
    if (-not (Test-Path -LiteralPath $PathToRemove)) {
      return
    }

    Get-ChildItem -LiteralPath $PathToRemove -Recurse -Force -ErrorAction SilentlyContinue |
      Sort-Object FullName -Descending |
      ForEach-Object {
        if ($_.PSIsContainer) {
          Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue
        }
        else {
          Remove-Item -LiteralPath $_.FullName -Force -ErrorAction SilentlyContinue
        }
      }

    Remove-Item -LiteralPath $PathToRemove -Recurse -Force -ErrorAction SilentlyContinue

    if (Test-Path -LiteralPath $PathToRemove) {
      throw
    }
  }
}

Push-Location $repoRoot
try {
  $discoveredPaths = New-Object System.Collections.Generic.List[string]

  foreach ($candidateDirectoryName in $rootCandidateDirectoryNames) {
    $candidatePath = Join-Path $repoRoot $candidateDirectoryName
    if (Test-Path -LiteralPath $candidatePath) {
      $discoveredPaths.Add($candidatePath)
    }
  }

  foreach ($scanRoot in $scanRoots) {
    if (-not (Test-Path -LiteralPath $scanRoot)) {
      continue
    }

    Get-ChildItem -LiteralPath $scanRoot -Directory -Recurse -Force -ErrorAction SilentlyContinue |
      Where-Object {
        $_.FullName -notlike "*\node_modules\*" -and
        $candidateDirectoryNames -contains $_.Name
      } |
      ForEach-Object {
        $discoveredPaths.Add($_.FullName)
      }

    Get-ChildItem -LiteralPath $scanRoot -File -Recurse -Force -ErrorAction SilentlyContinue |
      Where-Object {
        $_.FullName -notlike "*\node_modules\*" -and
        $candidateFileNames -contains $_.Name
      } |
      ForEach-Object {
        $discoveredPaths.Add($_.FullName)
      }
  }

  $ignoredPaths = foreach ($path in ($discoveredPaths | Sort-Object -Unique)) {
    $relativePath = Get-RelativePath -BasePath $repoRoot -TargetPath $path
    if (Test-IgnoredPath -RelativePath $relativePath) {
      $path
    }
  }

  $selectedPaths = New-Object System.Collections.Generic.List[string]
  foreach ($path in ($ignoredPaths | Sort-Object { $_.Length })) {
    $alreadyCovered = $false
    foreach ($selectedPath in $selectedPaths) {
      if ($path -eq $selectedPath -or $path.StartsWith($selectedPath + "\")) {
        $alreadyCovered = $true
        break
      }
    }

    if (-not $alreadyCovered) {
      $selectedPaths.Add($path)
    }
  }

  if ($selectedPaths.Count -eq 0) {
    Write-Output "No ignored local artifacts found."
    exit 0
  }

  $modeLabel = if ($Execute) { "REMOVE" } else { "PLAN  " }
  foreach ($path in $selectedPaths) {
    $relativePath = Get-RelativePath -BasePath $repoRoot -TargetPath $path
    Write-Output "$modeLabel $relativePath"
  }

  if (-not $Execute) {
    Write-Output "Run with -Execute to remove the listed ignored local artifacts."
    exit 0
  }

  foreach ($path in ($selectedPaths | Sort-Object { $_.Length })) {
    Remove-ArtifactPath -PathToRemove $path
  }

  Write-Output ("Removed {0} ignored local artifact path(s)." -f $selectedPaths.Count)
}
finally {
  Pop-Location
}
