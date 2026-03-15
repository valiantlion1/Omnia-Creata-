import type { Recommendation } from "@omnia-watch/types";
import type { AgentConfig, AgentScanResult } from "@shared/contracts";
import { collectApplications } from "@main/collectors/apps";
import { collectCleanupCandidates } from "@main/collectors/cleanup";
import { collectDeviceIdentity } from "@main/collectors/device";
import { collectHealthSummary } from "@main/collectors/health";
import { collectSecuritySignals } from "@main/collectors/security";
import { collectStartupItems } from "@main/collectors/startup";

const UNPAIRED_DEVICE_ID = "00000000-0000-0000-0000-000000000000";

export class ScanService {
  async runFullScan(config: AgentConfig): Promise<AgentScanResult> {
    const [deviceIdentity, health] = await Promise.all([
      collectDeviceIdentity(),
      collectHealthSummary()
    ]);

    const deviceId = config.deviceId ?? UNPAIRED_DEVICE_ID;

    const [apps, cleanup, startup, security] = await Promise.all([
      collectApplications(deviceId),
      collectCleanupCandidates(deviceId),
      collectStartupItems(deviceId),
      collectSecuritySignals(deviceId)
    ]);

    return {
      apps,
      cleanup,
      deviceId,
      health,
      machineId: config.machineId ?? deviceIdentity.machineId,
      recommendations: buildRecommendations(deviceId, apps, cleanup, startup, security),
      scannedAt: new Date().toISOString(),
      security,
      startup
    };
  }
}

function buildRecommendations(
  deviceId: string,
  apps: AgentScanResult["apps"],
  cleanup: AgentScanResult["cleanup"],
  startup: AgentScanResult["startup"],
  security: AgentScanResult["security"]
): Recommendation[] {
  const items: Recommendation[] = [];
  const now = new Date().toISOString();
  const updatableApps = apps.filter((item) => item.status === "updatable");
  const cleanupBytes = cleanup.reduce((total, item) => total + item.estimatedBytes, 0);
  const heavyStartup = startup.filter((item) => item.enabled && item.impact === "high");
  const riskySecurity = security.filter((item) => item.status === "critical" || item.status === "warning");

  if (updatableApps.length > 0) {
    items.push({
      actionLabel: "Review updates",
      actionPath: "/app/applications?status=updatable",
      category: "updates",
      createdAt: now,
      deviceId,
      id: `${deviceId}-rec-updates`,
      resolvedAt: null,
      severity: updatableApps.length > 5 ? "critical" : "high",
      summary: `${updatableApps.length} applications have safe or probable update paths available.`,
      title: "Updates are waiting"
    });
  }

  if (cleanupBytes > 1024 * 1024 * 1024) {
    items.push({
      actionLabel: "Review cleanup",
      actionPath: `/app/devices/${deviceId}`,
      category: "cleanup",
      createdAt: now,
      deviceId,
      id: `${deviceId}-rec-cleanup`,
      resolvedAt: null,
      severity: "medium",
      summary: "The device has more than 1 GB of reclaimable safe cleanup volume.",
      title: "Cleanup opportunity detected"
    });
  }

  if (heavyStartup.length > 0) {
    items.push({
      actionLabel: "Check startup",
      actionPath: `/app/devices/${deviceId}`,
      category: "startup",
      createdAt: now,
      deviceId,
      id: `${deviceId}-rec-startup`,
      resolvedAt: null,
      severity: "medium",
      summary: `${heavyStartup.length} startup entries may be slowing boot experience.`,
      title: "Startup load looks heavy"
    });
  }

  if (riskySecurity.length > 0) {
    items.push({
      actionLabel: "Review security",
      actionPath: `/app/devices/${deviceId}`,
      category: "security",
      createdAt: now,
      deviceId,
      id: `${deviceId}-rec-security`,
      resolvedAt: null,
      severity: riskySecurity.some((item) => item.status === "critical") ? "critical" : "high",
      summary: "One or more security signals need review before the device can be considered healthy.",
      title: "Security posture requires attention"
    });
  }

  return items;
}
