import type { SoftwareInventoryItem } from "@omnia-watch/types";
import { getWingetUpgrades } from "@main/platform/winget";
import { runPowerShellJson } from "@main/platform/powershell";
import { normalizeName } from "@main/utils/normalization";

interface RegistryApp {
  DisplayName: string;
  DisplayVersion?: string;
  InstallLocation?: string;
  Publisher?: string;
}

export async function collectApplications(deviceId: string): Promise<SoftwareInventoryItem[]> {
  const installed = await runPowerShellJson<RegistryApp[]>(
    "$paths = @(" +
      "'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'," +
      "'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*'," +
      "'HKCU:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*');" +
      "Get-ItemProperty $paths -ErrorAction SilentlyContinue | " +
      "Where-Object { $_.DisplayName } | " +
      "Select-Object DisplayName, DisplayVersion, Publisher, InstallLocation | " +
      "Sort-Object DisplayName -Unique | ConvertTo-Json -Depth 4 -Compress"
  );
  const upgrades = await getWingetUpgrades();
  const upgradeMap = new Map(
    upgrades.map((item) => [normalizeName(item.name), item] as const)
  );

  const appList = Array.isArray(installed) ? installed : [installed];

  return appList.slice(0, 200).map((entry, index) => {
    const displayName = entry.DisplayName ?? `Unknown App ${index + 1}`;
    const normalizedName = normalizeName(displayName);
    const wingetMatch = upgradeMap.get(normalizedName);
    const sourceKind = wingetMatch ? "winget" : entry.InstallLocation ? "vendor" : "unknown";
    const status = wingetMatch
      ? "updatable"
      : sourceKind === "vendor"
        ? "manual"
        : "unsupported";
    const actionType = wingetMatch ? "automatic" : sourceKind === "vendor" ? "manual" : "none";

    return {
      actionType,
      appId: wingetMatch?.id ?? normalizedName,
      availableVersion: wingetMatch?.availableVersion ?? null,
      detectionMethod: "registry",
      deviceId,
      displayName,
      id: `${deviceId}-app-${index + 1}`,
      installPath: entry.InstallLocation ?? null,
      installedVersion: entry.DisplayVersion ?? "unknown",
      lastCheckedAt: new Date().toISOString(),
      normalizedName,
      notes: wingetMatch
        ? "Winget update candidate detected."
        : sourceKind === "vendor"
          ? "No safe automated package path detected yet."
          : "Unsupported package source.",
      publisher: entry.Publisher ?? null,
      sourceKind,
      status,
      technicalDetails: {
        wingetId: wingetMatch?.id ?? null
      },
      updateConfidence: wingetMatch ? 0.9 : sourceKind === "vendor" ? 0.45 : 0.15
    } satisfies SoftwareInventoryItem;
  });
}
