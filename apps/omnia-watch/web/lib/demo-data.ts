import type {
  ActivityEvent,
  CleanupCandidate,
  DashboardSnapshot,
  DeviceScanSnapshot,
  DeviceSummary,
  Recommendation,
  SoftwareInventoryItem,
  StartupItem
} from "@omnia-watch/types";

const devices: DeviceSummary[] = [
  {
    attentionScore: 34,
    id: "9b8014b5-88ab-4d57-8132-4c4fb7c55101",
    issueCount: 3,
    lastScanAt: "2026-03-14T08:05:00.000Z",
    lastSeenAt: "2026-03-14T08:08:00.000Z",
    latestHealth: {
      cpuUsagePercent: 18,
      diskPressurePercent: 61,
      memoryUsagePercent: 57,
      osVersion: "Windows 11 Pro 24H2",
      storageTotalBytes: 1000204886016,
      storageUsedBytes: 610124886016,
      uptimeHours: 112
    },
    name: "Studio Tower",
    osVersion: "Windows 11 Pro 24H2",
    platform: "windows",
    status: "healthy",
    userId: "9c95fce0-1f97-41b0-b7f3-0f0b80fd0981"
  },
  {
    attentionScore: 68,
    id: "91c0d60c-c1b9-40af-bcaf-b65ecfd7df03",
    issueCount: 6,
    lastScanAt: "2026-03-14T06:42:00.000Z",
    lastSeenAt: "2026-03-14T06:48:00.000Z",
    latestHealth: {
      cpuUsagePercent: 27,
      diskPressurePercent: 83,
      memoryUsagePercent: 71,
      osVersion: "Windows 11 Home 24H2",
      storageTotalBytes: 512110190592,
      storageUsedBytes: 425910190592,
      uptimeHours: 19
    },
    name: "Travel Surface",
    osVersion: "Windows 11 Home 24H2",
    platform: "windows",
    status: "attention",
    userId: "9c95fce0-1f97-41b0-b7f3-0f0b80fd0981"
  },
  {
    attentionScore: 89,
    id: "a6159cbf-ea22-4f7c-98ee-61a4eb176efa",
    issueCount: 7,
    lastScanAt: "2026-03-07T21:30:00.000Z",
    lastSeenAt: "2026-03-07T21:35:00.000Z",
    latestHealth: {
      cpuUsagePercent: 9,
      diskPressurePercent: 74,
      memoryUsagePercent: 46,
      osVersion: "Windows 10 Pro 22H2",
      storageTotalBytes: 512110190592,
      storageUsedBytes: 381110190592,
      uptimeHours: 240
    },
    name: "Family Office",
    osVersion: "Windows 10 Pro 22H2",
    platform: "windows",
    status: "offline",
    userId: "9c95fce0-1f97-41b0-b7f3-0f0b80fd0981"
  }
];

const studioTower = devices[0];
const travelSurface = devices[1];
const familyOffice = devices[2];

if (!studioTower || !travelSurface || !familyOffice) {
  throw new Error("Demo devices are not initialized correctly.");
}

