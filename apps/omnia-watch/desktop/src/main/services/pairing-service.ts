import type { PairingResult } from "@shared/contracts";
import { collectDeviceIdentity, collectDeviceName } from "@main/collectors/device";
import { readHttpErrorMessage } from "@main/services/http-error";

export class PairingService {
  constructor(private readonly appVersion: string) {}

  async completePairing(pairingCode: string, apiBaseUrl: string): Promise<PairingResult & {
    deviceName: string;
    machineId: string;
  }> {
    const [deviceIdentity, deviceName] = await Promise.all([
      collectDeviceIdentity(),
      collectDeviceName()
    ]);

    const response = await fetch(`${apiBaseUrl}/api/device/pair/complete`, {
      body: JSON.stringify({
        appVersion: this.appVersion,
        deviceName,
        machineId: deviceIdentity.machineId,
        osVersion: deviceIdentity.osVersion,
        pairingCode,
        platform: "windows"
      }),
      headers: {
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      const message = await readHttpErrorMessage(
        response,
        `Pairing failed with status ${response.status}.`
      );
      throw new Error(message);
    }

    const payload = (await response.json()) as PairingResult;
    return {
      ...payload,
      deviceName,
      machineId: deviceIdentity.machineId
    };
  }
}
