export const locales = ["en", "tr"] as const;
export type Locale = (typeof locales)[number];

export const planCodes = ["free", "pro", "team"] as const;
export type PlanCode = (typeof planCodes)[number];

export const deviceStatuses = ["healthy", "attention", "critical", "offline"] as const;
export type DeviceStatus = (typeof deviceStatuses)[number];

export const recommendationSeverities = ["low", "medium", "high", "critical"] as const;
export type RecommendationSeverity = (typeof recommendationSeverities)[number];

export const recommendationCategories = [
  "updates",
  "cleanup",
  "startup",
  "security",
  "health",
  "sync"
] as const;
export type RecommendationCategory = (typeof recommendationCategories)[number];

export const sourceKinds = [
  "winget",
  "msstore",
  "steam",
  "epic",
  "ea",
  "gog",
  "vendor",
  "portable",
  "unknown"
] as const;
export type SourceKind = (typeof sourceKinds)[number];

export const appInventoryStatuses = [
  "current",
  "updatable",
  "manual",
  "unsupported",
  "error",
  "ignored"
] as const;
export type AppInventoryStatus = (typeof appInventoryStatuses)[number];

export const appActionTypes = [
  "automatic",
  "manual",
  "none",
  "pending"
] as const;
export type AppActionType = (typeof appActionTypes)[number];

export const cleanupCategories = [
  "windows-temp",
  "temp-files",
  "recycle-bin",
  "browser-cache",
  "update-leftovers",
  "logs"
] as const;
export type CleanupCategory = (typeof cleanupCategories)[number];

export const startupImpactLevels = ["low", "medium", "high", "unknown"] as const;
export type StartupImpactLevel = (typeof startupImpactLevels)[number];

export const operationTypes = [
  "scan",
  "sync",
  "update",
  "cleanup",
  "startup-change",
  "pairing",
  "security-check"
] as const;
export type OperationType = (typeof operationTypes)[number];

export const operationStatuses = ["success", "partial", "failed", "running"] as const;
export type OperationStatus = (typeof operationStatuses)[number];

export interface DeviceHealthSummary {
  cpuUsagePercent: number;
  diskPressurePercent: number;
  memoryUsagePercent: number;
  osVersion: string;
  storageUsedBytes: number;
  storageTotalBytes: number;
  uptimeHours: number;
}

export interface DeviceSummary {
  id: string;
  userId: string;
  name: string;
  platform: "windows";
  osVersion: string;
  status: DeviceStatus;
  lastSeenAt: string;
  lastScanAt: string;
  issueCount: number;
  attentionScore: number;
  latestHealth: DeviceHealthSummary;
}

export interface SoftwareInventoryItem {
  id: string;
  deviceId: string;
  appId: string;
  displayName: string;
  normalizedName: string;
  publisher: string | null;
  installedVersion: string;
  availableVersion: string | null;
  sourceKind: SourceKind;
  detectionMethod: string;
  installPath: string | null;
  status: AppInventoryStatus;
  actionType: AppActionType;
  lastCheckedAt: string;
  updateConfidence: number | null;
  notes: string | null;
  technicalDetails: Record<string, string | number | boolean | null>;
}

export interface CleanupCandidate {
  id: string;
  deviceId: string;
  category: CleanupCategory;
  label: string;
  estimatedBytes: number;
  selectedByDefault: boolean;
  safetyLevel: "safe" | "review";
}

export interface StartupItem {
  id: string;
  deviceId: string;
  name: string;
  command: string;
  enabled: boolean;
  impact: StartupImpactLevel;
  source: string;
}

export interface SecuritySignal {
  id: string;
  deviceId: string;
  key: string;
  label: string;
  status: "ok" | "warning" | "critical" | "unknown";
  detail: string;
}

export interface Recommendation {
  id: string;
  deviceId: string;
  severity: RecommendationSeverity;
  category: RecommendationCategory;
  title: string;
  summary: string;
  actionLabel: string;
  actionPath: string;
  createdAt: string;
  resolvedAt: string | null;
}

export interface ActivityEvent {
  id: string;
  deviceId: string;
  type: OperationType;
  status: OperationStatus;
  title: string;
  summary: string;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface DeviceScanSnapshot {
  id: string;
  deviceId: string;
  createdAt: string;
  appItems: SoftwareInventoryItem[];
  cleanupItems: CleanupCandidate[];
  startupItems: StartupItem[];
  securityItems: SecuritySignal[];
  healthSummary: DeviceHealthSummary;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  companyName: string;
}

export interface UserPreferences {
  locale: Locale;
  marketingEmails: boolean;
  recommendationDigest: boolean;
  releaseChannel: "stable" | "preview";
}

export interface PlanSummary {
  code: PlanCode;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  highlighted?: boolean;
  featureKeys: string[];
}

export interface DashboardSnapshot {
  user: UserProfile;
  preferences: UserPreferences;
  plan: PlanSummary;
  devices: DeviceSummary[];
  recommendations: Recommendation[];
  activity: ActivityEvent[];
  latestScan: DeviceScanSnapshot;
}

export interface PairingStartRequest {
  nickname: string;
  locale: Locale;
}

export interface PairingStartResponse {
  pairingCode: string;
  expiresAt: string;
  supportLink: string;
}

export interface PairingCompleteRequest {
  pairingCode: string;
  deviceName: string;
  machineId: string;
  platform: "windows";
  osVersion: string;
  appVersion: string;
}

export interface PairingCompleteResponse {
  deviceId: string;
  deviceToken: string;
  syncBaseUrl: string;
}

export interface DeviceSyncPayload {
  deviceId: string;
  machineId: string;
  scannedAt: string;
  apps: SoftwareInventoryItem[];
  cleanup: CleanupCandidate[];
  startup: StartupItem[];
  security: SecuritySignal[];
  health: DeviceHealthSummary;
  recommendations: Recommendation[];
}
