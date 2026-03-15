import { hostname } from "node:os";
import { runPowerShell, runPowerShellJson } from "@main/platform/powershell";

interface DeviceIdentity {
  machineId: string;
  osVersion: string;
}

export async function collectDeviceIdentity(): Promise<DeviceIdentity> {
  try {
    const result = await runPowerShellJson<
      Array<{
        MachineGuid: string;
        Version: string;
      }>
    >(
      "$machine = Get-ItemProperty 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography'; " +
        "$os = Get-ComputerInfo | Select-Object WindowsProductName, WindowsVersion; " +
        "@(@{ MachineGuid = $machine.MachineGuid; Version = \"$($os.WindowsProductName) $($os.WindowsVersion)\" }) | ConvertTo-Json -Depth 4 -Compress"
    );

    const first = Array.isArray(result) ? result[0] : result;
    return {
      machineId: first?.MachineGuid ?? hostname(),
      osVersion: first?.Version ?? "Windows"
    };
  } catch {
    return {
      machineId: hostname(),
      osVersion: "Windows"
    };
  }
}

export async function collectDeviceName() {
  try {
    return await runPowerShell("(Get-ComputerInfo -Property CsName).CsName");
  } catch {
    return hostname();
  }
}
