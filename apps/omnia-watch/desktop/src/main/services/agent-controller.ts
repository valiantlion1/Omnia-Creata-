import { join } from "node:path";
import type { AgentStatus } from "@shared/contracts";
import { app } from "electron";
import { ConfigStore } from "@main/persistence/config-store";
import { LogStore } from "@main/persistence/log-store";
import { ScanCache } from "@main/persistence/scan-cache";
import { PairingService } from "@main/services/pairing-service";
import { ScanService } from "@main/services/scan-service";
import { SyncService } from "@main/services/sync-service";

export class AgentController {
  private readonly configStore = new ConfigStore(join(app.getPath("userData"), "state"));
  private readonly logStore = new LogStore(join(app.getPath("userData"), "logs"));
  private readonly pairingService = new PairingService(app.getVersion());
  private readonly scanCache = new ScanCache(join(app.getPath("userData"), "state"));
  private readonly scanService = new ScanService();
  private readonly syncService = new SyncService();

  async getStatus(): Promise<AgentStatus> {
    const config = await this.configStore.read();

    return {
      apiBaseUrl: config.apiBaseUrl,
      appVersion: config.appVersion,
      deviceId: config.deviceId,
      deviceName: config.deviceName,
      lastScanAt: config.lastScanAt,
      lastSyncAt: config.lastSyncAt,
      machineId: config.machineId,
      paired: Boolean(config.deviceId && config.deviceToken)
    };
  }

  async pairWithCode(pairingCode: string) {
    const config = await this.configStore.read();
    const pairing = await this.pairingService.completePairing(pairingCode, config.apiBaseUrl);

    await this.configStore.write({
      ...config,
      apiBaseUrl: pairing.syncBaseUrl,
      deviceId: pairing.deviceId,
      deviceName: pairing.deviceName,
      deviceToken: pairing.deviceToken,
      lastPairingCode: pairingCode,
      machineId: pairing.machineId,
      pairedAt: new Date().toISOString()
    });
    await this.logStore.write("info", `Device paired as ${pairing.deviceName}.`);

    return this.getStatus();
  }

  async clearPairing() {
    const config = await this.configStore.read();
    await this.configStore.write({
      apiBaseUrl: config.apiBaseUrl,
      appVersion: config.appVersion
    });
    await this.logStore.write("warn", "Pairing cleared locally.");
    return this.getStatus();
  }

  async runScan() {
    const config = await this.configStore.read();
    const scan = await this.scanService.runFullScan(config);
    await this.scanCache.write(scan);
    await this.configStore.write({
      ...config,
      lastScanAt: scan.scannedAt,
      machineId: scan.machineId
    });
    await this.logStore.write("info", `Local scan completed with ${scan.apps.length} applications.`);
    return scan;
  }

  async getLastScan() {
    return this.scanCache.read();
  }

  async syncLastScan() {
    const config = await this.configStore.read();
    const scan = await this.scanCache.read();
    if (!scan) {
      throw new Error("Run a local scan before syncing.");
    }

    const response = await this.syncService.syncScan(config, scan);
    await this.configStore.write({
      ...config,
      lastSyncAt: response.ingestedAt
    });
    await this.logStore.write("info", `Sync accepted at ${response.ingestedAt}.`);
    return response;
  }

  async getLogs() {
    return this.logStore.tail();
  }
}
