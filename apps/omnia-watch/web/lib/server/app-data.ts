import type {
  ActivityEvent,
  CleanupCandidate,
  DashboardSnapshot,
  DeviceHealthSummary,
  DeviceScanSnapshot,
  DeviceSummary,
  PlanSummary,
  Recommendation,
  SecuritySignal,
  SoftwareInventoryItem,
  StartupItem,
  UserPreferences,
  UserProfile
} from "@omnia-watch/types";
import { demoDashboard, getActivity, getApps, getCleanup, getDeviceById, getDevices, getRecommendations, getScanSnapshot, getStartup } from "@/lib/demo-data";
import type { ProductMode } from "@/lib/runtime";
import { requireAuthenticatedUser } from "./auth";

interface ProfileRow {
  company_name: string | null;
  email: string | null;
  full_name: string | null;
  id: string;
}

interface UserPreferencesRow {
  locale: "en" | "tr";
  marketing_emails: boolean;
  recommendation_digest: boolean;
  release_channel: "preview" | "stable";
  user_id: string;
}

interface PlanRow {
  id: "free" | "pro" | "team";
  metadata: Record<string, unknown> | null;
  monthly_price_cents: number;
  name: string;
  yearly_price_cents: number;
}

interface SubscriptionRow {
  plan_id: "free" | "pro" | "team";
  status: string;
  user_id: string;
}

interface DeviceRow {
  attention_score: number;
  id: string;
  issue_count: number;
  last_scan_at: string | null;
  last_seen_at: string | null;
  name: string;
  os_version: string;
  owner_id: string;
  platform: "windows";
  status: DeviceSummary["status"];
}

interface DeviceScanRow {
  counts: Record<string, number> | null;
  created_at: string;
  device_id: string;
  health_summary: Record<string, unknown> | null;
  id: string;
  scanned_at: string;
}

interface ScanAppItemRow {
  action_type: SoftwareInventoryItem["actionType"];
  app_id: string;
  available_version: string | null;
  created_at: string;
  detection_method: string;
  device_id: string;
  display_name: string;
  id: string;
  install_path: string | null;
  installed_version: string | null;
  normalized_name: string;
  notes: string | null;
  publisher: string | null;
  source_kind: SoftwareInventoryItem["sourceKind"];
  status: SoftwareInventoryItem["status"];
  technical_details: Record<string, string | number | boolean | null> | null;
  update_confidence: number | null;
}

interface ScanCleanupItemRow {
  category: CleanupCandidate["category"];
  device_id: string;
  estimated_bytes: number;
  id: string;
  label: string;
  safety_level: CleanupCandidate["safetyLevel"];
  selected_by_default: boolean;
}

interface ScanStartupItemRow {
  command: string;
  device_id: string;
  enabled: boolean;
  id: string;
  impact: StartupItem["impact"];
  name: string;
  source: string;
}

interface ScanSecurityItemRow {
  detail: string;
  device_id: string;
  id: string;
  label: string;
  signal_key: string;
  status: SecuritySignal["status"];
}

interface RecommendationRow {
  action_label: string;
  action_path: string;
  category: Recommendation["category"];
  created_at: string;
  device_id: string;
  id: string;
  resolved_at: string | null;
  severity: Recommendation["severity"];
  summary: string;
  title: string;
}

interface OperationLogRow {
  created_at: string;
  device_id: string | null;
  id: string;
  operation_type: ActivityEvent["type"];
  status: ActivityEvent["status"];
  summary: string;
  technical_details: Record<string, string | number | boolean | null> | null;
  title: string;
}

interface SupabaseQueryResult<T> {
  data: T | null;
  error: {
    message: string;
  } | null;
}

export interface AppShellState {
  mode: ProductMode;
  plan: PlanSummary;
  preferences: UserPreferences;
  user: UserProfile;
}

