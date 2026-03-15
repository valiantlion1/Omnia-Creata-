import type { StartupItem, StartupImpactLevel } from "@omnia-watch/types";
import { runPowerShellJson } from "@main/platform/powershell";

interface StartupEntry {
  Command: string;
  Name: string;
  Source: string;
}

function estimateImpact(name: string): StartupImpactLevel {
  const normalized = name.toLowerCase();
  if (/(discord|teams|adobe|zoom)/.test(normalized)) {
    return "high";
  }

  if (/(onedrive|dropbox|steam|epic)/.test(normalized)) {
    return "medium";
  }

  return "low";
}

export async function collectStartupItems(deviceId: string): Promise<StartupItem[]> {
  try {
    const raw = await runPowerShellJson<StartupEntry[]>(
      "$runPaths = @(" +
        "@{ Path = 'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'; Source='Registry Run (Current User)' }," +
        "@{ Path = 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Run'; Source='Registry Run (Machine)' });" +
        "$results = foreach ($entry in $runPaths) { " +
        "if (Test-Path $entry.Path) { " +
        "Get-ItemProperty $entry.Path | ForEach-Object { " +
        "$_.PSObject.Properties | Where-Object { $_.Name -notmatch '^PS' } | ForEach-Object { " +
        "@{ Name = $_.Name; Command = $_.Value; Source = $entry.Source } } } } }; " +
        "$results | ConvertTo-Json -Depth 4 -Compress"
    );

    const entries = Array.isArray(raw) ? raw : [raw];

    return entries.map((entry, index) => ({
      command: entry.Command,
      deviceId,
      enabled: true,
      id: `${deviceId}-startup-${index + 1}`,
      impact: estimateImpact(entry.Name),
      name: entry.Name,
      source: entry.Source
    }));
  } catch {
    return [];
  }
}
