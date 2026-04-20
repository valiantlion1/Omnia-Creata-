function Resolve-AbsolutePath {
  param([string]$PathValue)

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return $null
  }

  return [System.IO.Path]::GetFullPath($PathValue)
}

function Resolve-EnvFilePath {
  param(
    [string]$DeployDir,
    [string]$PathValue
  )

  if ([string]::IsNullOrWhiteSpace($PathValue)) {
    return $null
  }

  if ([System.IO.Path]::IsPathRooted($PathValue)) {
    return [System.IO.Path]::GetFullPath($PathValue)
  }

  return [System.IO.Path]::GetFullPath((Join-Path $DeployDir $PathValue))
}

function Get-EnvMap {
  param([string]$PathValue)

  $values = [ordered]@{}
  if (-not (Test-Path $PathValue)) {
    return $values
  }

  foreach ($rawLine in Get-Content -Path $PathValue) {
    $line = $rawLine.Trim()
    if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
      continue
    }
    $parts = $line.Split("=", 2)
    $values[$parts[0].Trim()] = $parts[1].Trim()
  }
  return $values
}

function Get-UrlHost {
  param([string]$UrlValue)

  if ([string]::IsNullOrWhiteSpace($UrlValue)) {
    return $null
  }

  try {
    return ([System.Uri]$UrlValue.Trim()).Host
  } catch {
    return $null
  }
}

function Merge-AllowedHosts {
  param(
    [string]$CurrentValue,
    [string[]]$AdditionalHosts
  )

  $merged = @()
  $candidates = @()
  if (-not [string]::IsNullOrWhiteSpace($CurrentValue)) {
    $candidates += ($CurrentValue -split ",")
  }
  if ($AdditionalHosts) {
    $candidates += $AdditionalHosts
  }

  foreach ($candidate in $candidates) {
    $normalized = [string]$candidate
    $normalized = $normalized.Trim().ToLowerInvariant()
    if ([string]::IsNullOrWhiteSpace($normalized)) {
      continue
    }
    if ($merged -contains $normalized) {
      continue
    }
    $merged += $normalized
  }

  return ($merged -join ",")
}

function Get-EnvValueFromSources {
  param(
    [string]$Key,
    [string[]]$SourceFiles
  )

  foreach ($sourceFile in $SourceFiles) {
    if ([string]::IsNullOrWhiteSpace($sourceFile) -or -not (Test-Path $sourceFile)) {
      continue
    }

    foreach ($rawLine in Get-Content -Path $sourceFile) {
      $line = $rawLine.Trim()
      if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) {
        continue
      }
      $parts = $line.Split("=", 2)
      if ($parts[0].Trim() -ne $Key) {
        continue
      }

      $value = $parts[1].Trim()
      if (-not (Test-PlaceholderEnvValue -Value $value)) {
        return $value
      }
    }
  }

  return $null
}

function Test-PlaceholderEnvValue {
  param([string]$Value)

  if ([string]::IsNullOrWhiteSpace($Value)) {
    return $true
  }

  $normalized = $Value.Trim().ToLowerInvariant()
  foreach ($prefix in @("your-", "replace-", "placeholder", "example-", "<")) {
    if ($normalized.StartsWith($prefix)) {
      return $true
    }
  }
  return $false
}

function Resolve-StagingRuntimeRoot {
  param([System.Collections.IDictionary]$EnvValues)

  if ($EnvValues -and $EnvValues.Contains("STAGING_RUNTIME_ROOT")) {
    $candidate = Resolve-AbsolutePath $EnvValues["STAGING_RUNTIME_ROOT"]
    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
      return $candidate
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($env:STAGING_RUNTIME_ROOT)) {
    $candidate = Resolve-AbsolutePath $env:STAGING_RUNTIME_ROOT
    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
      return $candidate
    }
  }

  if (-not [string]::IsNullOrWhiteSpace($env:STUDIO_RUNTIME_ROOT)) {
    $candidate = Resolve-AbsolutePath $env:STUDIO_RUNTIME_ROOT
    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
      return $candidate
    }
  }

  if ($env:LOCALAPPDATA) {
    return Join-Path $env:LOCALAPPDATA "OmniaCreata\Studio\staging"
  }

  return Join-Path $HOME ".omnia_creata\studio\staging"
}

