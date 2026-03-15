import { z } from "zod";
import {
  appActionTypes,
  appInventoryStatuses,
  cleanupCategories,
  deviceStatuses,
  locales,
  operationStatuses,
  operationTypes,
  recommendationCategories,
  recommendationSeverities,
  sourceKinds,
  startupImpactLevels
} from "@omnia-watch/types";

export const localeSchema = z.enum(locales);
export const deviceStatusSchema = z.enum(deviceStatuses);
export const recommendationSeveritySchema = z.enum(recommendationSeverities);
export const recommendationCategorySchema = z.enum(recommendationCategories);
export const sourceKindSchema = z.enum(sourceKinds);
export const appInventoryStatusSchema = z.enum(appInventoryStatuses);
export const appActionTypeSchema = z.enum(appActionTypes);
export const cleanupCategorySchema = z.enum(cleanupCategories);
export const startupImpactLevelSchema = z.enum(startupImpactLevels);
export const operationTypeSchema = z.enum(operationTypes);
export const operationStatusSchema = z.enum(operationStatuses);

export const deviceHealthSummarySchema = z.object({
  cpuUsagePercent: z.number().min(0).max(100),
  diskPressurePercent: z.number().min(0).max(100),
  memoryUsagePercent: z.number().min(0).max(100),
  osVersion: z.string().min(1),
  storageUsedBytes: z.number().min(0),
  storageTotalBytes: z.number().min(0),
  uptimeHours: z.number().min(0)
});

export const softwareInventoryItemSchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
  appId: z.string().min(1),
  displayName: z.string().min(1),
  normalizedName: z.string().min(1),
  publisher: z.string().nullable(),
  installedVersion: z.string().min(1),
  availableVersion: z.string().nullable(),
  sourceKind: sourceKindSchema,
  detectionMethod: z.string().min(1),
  installPath: z.string().nullable(),
  status: appInventoryStatusSchema,
  actionType: appActionTypeSchema,
  lastCheckedAt: z.string().datetime(),
  updateConfidence: z.number().min(0).max(1).nullable(),
  notes: z.string().nullable(),
  technicalDetails: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()]))
});

export const cleanupCandidateSchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
  category: cleanupCategorySchema,
  label: z.string().min(1),
  estimatedBytes: z.number().min(0),
  selectedByDefault: z.boolean(),
  safetyLevel: z.enum(["safe", "review"])
});

export const startupItemSchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
  name: z.string().min(1),
  command: z.string().min(1),
  enabled: z.boolean(),
  impact: startupImpactLevelSchema,
  source: z.string().min(1)
});

export const securitySignalSchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
  key: z.string().min(1),
  label: z.string().min(1),
  status: z.enum(["ok", "warning", "critical", "unknown"]),
  detail: z.string().min(1)
});

export const recommendationSchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
  severity: recommendationSeveritySchema,
  category: recommendationCategorySchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  actionLabel: z.string().min(1),
  actionPath: z.string().min(1),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().nullable()
});

export const activityEventSchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
  type: operationTypeSchema,
  status: operationStatusSchema,
  title: z.string().min(1),
  summary: z.string().min(1),
  createdAt: z.string().datetime(),
  metadata: z.record(z.union([z.string(), z.number(), z.boolean(), z.null()])).optional()
});

export const deviceSummarySchema = z.object({
  id: z.string().min(1),
  userId: z.string().min(1),
  name: z.string().min(1),
  platform: z.literal("windows"),
  osVersion: z.string().min(1),
  status: deviceStatusSchema,
  lastSeenAt: z.string().datetime(),
  lastScanAt: z.string().datetime(),
  issueCount: z.number().min(0),
  attentionScore: z.number().min(0).max(100),
  latestHealth: deviceHealthSummarySchema
});

export const deviceScanSnapshotSchema = z.object({
  id: z.string().min(1),
  deviceId: z.string().min(1),
  createdAt: z.string().datetime(),
  appItems: z.array(softwareInventoryItemSchema),
  cleanupItems: z.array(cleanupCandidateSchema),
  startupItems: z.array(startupItemSchema),
  securityItems: z.array(securitySignalSchema),
  healthSummary: deviceHealthSummarySchema
});

export const pairingStartRequestSchema = z.object({
  nickname: z.string().min(2).max(48),
  locale: localeSchema
});

export const pairingStartResponseSchema = z.object({
  pairingCode: z.string().regex(/^OW-[A-Z0-9]{6}$/),
  expiresAt: z.string().datetime(),
  supportLink: z.string().url()
});

export const pairingCompleteRequestSchema = z.object({
  pairingCode: pairingStartResponseSchema.shape.pairingCode,
  deviceName: z.string().min(2).max(96),
  machineId: z.string().min(3).max(256),
  platform: z.literal("windows"),
  osVersion: z.string().min(1),
  appVersion: z.string().min(1)
});

export const pairingCompleteResponseSchema = z.object({
  deviceId: z.string().uuid(),
  deviceToken: z.string().min(32),
  syncBaseUrl: z.string().url()
});

export const deviceSyncPayloadSchema = z.object({
  deviceId: z.string().uuid(),
  machineId: z.string().min(3).max(256),
  scannedAt: z.string().datetime(),
  apps: z.array(softwareInventoryItemSchema),
  cleanup: z.array(cleanupCandidateSchema),
  startup: z.array(startupItemSchema),
  security: z.array(securitySignalSchema),
  health: deviceHealthSummarySchema,
  recommendations: z.array(recommendationSchema)
});

export const deviceSyncResponseSchema = z.object({
  accepted: z.boolean(),
  ingestedAt: z.string().datetime(),
  recommendationCount: z.number().min(0)
});
