import type { DeviceHealthSummary } from "@omnia-watch/types";
import { runPowerShellJson } from "@main/platform/powershell";

interface HealthProbe {
  cpu: number;
  freeMemoryKb: number;
  lastBootUpTime: string;
  osVersion: string;
  totalMemoryKb: number;
  totalStorage: number;
  usedStorage: number;
}

export async function collectHealthSummary(): Promise<DeviceHealthSummary> {
  try {
    const raw = await runPowerShellJson<HealthProbe[]>(
      "$os = Get-CimInstance Win32_OperatingSystem; " +
        "$disk = Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='C:'\"; " +
        "$cpu = (Get-Counter '\\Processor(_Total)\\% Processor Time').CounterSamples.CookedValue; " +
        "@(@{ " +
        "cpu = [math]::Round($cpu, 0); " +
        "freeMemoryKb = [int64]$os.FreePhysicalMemory; " +
        "lastBootUpTime = $os.LastBootUpTime.ToString('o'); " +
        "osVersion = \"$($os.Caption) $($os.Version)\"; " +
        "totalMemoryKb = [int64]$os.TotalVisibleMemorySize; " +
        "totalStorage = [int64]$disk.Size; " +
        "usedStorage = [int64]($disk.Size - $disk.FreeSpace) }) | ConvertTo-Json -Depth 4 -Compress"
    );

    const item = Array.isArray(raw) ? raw[0] : raw;
    const totalMemoryKb = item?.totalMemoryKb ?? 1;
    const memoryUsagePercent =
      ((totalMemoryKb - (item?.freeMemoryKb ?? 0)) / totalMemoryKb) * 100;
    const diskPressurePercent =
      ((item?.usedStorage ?? 0) / Math.max(item?.totalStorage ?? 1, 1)) * 100;
    const uptimeHours =
      (Date.now() - new Date(item?.lastBootUpTime ?? new Date().toISOString()).getTime()) /
      (1000 * 60 * 60);

    return {
      cpuUsagePercent: item?.cpu ?? 0,
      diskPressurePercent: Math.round(diskPressurePercent),
      memoryUsagePercent: Math.round(memoryUsagePercent),
      osVersion: item?.osVersion ?? "Windows",
      storageTotalBytes: item?.totalStorage ?? 0,
      storageUsedBytes: item?.usedStorage ?? 0,
      uptimeHours: Math.round(uptimeHours)
    };
  } catch {
    return {
      cpuUsagePercent: 0,
      diskPressurePercent: 0,
      memoryUsagePercent: 0,
      osVersion: "Windows",
      storageTotalBytes: 0,
      storageUsedBytes: 0,
      uptimeHours: 0
    };
  }
}
