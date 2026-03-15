import type { SecuritySignal } from "@omnia-watch/types";
import { runPowerShellJson } from "@main/platform/powershell";

interface SecurityProbe {
  defenderEnabled: boolean;
  firewallEnabled: boolean;
}

export async function collectSecuritySignals(deviceId: string): Promise<SecuritySignal[]> {
  try {
    const result = await runPowerShellJson<SecurityProbe[]>(
      "$defender = Get-MpComputerStatus -ErrorAction SilentlyContinue; " +
        "$firewall = Get-NetFirewallProfile -ErrorAction SilentlyContinue | Where-Object Enabled -eq True; " +
        "@(@{ defenderEnabled = [bool]$defender.RealTimeProtectionEnabled; firewallEnabled = [bool]($firewall.Count -gt 0) }) | ConvertTo-Json -Depth 4 -Compress"
    );

    const item = Array.isArray(result) ? result[0] : result;

    return [
      {
        detail: item?.defenderEnabled
          ? "Real-time protection is enabled."
          : "Windows Defender reported disabled.",
        deviceId,
        id: `${deviceId}-security-1`,
        key: "defender",
        label: "Windows Defender",
        status: item?.defenderEnabled ? "ok" : "critical"
      },
      {
        detail: item?.firewallEnabled
          ? "Firewall is enabled on at least one active profile."
          : "Firewall reported disabled.",
        deviceId,
        id: `${deviceId}-security-2`,
        key: "firewall",
        label: "Firewall",
        status: item?.firewallEnabled ? "ok" : "warning"
      }
    ];
  } catch {
    return [
      {
        detail: "Security data could not be collected from the device.",
        deviceId,
        id: `${deviceId}-security-fallback`,
        key: "security",
        label: "Security status",
        status: "unknown"
      }
    ];
  }
}
