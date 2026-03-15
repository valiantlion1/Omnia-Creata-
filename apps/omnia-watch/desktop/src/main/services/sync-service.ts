import type { AgentConfig, AgentScanResult } from "@shared/contracts";
import { readHttpErrorMessage } from "@main/services/http-error";

export class SyncService {
  async syncScan(config: AgentConfig, scan: AgentScanResult) {
    if (!config.deviceId || !config.deviceToken) {
      throw new Error("Device is not paired yet.");
    }

    const response = await fetch(`${config.apiBaseUrl}/api/device/sync`, {
      body: JSON.stringify({
        apps: scan.apps,
        cleanup: scan.cleanup,
        deviceId: config.deviceId,
        health: scan.health,
        machineId: scan.machineId,
        recommendations: scan.recommendations,
        scannedAt: scan.scannedAt,
        security: scan.security,
        startup: scan.startup
      }),
      headers: {
        Authorization: `Bearer ${config.deviceToken}`,
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    if (!response.ok) {
      const message = await readHttpErrorMessage(
        response,
        `Sync failed with status ${response.status}.`
      );
      throw new Error(message);
    }

    return (await response.json()) as {
      accepted: boolean;
      ingestedAt: string;
      recommendationCount: number;
    };
  }
}
