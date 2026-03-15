import type { DeviceSyncPayload, PairingCompleteRequest, PairingStartRequest } from "@omnia-watch/types";
import {
  deviceSyncResponseSchema,
  pairingCompleteResponseSchema,
  pairingStartResponseSchema
} from "@omnia-watch/validation";
import { isDevicePipelineConfigured } from "@/lib/runtime";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createDeviceToken, createPairingCode, hashDeviceCredential } from "./crypto";

const PAIRING_WINDOW_MS = 1000 * 60 * 30;
const MAX_PAIRING_ATTEMPTS = 3;

interface DevicePairingRow {
  device_id: string;
  id: string;
  metadata: Record<string, unknown> | null;
  owner_id: string;
  pairing_expires_at: string | null;
}

interface DeviceRow {
  id: string;
  machine_fingerprint: string | null;
  metadata: Record<string, unknown> | null;
  name: string;
}

interface SupabaseErrorLike {
  code?: string;
  message: string;
}

function getSupportLink() {
  return "https://omniacreata.com/omnia-watch/support";
}

function getSyncBaseUrl() {
  return (
    process.env.AGENT_SYNC_API_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  );
}

function createPairingExpiry() {
  return new Date(Date.now() + PAIRING_WINDOW_MS).toISOString();
}

function isUniqueConstraintError(error: SupabaseErrorLike | null | undefined) {
  return error?.code === "23505";
}

async function cleanupProvisionalDevice(deviceId: string) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    return;
  }

  await admin.from("devices").delete().eq("id", deviceId);
}

async function persistAuditEntries(operations: Array<PromiseLike<{ error: SupabaseErrorLike | null }>>) {
  const results = await Promise.allSettled(operations);

  results.forEach((result) => {
    if (result.status === "rejected") {
      console.error("Omnia Watch audit persistence failed.", result.reason);
      return;
    }

    if (result.value.error) {
      console.error("Omnia Watch audit persistence failed.", result.value.error.message);
    }
  });
}

function deriveAttentionScore(payload: DeviceSyncPayload) {
  const updatePressure = payload.apps.filter((item) => item.status === "updatable").length * 4;
  const securityPressure = payload.security.reduce((score, item) => {
    if (item.status === "critical") {
      return score + 28;
    }

    if (item.status === "warning") {
      return score + 12;
    }

    return score;
  }, 0);
  const startupPressure = payload.startup.filter((item) => item.enabled && item.impact === "high").length * 8;
  const cleanupPressure = payload.cleanup.reduce((score, item) => {
    return score + (item.estimatedBytes >= 1024 * 1024 * 1024 ? 6 : 0);
  }, 0);
  const recommendationPressure = payload.recommendations.length * 6;

  return Math.min(100, updatePressure + securityPressure + startupPressure + cleanupPressure + recommendationPressure);
}

function deriveDeviceStatus(payload: DeviceSyncPayload, attentionScore: number): "attention" | "critical" | "healthy" {
  if (payload.security.some((item) => item.status === "critical")) {
    return "critical";
  }

  if (attentionScore >= 35 || payload.recommendations.length > 0) {
    return "attention";
  }

  return "healthy";
}

function scanCounts(payload: DeviceSyncPayload) {
  return {
    appCount: payload.apps.length,
    cleanupCount: payload.cleanup.length,
    recommendationCount: payload.recommendations.length,
    securityCount: payload.security.length,
    startupCount: payload.startup.length,
    updatableAppCount: payload.apps.filter((item) => item.status === "updatable").length
  };
}

export function isLiveDevicePipelineReady() {
  return Boolean(isDevicePipelineConfigured() && createSupabaseAdminClient());
}

export async function startLivePairing(userId: string, payload: PairingStartRequest) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin credentials are not configured.");
  }

  for (let attempt = 1; attempt <= MAX_PAIRING_ATTEMPTS; attempt += 1) {
    const pairingCode = createPairingCode();
    const expiresAt = createPairingExpiry();

    const deviceResult = await admin
      .from("devices")
      .insert({
        attention_score: 0,
        issue_count: 0,
        metadata: {
          pairingLocale: payload.locale,
          pairingNickname: payload.nickname,
          pairingState: "pending"
        },
        name: payload.nickname,
        os_version: "Pending Windows pairing",
        owner_id: userId,
        platform: "windows",
        status: "offline"
      })
      .select("id")
      .single();

    if (deviceResult.error || !deviceResult.data) {
      throw new Error(deviceResult.error?.message ?? "Failed to create provisional device.");
    }

    const deviceId = deviceResult.data.id;
    const pairingResult = await admin.from("device_pairings").insert({
      device_id: deviceId,
      metadata: {
        requestedLocale: payload.locale
      },
      owner_id: userId,
      pairing_code_hash: hashDeviceCredential(pairingCode),
      pairing_expires_at: expiresAt
    });

    if (pairingResult.error) {
      await cleanupProvisionalDevice(deviceId);

      if (isUniqueConstraintError(pairingResult.error) && attempt < MAX_PAIRING_ATTEMPTS) {
        continue;
      }

      throw new Error(pairingResult.error.message);
    }

    await persistAuditEntries([
      admin.from("operation_logs").insert({
        device_id: deviceId,
        operation_type: "pairing",
        owner_id: userId,
        status: "running",
        summary: `Pairing code generated for ${payload.nickname}.`,
        technical_details: {
          expiresAt
        },
        title: "Pairing initiated"
      }),
      admin.from("activity_events").insert({
        device_id: deviceId,
        event_type: "pairing",
        metadata: {
          expiresAt
        },
        owner_id: userId,
        summary: `Pairing code generated for ${payload.nickname}.`,
        title: "Pairing initiated"
      })
    ]);

    return pairingStartResponseSchema.parse({
      expiresAt,
      pairingCode,
      supportLink: getSupportLink()
    });
  }

  throw new Error("Failed to create a unique pairing session.");
}