export interface DeviceDetailState {
  applications: SoftwareInventoryItem[];
  cleanup: CleanupCandidate[];
  device: DeviceSummary;
  recommendations: Recommendation[];
  scan: DeviceScanSnapshot | null;
  startup: StartupItem[];
}

export interface ApplicationsState {
  devices: DeviceSummary[];
  items: SoftwareInventoryItem[];
  shell: AppShellState;
}

const emptyHealth: DeviceHealthSummary = {
  cpuUsagePercent: 0,
  diskPressurePercent: 0,
  memoryUsagePercent: 0,
  osVersion: "Windows",
  storageTotalBytes: 0,
  storageUsedBytes: 0,
  uptimeHours: 0
};

const demoShell: AppShellState = {
  mode: "demo",
  plan: demoDashboard.plan,
  preferences: demoDashboard.preferences,
  user: demoDashboard.user
};

function unwrapSupabaseResult<T>(label: string, result: SupabaseQueryResult<T>) {
  if (result.error) {
    throw new Error(`Failed to ${label}: ${result.error.message}`);
  }

  return result.data;
}

function normalizeHealthSummary(input: Record<string, unknown> | null | undefined) {
  if (!input) {
    return emptyHealth;
  }

  return {
    cpuUsagePercent: Number(input.cpuUsagePercent ?? 0),
    diskPressurePercent: Number(input.diskPressurePercent ?? 0),
    memoryUsagePercent: Number(input.memoryUsagePercent ?? 0),
    osVersion: String(input.osVersion ?? "Windows"),
    storageTotalBytes: Number(input.storageTotalBytes ?? 0),
    storageUsedBytes: Number(input.storageUsedBytes ?? 0),
    uptimeHours: Number(input.uptimeHours ?? 0)
  } satisfies DeviceHealthSummary;
}

function defaultPlanSummary(): PlanSummary {
  return {
    code: "free",
    featureKeys: ["single-device", "dashboard-foundation"],
    monthlyPrice: 0,
    name: "Free",
    yearlyPrice: 0
  };
}

function mapPlan(plan: PlanRow | null): PlanSummary {
  if (!plan) {
    return defaultPlanSummary();
  }

  const metadata = plan.metadata ?? {};
  const featureKeys = Array.isArray(metadata.feature_keys)
    ? metadata.feature_keys.map((value) => String(value))
    : Array.isArray(metadata.features)
      ? metadata.features.map((value) => String(value))
      : [`${plan.id}-plan`];

  return {
    code: plan.id,
    featureKeys,
    monthlyPrice: plan.monthly_price_cents / 100,
    name: plan.name,
    yearlyPrice: plan.yearly_price_cents / 100
  };
}

function mapProfile(profile: ProfileRow | null, fallbackId: string, fallbackEmail: string | null): UserProfile {
  return {
    companyName: profile?.company_name ?? "",
    email: profile?.email ?? fallbackEmail ?? "",
    fullName: profile?.full_name ?? fallbackEmail?.split("@")[0] ?? "Omnia Watch user",
    id: profile?.id ?? fallbackId
  };
}

function mapPreferences(preferences: UserPreferencesRow | null): UserPreferences {
  return {
    locale: preferences?.locale ?? "en",
    marketingEmails: preferences?.marketing_emails ?? false,
    recommendationDigest: preferences?.recommendation_digest ?? true,
    releaseChannel: preferences?.release_channel ?? "stable"
  };
}

function mapDeviceSummary(device: DeviceRow, latestScan?: DeviceScanRow | null): DeviceSummary {
  const health = normalizeHealthSummary(latestScan?.health_summary);

  return {
    attentionScore: device.attention_score,
    id: device.id,
    issueCount: device.issue_count,
    lastScanAt: device.last_scan_at ?? latestScan?.scanned_at ?? device.last_seen_at ?? new Date(0).toISOString(),
    lastSeenAt: device.last_seen_at ?? latestScan?.created_at ?? new Date(0).toISOString(),
    latestHealth: health,
    name: device.name,
    osVersion: device.os_version,
    platform: "windows",
    status: device.status,
    userId: device.owner_id
  };
}