const apps: SoftwareInventoryItem[] = [
  {
    actionType: "automatic",
    appId: "Google.Chrome",
    availableVersion: null,
    detectionMethod: "registry",
    deviceId: studioTower.id,
    displayName: "Google Chrome",
    id: "app-1",
    installPath: "C:\\Program Files\\Google\\Chrome\\Application",
    installedVersion: "134.0.6998.89",
    lastCheckedAt: "2026-03-14T08:05:00.000Z",
    normalizedName: "google-chrome",
    notes: null,
    publisher: "Google LLC",
    sourceKind: "winget",
    status: "current",
    technicalDetails: {
      matchType: "exact"
    },
    updateConfidence: 0.98
  },
  {
    actionType: "automatic",
    appId: "Microsoft.VisualStudioCode",
    availableVersion: "1.99.0",
    detectionMethod: "registry",
    deviceId: studioTower.id,
    displayName: "Visual Studio Code",
    id: "app-2",
    installPath: "C:\\Users\\Aylin\\AppData\\Local\\Programs\\Microsoft VS Code",
    installedVersion: "1.98.2",
    lastCheckedAt: "2026-03-14T08:05:00.000Z",
    normalizedName: "visual-studio-code",
    notes: "Safe winget update available.",
    publisher: "Microsoft Corporation",
    sourceKind: "winget",
    status: "updatable",
    technicalDetails: {
      wingetId: "Microsoft.VisualStudioCode"
    },
    updateConfidence: 0.95
  },
  {
    actionType: "manual",
    appId: "Discord.Discord",
    availableVersion: "Stable current unknown",
    detectionMethod: "registry",
    deviceId: studioTower.id,
    displayName: "Discord",
    id: "app-3",
    installPath: "C:\\Users\\Aylin\\AppData\\Local\\Discord",
    installedVersion: "1.0.9182",
    lastCheckedAt: "2026-03-14T08:05:00.000Z",
    normalizedName: "discord",
    notes: "Vendor-managed update channel.",
    publisher: "Discord Inc.",
    sourceKind: "vendor",
    status: "manual",
    technicalDetails: {
      reason: "self-updating"
    },
    updateConfidence: 0.55
  },
  {
    actionType: "automatic",
    appId: "VideoLAN.VLC",
    availableVersion: "3.0.22",
    detectionMethod: "registry",
    deviceId: travelSurface.id,
    displayName: "VLC media player",
    id: "app-4",
    installPath: "C:\\Program Files\\VideoLAN\\VLC",
    installedVersion: "3.0.21",
    lastCheckedAt: "2026-03-14T06:42:00.000Z",
    normalizedName: "vlc-media-player",
    notes: null,
    publisher: "VideoLAN",
    sourceKind: "winget",
    status: "updatable",
    technicalDetails: {
      wingetId: "VideoLAN.VLC"
    },
    updateConfidence: 0.93
  },
  {
    actionType: "automatic",
    appId: "Zoom.Zoom",
    availableVersion: "6.0.1",
    detectionMethod: "registry",
    deviceId: travelSurface.id,
    displayName: "Zoom Workplace",
    id: "app-5",
    installPath: "C:\\Users\\Aylin\\AppData\\Roaming\\Zoom",
    installedVersion: "5.17.7",
    lastCheckedAt: "2026-03-14T06:42:00.000Z",
    normalizedName: "zoom-workplace",
    notes: "Update pending approval.",
    publisher: "Zoom Communications, Inc.",
    sourceKind: "winget",
    status: "updatable",
    technicalDetails: {
      wingetId: "Zoom.Zoom"
    },
    updateConfidence: 0.89
  },
  {
    actionType: "manual",
    appId: "Notion.Notion",
    availableVersion: null,
    detectionMethod: "registry",
    deviceId: travelSurface.id,
    displayName: "Notion",
    id: "app-6",
    installPath: "C:\\Users\\Aylin\\AppData\\Local\\Programs\\Notion",
    installedVersion: "3.12.0",
    lastCheckedAt: "2026-03-14T06:42:00.000Z",
    normalizedName: "notion",
    notes: "App manages its own update channel.",
    publisher: "Notion Labs, Inc.",
    sourceKind: "vendor",
    status: "manual",
    technicalDetails: {
      reason: "self-managed"
    },
    updateConfidence: 0.48
  },
  {
    actionType: "none",
    appId: "Legacy.Backup.Client",
    availableVersion: null,
    detectionMethod: "registry",
    deviceId: familyOffice.id,
    displayName: "Legacy Backup Client",
    id: "app-7",
    installPath: "C:\\Program Files\\Legacy Backup",
    installedVersion: "4.1.2",
    lastCheckedAt: "2026-03-07T21:30:00.000Z",
    normalizedName: "legacy-backup-client",
    notes: "Unsupported vendor package.",
    publisher: "Legacy Systems Ltd.",
    sourceKind: "unknown",
    status: "unsupported",
    technicalDetails: {
      reason: "no package metadata"
    },
    updateConfidence: 0.1
  },
  {
    actionType: "automatic",
    appId: "Git.Git",
    availableVersion: null,
    detectionMethod: "registry",
    deviceId: travelSurface.id,
    displayName: "Git",
    id: "app-8",
    installPath: "C:\\Program Files\\Git",
    installedVersion: "2.49.0",
    lastCheckedAt: "2026-03-14T06:42:00.000Z",
    normalizedName: "git",
    notes: null,
    publisher: "The Git Development Community",
    sourceKind: "winget",
    status: "current",
    technicalDetails: {
      wingetId: "Git.Git"
    },
    updateConfidence: 0.97
  }
];