export async function completeLivePairing(payload: PairingCompleteRequest) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin credentials are not configured.");
  }

  const pairingResult = await admin
    .from("device_pairings")
    .select("id,owner_id,device_id,metadata,pairing_expires_at")
    .eq("pairing_code_hash", hashDeviceCredential(payload.pairingCode))
    .is("revoked_at", null)
    .is("paired_at", null)
    .gt("pairing_expires_at", new Date().toISOString())
    .maybeSingle();

  const pairing = (pairingResult.data as DevicePairingRow | null) ?? null;
  if (pairingResult.error || !pairing) {
    throw new Error("The pairing code is invalid, expired, or already used.");
  }

  const deviceToken = createDeviceToken();
  const now = new Date().toISOString();

  const deviceUpdateResult = await admin
    .from("devices")
    .update({
      last_seen_at: now,
      machine_fingerprint: payload.machineId,
      metadata: {
        ...(pairing.metadata ?? {}),
        appVersion: payload.appVersion,
        pairingCompletedAt: now
      },
      name: payload.deviceName,
      os_version: payload.osVersion,
      status: "attention"
    })
    .eq("id", pairing.device_id)
    .select("id")
    .single();

  if (deviceUpdateResult.error) {
    throw new Error(deviceUpdateResult.error.message);
  }

  const pairingUpdateResult = await admin
    .from("device_pairings")
    .update({
      consumed_at: now,
      device_token_hash: hashDeviceCredential(deviceToken),
      last_used_at: now,
      metadata: {
        ...(pairing.metadata ?? {}),
        appVersion: payload.appVersion,
        osVersion: payload.osVersion
      },
      paired_at: now
    })
    .eq("id", pairing.id);

  if (pairingUpdateResult.error) {
    throw new Error(pairingUpdateResult.error.message);
  }

  await persistAuditEntries([
    admin.from("operation_logs").insert({
      device_id: pairing.device_id,
      operation_type: "pairing",
      owner_id: pairing.owner_id,
      status: "success",
      summary: `${payload.deviceName} completed pairing successfully.`,
      technical_details: {
        appVersion: payload.appVersion,
        machineId: payload.machineId
      },
      title: "Device paired"
    }),
    admin.from("activity_events").insert({
      device_id: pairing.device_id,
      event_type: "pairing",
      metadata: {
        appVersion: payload.appVersion
      },
      owner_id: pairing.owner_id,
      summary: `${payload.deviceName} completed pairing successfully.`,
      title: "Device paired"
    })
  ]);

  return pairingCompleteResponseSchema.parse({
    deviceId: pairing.device_id,
    deviceToken,
    syncBaseUrl: getSyncBaseUrl()
  });
}