function mapRecommendation(item: RecommendationRow): Recommendation {
  return {
    actionLabel: item.action_label,
    actionPath: item.action_path,
    category: item.category,
    createdAt: item.created_at,
    deviceId: item.device_id,
    id: item.id,
    resolvedAt: item.resolved_at,
    severity: item.severity,
    summary: item.summary,
    title: item.title
  };
}

function mapActivityEvent(item: OperationLogRow): ActivityEvent {
  return {
    createdAt: item.created_at,
    deviceId: item.device_id ?? "",
    id: item.id,
    metadata: item.technical_details ?? undefined,
    status: item.status,
    summary: item.summary,
    title: item.title,
    type: item.operation_type
  };
}

function mapAppItem(item: ScanAppItemRow): SoftwareInventoryItem {
  return {
    actionType: item.action_type,
    appId: item.app_id,
    availableVersion: item.available_version,
    detectionMethod: item.detection_method,
    deviceId: item.device_id,
    displayName: item.display_name,
    id: item.id,
    installPath: item.install_path,
    installedVersion: item.installed_version ?? "unknown",
    lastCheckedAt: item.created_at,
    normalizedName: item.normalized_name,
    notes: item.notes,
    publisher: item.publisher,
    sourceKind: item.source_kind,
    status: item.status,
    technicalDetails: item.technical_details ?? {},
    updateConfidence: item.update_confidence
  };
}

function mapCleanupItem(item: ScanCleanupItemRow): CleanupCandidate {
  return {
    category: item.category,
    deviceId: item.device_id,
    estimatedBytes: item.estimated_bytes,
    id: item.id,
    label: item.label,
    safetyLevel: item.safety_level,
    selectedByDefault: item.selected_by_default
  };
}

function mapStartupItem(item: ScanStartupItemRow): StartupItem {
  return {
    command: item.command,
    deviceId: item.device_id,
    enabled: item.enabled,
    id: item.id,
    impact: item.impact,
    name: item.name,
    source: item.source
  };
}

function mapSecurityItem(item: ScanSecurityItemRow): SecuritySignal {
  return {
    detail: item.detail,
    deviceId: item.device_id,
    id: item.id,
    key: item.signal_key,
    label: item.label,
    status: item.status
  };
}