const cleanupItems: CleanupCandidate[] = [
  {
    category: "temp-files",
    deviceId: studioTower.id,
    estimatedBytes: 680_000_000,
    id: "cleanup-1",
    label: "User temp files",
    safetyLevel: "safe",
    selectedByDefault: true
  },
  {
    category: "recycle-bin",
    deviceId: studioTower.id,
    estimatedBytes: 1_400_000_000,
    id: "cleanup-2",
    label: "Recycle Bin",
    safetyLevel: "review",
    selectedByDefault: false
  },
  {
    category: "windows-temp",
    deviceId: travelSurface.id,
    estimatedBytes: 1_900_000_000,
    id: "cleanup-3",
    label: "Windows temp",
    safetyLevel: "safe",
    selectedByDefault: true
  },
  {
    category: "browser-cache",
    deviceId: travelSurface.id,
    estimatedBytes: 520_000_000,
    id: "cleanup-4",
    label: "Browser cache",
    safetyLevel: "safe",
    selectedByDefault: true
  }
];

const startupItems: StartupItem[] = [
  {
    command: "\"C:\\Users\\Aylin\\AppData\\Local\\Discord\\Update.exe\" --processStart Discord.exe",
    deviceId: studioTower.id,
    enabled: true,
    id: "startup-1",
    impact: "high",
    name: "Discord",
    source: "Registry Run"
  },
  {
    command: "\"C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe\" /background",
    deviceId: travelSurface.id,
    enabled: true,
    id: "startup-2",
    impact: "medium",
    name: "OneDrive",
    source: "Registry Run"
  },
  {
    command: "\"C:\\Program Files (x86)\\Steam\\steam.exe\" -silent",
    deviceId: travelSurface.id,
    enabled: false,
    id: "startup-3",
    impact: "low",
    name: "Steam",
    source: "Startup folder"
  }
];

const recommendations: Recommendation[] = [
  {
    actionLabel: "Review apps",
    actionPath: "/app/applications?status=updatable",
    category: "updates",
    createdAt: "2026-03-14T08:06:00.000Z",
    deviceId: travelSurface.id,
    id: "rec-1",
    resolvedAt: null,
    severity: "high",
    summary: "Travel Surface has 2 applications ready for controlled updates.",
    title: "Multiple app updates available"
  },
  {
    actionLabel: "Review cleanup",
    actionPath: `/app/devices/${travelSurface.id}`,
    category: "cleanup",
    createdAt: "2026-03-14T06:44:00.000Z",
    deviceId: travelSurface.id,
    id: "rec-2",
    resolvedAt: null,
    severity: "medium",
    summary: "An estimated 2.4 GB can be reclaimed safely on Travel Surface.",
    title: "Cleanup opportunity detected"
  },
  {
    actionLabel: "Check security",
    actionPath: `/app/devices/${familyOffice.id}`,
    category: "security",
    createdAt: "2026-03-07T21:31:00.000Z",
    deviceId: familyOffice.id,
    id: "rec-3",
    resolvedAt: null,
    severity: "critical",
    summary: "Family Office has stale sync data and reported a disabled Defender state.",
    title: "Security posture needs review"
  }
];

const activity: ActivityEvent[] = [
  {
    createdAt: "2026-03-14T08:06:00.000Z",
    deviceId: studioTower.id,
    id: "act-1",
    status: "success",
    summary: "Studio Tower completed a full maintenance scan and synchronized 4 modules.",
    title: "Full scan synced",
    type: "sync"
  },
  {
    createdAt: "2026-03-14T06:44:00.000Z",
    deviceId: travelSurface.id,
    id: "act-2",
    status: "partial",
    summary: "Travel Surface matched 2 winget updates and flagged 1 manual package.",
    title: "Application inventory refreshed",
    type: "scan"
  },
  {
    createdAt: "2026-03-07T21:31:00.000Z",
    deviceId: familyOffice.id,
    id: "act-3",
    status: "failed",
    summary: "Family Office has not synced recently and requires local attention.",
    title: "Device fell behind",
    type: "sync"
  }
];