function Resolve-StagingVerifyBaseUrl {
  param(
    [System.Collections.IDictionary]$EnvValues,
    [string]$ExplicitBaseUrl
  )

  if (-not [string]::IsNullOrWhiteSpace($ExplicitBaseUrl)) {
    return $ExplicitBaseUrl.Trim()
  }

  if ($EnvValues -and $EnvValues.Contains("STAGING_VERIFY_BASE_URL")) {
    $candidate = [string]$EnvValues["STAGING_VERIFY_BASE_URL"]
    $candidate = $candidate.Trim()
    if (-not [string]::IsNullOrWhiteSpace($candidate)) {
      return $candidate
    }
  }

  $webPort = ""
  if ($EnvValues -and $EnvValues.Contains("WEB_PORT")) {
    $webPort = [string]$EnvValues["WEB_PORT"]
    $webPort = $webPort.Trim()
  }
  if ([string]::IsNullOrWhiteSpace($webPort)) {
    $webPort = "8080"
  }
  return "http://127.0.0.1:$webPort"
}

function Resolve-DefaultLocalRuntimeRoot {
  if ($env:LOCALAPPDATA) {
    return Join-Path $env:LOCALAPPDATA "OmniaCreata\Studio"
  }

  return Join-Path $HOME ".omnia_creata\studio"
}