async function getLiveShellState(locale: "en" | "tr") {
  const auth = await requireAuthenticatedUser(locale);
  if (auth.mode === "demo" || !auth.supabase || !auth.user) {
    return demoShell;
  }

  const [profileResult, preferencesResult, subscriptionResult] = await Promise.all([
    auth.supabase.from("profiles").select("id,email,full_name,company_name").eq("id", auth.user.id).maybeSingle(),
    auth.supabase
      .from("user_preferences")
      .select("user_id,locale,marketing_emails,recommendation_digest,release_channel")
      .eq("user_id", auth.user.id)
      .maybeSingle(),
    auth.supabase
      .from("subscriptions")
      .select("user_id,plan_id,status")
      .eq("user_id", auth.user.id)
      .in("status", ["trialing", "active"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  let plan: PlanSummary = defaultPlanSummary();
  const subscription = unwrapSupabaseResult(
    "load the active subscription",
    subscriptionResult as SupabaseQueryResult<SubscriptionRow | null>
  ) as SubscriptionRow | null;

  if (subscription?.plan_id) {
    const planResult = await auth.supabase
      .from("plans")
      .select("id,name,monthly_price_cents,yearly_price_cents,metadata")
      .eq("id", subscription.plan_id)
      .maybeSingle();
    plan = mapPlan(
      (unwrapSupabaseResult(
        "load the current plan",
        planResult as SupabaseQueryResult<PlanRow | null>
      ) as PlanRow | null) ?? null
    );
  }

  return {
    mode: "connected" as const,
    plan,
    preferences: mapPreferences(
      (unwrapSupabaseResult(
        "load user preferences",
        preferencesResult as SupabaseQueryResult<UserPreferencesRow | null>
      ) as UserPreferencesRow | null) ?? null
    ),
    user: mapProfile(
      (unwrapSupabaseResult(
        "load the user profile",
        profileResult as SupabaseQueryResult<ProfileRow | null>
      ) as ProfileRow | null) ?? null,
      auth.user.id,
      auth.user.email ?? null
    )
  };
}

async function getLiveDevices(locale: "en" | "tr") {
  const auth = await requireAuthenticatedUser(locale);
  if (auth.mode === "demo" || !auth.supabase || !auth.user) {
    return getDevices();
  }

  const devicesResult = await auth.supabase
    .from("devices")
    .select("id,owner_id,name,platform,os_version,status,attention_score,issue_count,last_seen_at,last_scan_at")
    .order("last_seen_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  const deviceRows =
    (unwrapSupabaseResult(
      "load devices",
      devicesResult as SupabaseQueryResult<DeviceRow[] | null>
    ) as DeviceRow[] | null) ?? [];

  const deviceIds = deviceRows.map((item) => item.id);
  const latestScansByDevice = new Map<string, DeviceScanRow>();

  if (deviceIds.length > 0) {
    const scansResult = await auth.supabase
      .from("device_scans")
      .select("id,device_id,scanned_at,created_at,health_summary,counts")
      .in("device_id", deviceIds)
      .order("scanned_at", { ascending: false });
    const scanRows =
      (unwrapSupabaseResult(
        "load latest device scans",
        scansResult as SupabaseQueryResult<DeviceScanRow[] | null>
      ) as DeviceScanRow[] | null) ?? [];
    scanRows.forEach((scan) => {
      if (!latestScansByDevice.has(scan.device_id)) {
        latestScansByDevice.set(scan.device_id, scan);
      }
    });
  }

  return deviceRows.map((device) => mapDeviceSummary(device, latestScansByDevice.get(device.id) ?? null));
}

async function getLatestLiveScan(locale: "en" | "tr", deviceId?: string) {
  const auth = await requireAuthenticatedUser(locale);
  if (auth.mode === "demo" || !auth.supabase || !auth.user) {
    if (deviceId) {
      return getScanSnapshot(deviceId);
    }

    return demoDashboard.latestScan;
  }

  const query = auth.supabase
    .from("device_scans")
    .select("id,device_id,scanned_at,created_at,health_summary,counts")
    .order("scanned_at", { ascending: false })
    .limit(1);

  const scanResult = deviceId ? await query.eq("device_id", deviceId).maybeSingle() : await query.maybeSingle();
  const scan =
    (unwrapSupabaseResult(
      "load the latest scan",
      scanResult as SupabaseQueryResult<DeviceScanRow | null>
    ) as DeviceScanRow | null) ?? null;
  if (!scan) {
    return null;
  }

  const [appResult, cleanupResult, startupResult, securityResult] = await Promise.all([
    auth.supabase
      .from("scan_app_items")
      .select("id,device_id,app_id,display_name,normalized_name,publisher,installed_version,available_version,source_kind,detection_method,install_path,status,action_type,update_confidence,notes,technical_details,created_at")
      .eq("scan_id", scan.id)
      .order("display_name", { ascending: true }),
    auth.supabase
      .from("scan_cleanup_items")
      .select("id,device_id,category,label,estimated_bytes,safety_level,selected_by_default")
      .eq("scan_id", scan.id)
      .order("estimated_bytes", { ascending: false }),
    auth.supabase
      .from("scan_startup_items")
      .select("id,device_id,name,command,enabled,impact,source")
      .eq("scan_id", scan.id)
      .order("name", { ascending: true }),
    auth.supabase
      .from("scan_security_items")
      .select("id,device_id,signal_key,label,status,detail")
      .eq("scan_id", scan.id)
      .order("label", { ascending: true })
  ]);

  return {
    appItems:
      (
        (unwrapSupabaseResult(
          "load scan application items",
          appResult as SupabaseQueryResult<ScanAppItemRow[] | null>
        ) as ScanAppItemRow[] | null) ?? []
      ).map(mapAppItem),
    cleanupItems:
      (
        (unwrapSupabaseResult(
          "load scan cleanup items",
          cleanupResult as SupabaseQueryResult<ScanCleanupItemRow[] | null>
        ) as ScanCleanupItemRow[] | null) ?? []
      ).map(mapCleanupItem),
    createdAt: scan.scanned_at,
    deviceId: scan.device_id,
    healthSummary: normalizeHealthSummary(scan.health_summary),
    id: scan.id,
    securityItems:
      (
        (unwrapSupabaseResult(
          "load scan security items",
          securityResult as SupabaseQueryResult<ScanSecurityItemRow[] | null>
        ) as ScanSecurityItemRow[] | null) ?? []
      ).map(mapSecurityItem),
    startupItems:
      (
        (unwrapSupabaseResult(
          "load scan startup items",
          startupResult as SupabaseQueryResult<ScanStartupItemRow[] | null>
        ) as ScanStartupItemRow[] | null) ?? []
      ).map(mapStartupItem)
  } satisfies DeviceScanSnapshot;
}

async function getLiveRecommendations(locale: "en" | "tr", deviceId?: string) {
  const auth = await requireAuthenticatedUser(locale);
  if (auth.mode === "demo" || !auth.supabase || !auth.user) {
    return getRecommendations(deviceId);
  }

  let query = auth.supabase
    .from("maintenance_recommendations")
    .select("id,device_id,severity,category,title,summary,action_label,action_path,created_at,resolved_at")
    .order("created_at", { ascending: false })
    .limit(50);

  query = deviceId ? query.eq("device_id", deviceId) : query.is("resolved_at", null);
  const result = await query;
  return (
    (unwrapSupabaseResult(
      "load recommendations",
      result as SupabaseQueryResult<RecommendationRow[] | null>
    ) as RecommendationRow[] | null) ?? []
  ).map(mapRecommendation);
}

async function getLiveActivity(locale: "en" | "tr") {
  const auth = await requireAuthenticatedUser(locale);
  if (auth.mode === "demo" || !auth.supabase || !auth.user) {
    return getActivity();
  }

  const result = await auth.supabase
    .from("operation_logs")
    .select("id,device_id,operation_type,status,title,summary,technical_details,created_at")
    .order("created_at", { ascending: false })
    .limit(30);

  return (
    (unwrapSupabaseResult(
      "load activity history",
      result as SupabaseQueryResult<OperationLogRow[] | null>
    ) as OperationLogRow[] | null) ?? []
  ).map(mapActivityEvent);
}

export async function getAppShellState(locale: "en" | "tr") {
  return getLiveShellState(locale);
}

export async function getOverviewData(locale: "en" | "tr"): Promise<DashboardSnapshot> {
  const shell = await getLiveShellState(locale);
  if (shell.mode === "demo") {
    return demoDashboard;
  }

  const [devices, recommendations, activity, latestScan] = await Promise.all([
    getLiveDevices(locale),
    getLiveRecommendations(locale),
    getLiveActivity(locale),
    getLatestLiveScan(locale)
  ]);

  return {
    activity,
    devices,
    latestScan:
      latestScan ??
      ({
        appItems: [],
        cleanupItems: [],
        createdAt: new Date(0).toISOString(),
        deviceId: devices[0]?.id ?? "00000000-0000-0000-0000-000000000000",
        healthSummary: devices[0]?.latestHealth ?? emptyHealth,
        id: "empty-scan",
        securityItems: [],
        startupItems: []
      } satisfies DeviceScanSnapshot),
    plan: shell.plan,
    preferences: shell.preferences,
    recommendations,
    user: shell.user
  };
}

export async function getDevicesForPage(locale: "en" | "tr", query = "") {
  const shell = await getLiveShellState(locale);
  const devices = shell.mode === "demo" ? getDevices() : await getLiveDevices(locale);
  const filtered = devices.filter((device) =>
    device.name.toLowerCase().includes(query.toLowerCase())
  );

  const reclaimableByDevice =
    shell.mode === "demo"
      ? Object.fromEntries(
          devices.map((device) => [
            device.id,
            getCleanup(device.id).reduce((total, item) => total + item.estimatedBytes, 0)
          ])
        )
      : Object.fromEntries(
          await Promise.all(
            devices.map(async (device) => {
              const scan = await getLatestLiveScan(locale, device.id);
              return [
                device.id,
                (scan?.cleanupItems ?? []).reduce((total, item) => total + item.estimatedBytes, 0)
              ] as const;
            })
          )
        );

  return { devices: filtered, reclaimableByDevice, shell };
}

export async function getDeviceDetailForPage(locale: "en" | "tr", deviceId: string): Promise<DeviceDetailState | null> {
  const shell = await getLiveShellState(locale);
  if (shell.mode === "demo") {
    const device = getDeviceById(deviceId);
    if (!device) {
      return null;
    }

    return {
      applications: getApps(deviceId),
      cleanup: getCleanup(deviceId),
      device,
      recommendations: getRecommendations(deviceId),
      scan: getScanSnapshot(deviceId),
      startup: getStartup(deviceId)
    };
  }

  const devices = await getLiveDevices(locale);
  const device = devices.find((item) => item.id === deviceId) ?? null;
  if (!device) {
    return null;
  }

  const [scan, recommendations] = await Promise.all([
    getLatestLiveScan(locale, deviceId),
    getLiveRecommendations(locale, deviceId)
  ]);

  return {
    applications: scan?.appItems ?? [],
    cleanup: scan?.cleanupItems ?? [],
    device,
    recommendations,
    scan,
    startup: scan?.startupItems ?? []
  };
}

export async function getApplicationsForPage(
  locale: "en" | "tr",
  filters: { device?: string; query?: string; status?: string }
): Promise<ApplicationsState> {
  const shell = await getLiveShellState(locale);
  if (shell.mode === "demo") {
    const items = getApps(filters.device).filter((item) => {
      const query = filters.query?.toLowerCase() ?? "";
      const matchesQuery =
        !query ||
        item.displayName.toLowerCase().includes(query) ||
        item.publisher?.toLowerCase().includes(query);
      const matchesStatus = filters.status ? item.status === filters.status : true;
      return matchesQuery && matchesStatus;
    });

    return {
      devices: getDevices(),
      items,
      shell
    };
  }

  const devices = await getLiveDevices(locale);
  const targetDevices = filters.device ? devices.filter((item) => item.id === filters.device) : devices;
  const latestScans = await Promise.all(targetDevices.map((device) => getLatestLiveScan(locale, device.id)));
  const items = latestScans
    .flatMap((scan) => scan?.appItems ?? [])
    .filter((item) => {
      const query = filters.query?.toLowerCase() ?? "";
      const matchesQuery =
        !query ||
        item.displayName.toLowerCase().includes(query) ||
        item.publisher?.toLowerCase().includes(query);
      const matchesStatus = filters.status ? item.status === filters.status : true;
      return matchesQuery && matchesStatus;
    });

  return { devices, items, shell };
}

export async function getRecommendationsForPage(locale: "en" | "tr", severity?: string) {
  const shell = await getLiveShellState(locale);
  const recommendations = shell.mode === "demo" ? getRecommendations() : await getLiveRecommendations(locale);

  return {
    recommendations: recommendations.filter((item) =>
      severity ? item.severity === severity : true
    ),
    shell
  };
}

export async function getHistoryForPage(locale: "en" | "tr") {
  const shell = await getLiveShellState(locale);
  const activity = shell.mode === "demo" ? getActivity() : await getLiveActivity(locale);
  return { activity, shell };
}