const scanSnapshots: Record<string, DeviceScanSnapshot> = {
  [studioTower.id]: {
    appItems: apps.filter((app) => app.deviceId === studioTower.id),
    cleanupItems: cleanupItems.filter((item) => item.deviceId === studioTower.id),
    createdAt: "2026-03-14T08:05:00.000Z",
    deviceId: studioTower.id,
    healthSummary: studioTower.latestHealth,
    id: "scan-1",
    securityItems: [
      {
        detail: "Real-time protection is enabled.",
        deviceId: studioTower.id,
        id: "sec-1",
        key: "defender",
        label: "Windows Defender",
        status: "ok"
      },
      {
        detail: "Firewall is enabled for all profiles.",
        deviceId: studioTower.id,
        id: "sec-2",
        key: "firewall",
        label: "Firewall",
        status: "ok"
      }
    ],
    startupItems: startupItems.filter((item) => item.deviceId === studioTower.id)
  },
  [travelSurface.id]: {
    appItems: apps.filter((app) => app.deviceId === travelSurface.id),
    cleanupItems: cleanupItems.filter((item) => item.deviceId === travelSurface.id),
    createdAt: "2026-03-14T06:42:00.000Z",
    deviceId: travelSurface.id,
    healthSummary: travelSurface.latestHealth,
    id: "scan-2",
    securityItems: [
      {
        detail: "Windows Defender is enabled, definitions updated yesterday.",
        deviceId: travelSurface.id,
        id: "sec-3",
        key: "defender",
        label: "Windows Defender",
        status: "ok"
      },
      {
        detail: "Windows Update reports a pending restart.",
        deviceId: travelSurface.id,
        id: "sec-4",
        key: "windows-update",
        label: "Windows Update",
        status: "warning"
      }
    ],
    startupItems: startupItems.filter((item) => item.deviceId === travelSurface.id)
  },
  [familyOffice.id]: {
    appItems: apps.filter((app) => app.deviceId === familyOffice.id),
    cleanupItems: [],
    createdAt: "2026-03-07T21:30:00.000Z",
    deviceId: familyOffice.id,
    healthSummary: familyOffice.latestHealth,
    id: "scan-3",
    securityItems: [
      {
        detail: "Defender reported disabled during the last successful scan.",
        deviceId: familyOffice.id,
        id: "sec-5",
        key: "defender",
        label: "Windows Defender",
        status: "critical"
      }
    ],
    startupItems: []
  }
};

export const demoDashboard: DashboardSnapshot = {
  activity,
  devices,
  latestScan: scanSnapshots[studioTower.id]!,
  plan: {
    code: "pro",
    featureKeys: [
      "multi-device",
      "app-intelligence",
      "priority-recommendations",
      "scheduled-scans"
    ],
    highlighted: true,
    monthlyPrice: 12,
    name: "Pro",
    yearlyPrice: 120
  },
  preferences: {
    locale: "en",
    marketingEmails: false,
    recommendationDigest: true,
    releaseChannel: "stable"
  },
  recommendations,
  user: {
    companyName: "Omnia Creata Early Access",
    email: "aylin@omniacreata.com",
    fullName: "Aylin Kara",
    id: "9c95fce0-1f97-41b0-b7f3-0f0b80fd0981"
  }
};

export function getDevices() {
  return devices;
}

export function getDeviceById(deviceId: string) {
  return devices.find((device) => device.id === deviceId) ?? null;
}

export function getApps(deviceId?: string) {
  return deviceId ? apps.filter((app) => app.deviceId === deviceId) : apps;
}

export function getCleanup(deviceId?: string) {
  return deviceId ? cleanupItems.filter((item) => item.deviceId === deviceId) : cleanupItems;
}

export function getStartup(deviceId?: string) {
  return deviceId ? startupItems.filter((item) => item.deviceId === deviceId) : startupItems;
}

export function getRecommendations(deviceId?: string) {
  return deviceId
    ? recommendations.filter((item) => item.deviceId === deviceId)
    : recommendations;
}

export function getActivity(deviceId?: string) {
  return deviceId ? activity.filter((item) => item.deviceId === deviceId) : activity;
}

export function getScanSnapshot(deviceId: string) {
  return scanSnapshots[deviceId] ?? null;
}
