import type {
  CleanupCandidate,
  DeviceHealthSummary,
  Recommendation,
  SecuritySignal,
  SoftwareInventoryItem,
  StartupItem
} from "@omnia-watch/types";

export interface AgentConfig {
  apiBaseUrl: string;
  appVersion: string;
  deviceId?: string;
  deviceName?: string;
  deviceToken?: string;
  lastPairingCode?: string;
  lastScanAt?: string;
  lastSyncAt?: string;
  machineId?: string;
  pairedAt?: string;
}

export interface AgentScanResult {
  apps: SoftwareInventoryItem[];
  cleanup: CleanupCandidate[];
  deviceId: string;
  health: DeviceHealthSummary;
  machineId: string;
  recommendations: Recommendation[];
  scannedAt: string;
  security: SecuritySignal[];
  startup: StartupItem[];
}

export interface AgentStatus {
  apiBaseUrl: string;
  appVersion: string;
  deviceId?: string;
  deviceName?: string;
  lastScanAt?: string;
  lastSyncAt?: string;
  machineId?: string;
  paired: boolean;
}

export interface PairingResult {
  deviceId: string;
  deviceToken: string;
  syncBaseUrl: string;
}

export interface OmniaWatchBridge {
  clearPairing: () => Promise<AgentStatus>;
  getLogs: () => Promise<string[]>;
  getLastScan: () => Promise<AgentScanResult | null>;
  getStatus: () => Promise<AgentStatus>;
  pairWithCode: (pairingCode: string) => Promise<AgentStatus>;
  runScan: () => Promise<AgentScanResult>;
  syncLastScan: () => Promise<{ accepted: boolean; ingestedAt: string; recommendationCount: number }>;
}