export async function ingestLiveDeviceSync(deviceToken: string, payload: DeviceSyncPayload) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase admin credentials are not configured.");
  }

  const pairingResult = await admin
    .from("device_pairings")
    .select("id,owner_id,device_id")
    .eq("device_token_hash", hashDeviceCredential(deviceToken))
    .is("revoked_at", null)
    .not("paired_at", "is", null)
    .maybeSingle();

  const pairing = (pairingResult.data as DevicePairingRow | null) ?? null;
  if (pairingResult.error || !pairing) {
    throw new Error("The device token is invalid or revoked.");
  }

  if (pairing.device_id !== payload.deviceId) {
    throw new Error("The provided device does not match the authenticated pairing.");
  }

  const deviceResult = await admin
    .from("devices")
    .select("id,name,machine_fingerprint,metadata")
    .eq("id", pairing.device_id)
    .maybeSingle();
  const device = (deviceResult.data as DeviceRow | null) ?? null;

  if (deviceResult.error || !device) {
    throw new Error("The paired device record could not be found.");
  }

  if (device.machine_fingerprint && device.machine_fingerprint !== payload.machineId) {
    throw new Error("This device token does not match the current machine fingerprint.");
  }

  const now = new Date().toISOString();
  const counts = scanCounts(payload);
  const attentionScore = deriveAttentionScore(payload);
  const status = deriveDeviceStatus(payload, attentionScore);

  const scanResult = await admin
    .from("device_scans")
    .insert({
      counts,
      device_id: pairing.device_id,
      health_summary: payload.health,
      owner_id: pairing.owner_id,
      scan_version: "1",
      scanned_at: payload.scannedAt,
      synced_at: now
    })
    .select("id")
    .single();

  if (scanResult.error || !scanResult.data) {
    throw new Error(scanResult.error?.message ?? "Failed to persist the scan envelope.");
  }

  const scanId = scanResult.data.id;

  if (payload.apps.length > 0) {
    const appsInsert = await admin.from("scan_app_items").insert(
      payload.apps.map((item) => ({
        action_type: item.actionType,
        app_id: item.appId,
        available_version: item.availableVersion,
        created_at: payload.scannedAt,
        detection_method: item.detectionMethod,
        device_id: pairing.device_id,
        display_name: item.displayName,
        install_path: item.installPath,
        installed_version: item.installedVersion,
        normalized_name: item.normalizedName,
        notes: item.notes,
        owner_id: pairing.owner_id,
        publisher: item.publisher,
        scan_id: scanId,
        source_kind: item.sourceKind,
        status: item.status,
        technical_details: item.technicalDetails,
        update_confidence: item.updateConfidence
      }))
    );

    if (appsInsert.error) {
      throw new Error(appsInsert.error.message);
    }
  }

  if (payload.cleanup.length > 0) {
    const cleanupInsert = await admin.from("scan_cleanup_items").insert(
      payload.cleanup.map((item) => ({
        category: item.category,
        device_id: pairing.device_id,
        estimated_bytes: item.estimatedBytes,
        label: item.label,
        owner_id: pairing.owner_id,
        safety_level: item.safetyLevel,
        scan_id: scanId,
        selected_by_default: item.selectedByDefault
      }))
    );

    if (cleanupInsert.error) {
      throw new Error(cleanupInsert.error.message);
    }
  }

  if (payload.startup.length > 0) {
    const startupInsert = await admin.from("scan_startup_items").insert(
      payload.startup.map((item) => ({
        command: item.command,
        device_id: pairing.device_id,
        enabled: item.enabled,
        impact: item.impact,
        name: item.name,
        owner_id: pairing.owner_id,
        scan_id: scanId,
        source: item.source
      }))
    );

    if (startupInsert.error) {
      throw new Error(startupInsert.error.message);
    }
  }

  if (payload.security.length > 0) {
    const securityInsert = await admin.from("scan_security_items").insert(
      payload.security.map((item) => ({
        detail: item.detail,
        device_id: pairing.device_id,
        label: item.label,
        owner_id: pairing.owner_id,
        scan_id: scanId,
        signal_key: item.key,
        status: item.status
      }))
    );

    if (securityInsert.error) {
      throw new Error(securityInsert.error.message);
    }
  }

  const resolvePreviousRecommendations = await admin
    .from("maintenance_recommendations")
    .update({ resolved_at: now })
    .eq("device_id", pairing.device_id)
    .is("resolved_at", null);

  if (resolvePreviousRecommendations.error) {
    throw new Error(resolvePreviousRecommendations.error.message);
  }

  if (payload.recommendations.length > 0) {
    const recommendationInsert = await admin.from("maintenance_recommendations").insert(
      payload.recommendations.map((item) => ({
        action_label: item.actionLabel,
        action_path: item.actionPath,
        category: item.category,
        created_at: item.createdAt,
        device_id: pairing.device_id,
        owner_id: pairing.owner_id,
        scan_id: scanId,
        severity: item.severity,
        summary: item.summary,
        title: item.title
      }))
    );

    if (recommendationInsert.error) {
      throw new Error(recommendationInsert.error.message);
    }
  }

  const deviceUpdate = await admin
    .from("devices")
    .update({
      attention_score: attentionScore,
      issue_count: payload.recommendations.length,
      last_scan_at: payload.scannedAt,
      last_seen_at: now,
      machine_fingerprint: payload.machineId,
      metadata: {
        ...(device.metadata ?? {}),
        lastAppCount: payload.apps.length,
        lastRecommendationCount: payload.recommendations.length,
        lastSyncedAt: now
      },
      os_version: payload.health.osVersion,
      status
    })
    .eq("id", pairing.device_id);

  if (deviceUpdate.error) {
    throw new Error(deviceUpdate.error.message);
  }

  const pairingUpdate = await admin
    .from("device_pairings")
    .update({
      last_used_at: now
    })
    .eq("id", pairing.id);

  if (pairingUpdate.error) {
    throw new Error(pairingUpdate.error.message);
  }

  await persistAuditEntries([
    admin.from("operation_logs").insert({
      device_id: pairing.device_id,
      operation_type: "sync",
      owner_id: pairing.owner_id,
      status: "success",
      summary: `${device.name} synced ${payload.apps.length} apps and ${payload.recommendations.length} recommendations.`,
      technical_details: counts,
      title: "Device sync accepted"
    }),
    admin.from("activity_events").insert({
      device_id: pairing.device_id,
      event_type: "sync",
      metadata: counts,
      owner_id: pairing.owner_id,
      summary: `${device.name} synced successfully.`,
      title: "Device sync accepted"
    })
  ]);

  return deviceSyncResponseSchema.parse({
    accepted: true,
    ingestedAt: now,
    recommendationCount: payload.recommendations.length
  });
}