function Sync-LocalRuntimeReport {
  param(
    [string]$TargetRuntimeRoot,
    [string]$ReportName
  )

  if ([string]::IsNullOrWhiteSpace($TargetRuntimeRoot) -or [string]::IsNullOrWhiteSpace($ReportName)) {
    return
  }

  $sourceRuntimeRoot = Resolve-DefaultLocalRuntimeRoot
  $sourceReport = Join-Path $sourceRuntimeRoot ("reports\" + $ReportName)
  $targetReport = Join-Path $TargetRuntimeRoot ("reports\" + $ReportName)

  if (-not (Test-Path $sourceReport)) {
    return
  }

  if ((Resolve-AbsolutePath $sourceReport) -eq (Resolve-AbsolutePath $targetReport)) {
    return
  }

  New-Item -ItemType Directory -Force -Path (Split-Path -Parent $targetReport) | Out-Null
  Copy-Item -Path $sourceReport -Destination $targetReport -Force
}

function Sync-LocalStartupVerificationReport {
  param([string]$TargetRuntimeRoot)

  Sync-LocalRuntimeReport -TargetRuntimeRoot $TargetRuntimeRoot -ReportName "local-verify-latest.json"
}

function Sync-LocalProviderSmokeReport {
  param([string]$TargetRuntimeRoot)

  Sync-LocalRuntimeReport -TargetRuntimeRoot $TargetRuntimeRoot -ReportName "provider-smoke-latest.json"
}

function New-StagingEffectiveEnvFile {
  param(
    [string]$SourceEnvFile,
    [string]$RuntimeRoot
  )

  $envValues = Get-EnvMap -PathValue $SourceEnvFile
  $effective = [ordered]@{}
  foreach ($entry in $envValues.GetEnumerator()) {
    $effective[$entry.Key] = [string]$entry.Value
  }

  $deployDir = $PSScriptRoot
  $studioRoot = Split-Path -Parent $deployDir
  $hydrationSourceFiles = @(
    $SourceEnvFile,
    (Join-Path $studioRoot ".env"),
    (Join-Path $studioRoot "backend\\.env")
  )

  $hydratedKeys = @(
    "SUPABASE_URL",
    "SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
    "JWT_SECRET",
    "DATABASE_URL",
    "REDIS_URL",
    "OPENAI_API_KEY",
    "OPENROUTER_API_KEY",
    "GEMINI_API_KEY",
    "FAL_API_KEY",
    "RUNWARE_API_KEY",
    "HUGGINGFACE_TOKEN",
    "PADDLE_API_KEY",
    "PADDLE_WEBHOOK_SECRET",
    "PADDLE_CHECKOUT_BASE_URL",
    "STUDIO_OWNER_EMAIL",
    "STUDIO_OWNER_EMAILS",
    "STUDIO_ROOT_ADMIN_EMAILS"
  )

  foreach ($key in $hydratedKeys) {
    $currentValue = ""
    if ($effective.Contains($key)) {
      $currentValue = [string]$effective[$key]
    }
    if (-not (Test-PlaceholderEnvValue -Value $currentValue)) {
      continue
    }

    $hostValue = [Environment]::GetEnvironmentVariable($key, "Process")
    if ([string]::IsNullOrWhiteSpace($hostValue)) {
      $hostValue = [Environment]::GetEnvironmentVariable($key, "User")
    }
    if ([string]::IsNullOrWhiteSpace($hostValue)) {
      $hostValue = [Environment]::GetEnvironmentVariable($key, "Machine")
    }
    if ([string]::IsNullOrWhiteSpace($hostValue)) {
      $hostValue = Get-EnvValueFromSources -Key $key -SourceFiles $hydrationSourceFiles
    }
    if ([string]::IsNullOrWhiteSpace($hostValue)) {
      continue
    }
    $effective[$key] = $hostValue.Trim()
  }

  if ((-not $effective.Contains("VITE_SUPABASE_URL")) -or (Test-PlaceholderEnvValue -Value ([string]$effective["VITE_SUPABASE_URL"]))) {
    if ($effective.Contains("SUPABASE_URL") -and -not (Test-PlaceholderEnvValue -Value ([string]$effective["SUPABASE_URL"]))) {
      $effective["VITE_SUPABASE_URL"] = [string]$effective["SUPABASE_URL"]
    }
  }
  if ((-not $effective.Contains("VITE_SUPABASE_ANON_KEY")) -or (Test-PlaceholderEnvValue -Value ([string]$effective["VITE_SUPABASE_ANON_KEY"]))) {
    if ($effective.Contains("SUPABASE_ANON_KEY") -and -not (Test-PlaceholderEnvValue -Value ([string]$effective["SUPABASE_ANON_KEY"]))) {
      $effective["VITE_SUPABASE_ANON_KEY"] = [string]$effective["SUPABASE_ANON_KEY"]
    }
  }

  $effective["STAGING_RUNTIME_ROOT"] = $RuntimeRoot
  if (-not $effective.Contains("STUDIO_RUNTIME_ROOT")) {
    $effective["STUDIO_RUNTIME_ROOT"] = $RuntimeRoot
  }

  $allowedHostCandidates = @(
    "localhost",
    "127.0.0.1",
    "backend",
    "studio_backend",
    (Get-UrlHost $effective["PUBLIC_WEB_BASE_URL"]),
    (Get-UrlHost $effective["PUBLIC_API_BASE_URL"]),
    (Get-UrlHost $effective["STAGING_VERIFY_BASE_URL"])
  )
  $existingAllowedHosts = ""
  if ($effective.Contains("ALLOWED_HOSTS")) {
    $existingAllowedHosts = [string]$effective["ALLOWED_HOSTS"]
  }
  $effective["ALLOWED_HOSTS"] = Merge-AllowedHosts -CurrentValue $existingAllowedHosts -AdditionalHosts $allowedHostCandidates

  $configDir = Join-Path $RuntimeRoot "config"
  New-Item -ItemType Directory -Force -Path $configDir | Out-Null
  $stableEffectiveEnvFile = Join-Path $configDir "staging-effective.env"
  $sessionSuffix = "{0}-{1}" -f (Get-Date -Format "yyyyMMdd-HHmmss"), $PID
  $effectiveEnvFile = Join-Path $configDir ("staging-effective-{0}.env" -f $sessionSuffix)
  $lines = foreach ($entry in $effective.GetEnumerator()) {
    "{0}={1}" -f $entry.Key, $entry.Value
  }
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($effectiveEnvFile, $lines, $utf8NoBom)
  try {
    [System.IO.File]::WriteAllLines($stableEffectiveEnvFile, $lines, $utf8NoBom)
  } catch [System.IO.IOException] {
    # Keep the per-run env file when another process has the stable file locked.
  }

  return @{
    Path = $effectiveEnvFile
    Values = $effective
  }
}
