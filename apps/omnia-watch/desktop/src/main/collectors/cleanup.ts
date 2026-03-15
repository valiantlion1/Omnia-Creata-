import type { CleanupCandidate } from "@omnia-watch/types";
import { runPowerShellJson } from "@main/platform/powershell";

interface CleanupProbe {
  category: CleanupCandidate["category"];
  label: string;
  size: number;
}

export async function collectCleanupCandidates(deviceId: string): Promise<CleanupCandidate[]> {
  try {
    const raw = await runPowerShellJson<CleanupProbe[]>(
      "function Get-DirSize($path) { " +
        "if (Test-Path $path) { " +
        "return (Get-ChildItem -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum " +
        "} else { return 0 } }; " +
        "$items = @(" +
        "@{ category = 'temp-files'; label = 'User temp files'; size = (Get-DirSize $env:TEMP) }," +
        "@{ category = 'windows-temp'; label = 'Windows temp'; size = (Get-DirSize ($env:windir + '\\Temp')) }," +
        "@{ category = 'browser-cache'; label = 'Edge cache'; size = (Get-DirSize ($env:LOCALAPPDATA + '\\Microsoft\\Edge\\User Data\\Default\\Cache')) }" +
        "); $items | ConvertTo-Json -Depth 4 -Compress"
    );

    return (Array.isArray(raw) ? raw : [raw]).map((item, index) => ({
      category: item.category,
      deviceId,
      estimatedBytes: Math.max(0, item.size ?? 0),
      id: `${deviceId}-cleanup-${index + 1}`,
      label: item.label,
      safetyLevel: item.category === "browser-cache" ? "safe" : "safe",
      selectedByDefault: true
    }));
  } catch {
    return [];
  }
}
