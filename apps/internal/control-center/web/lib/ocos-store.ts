import {
  type ActionDispatchRequest,
  type ActionRunResult,
  type ArtifactBlob,
  type CheckRunPayload,
  type CheckStatus,
  type CodexEscalationBundle,
  type IncidentSnapshot,
  type JsonValue,
  type NotificationPlan,
  type ServiceEventPayload,
  actionRunResultSchema,
  buildIncidentFingerprint,
  codexEscalationBundleSchema,
  incidentSnapshotSchema,
  incidentThresholds,
  notificationPlanSchema,
  shouldEscalateToCodex,
  studioServiceDefinition
} from "@ocos/contracts";

import { isoNow, minutesBetween } from "@/lib/crypto";
import { dispatchStudioWorkflow } from "@/lib/github";
import { getSupabaseAdmin } from "@/lib/supabase";
import { runStudioPublicProbe } from "@/lib/studio-probe";

type ServiceEnvironmentView = {
  id: string;
  slug: "staging" | "production";
  name: string;
  baseUrl: string;
  cadenceMinutes: number;
  currentStatus: CheckStatus;
  lastCheckAt?: string;
  lastBuild?: string;
};

export type ServiceView = {
  id: string;
  slug: string;
  name: string;
  description: string;
  environments: ServiceEnvironmentView[];
};

export type SummaryView = {
  generatedAt: string;
  demoMode: boolean;
  serviceTotals: {
    total: number;
    healthy: number;
    degraded: number;
    failed: number;
  };
  incidentsBySeverity: Record<"P1" | "P2" | "P3", number>;
  activeIncidents: IncidentSnapshot[];
  services: ServiceView[];
  actionRuns: ActionRunResult[];
  codexEscalations: Array<{
    id: string;
    incidentId: string;
    serviceSlug: string;
    environmentSlug: "staging" | "production";
    status: string;
    recommendedNextPath: string;
    createdAt: string;
  }>;
};

type DemoState = {
  services: ServiceView[];
  incidents: IncidentSnapshot[];
  actionRuns: ActionRunResult[];
  codexEscalations: SummaryView["codexEscalations"];
};

declare global {
  var __OCOS_DEMO_STATE__: DemoState | undefined;
}

function createDemoState(): DemoState {
  const now = isoNow();
  const openTime = new Date(Date.now() - 8 * 60000).toISOString();
  const actionTime = new Date(Date.now() - 6 * 60000).toISOString();

  return {
    services: [
      {
        id: "svc-studio",
        slug: "studio",
        name: "OmniaCreata Studio",
        description: "Studio-first monitored surface for OCOS v0.",
        environments: [
          {
            id: "env-studio-prod",
            slug: "production",
            name: "Production",
            baseUrl: studioServiceDefinition.environments.production.baseUrl,
            cadenceMinutes: 5,
            currentStatus: "degraded",
            lastCheckAt: now,
            lastBuild: "2026.04.07.31"
          },
          {
            id: "env-studio-staging",
            slug: "staging",
            name: "Staging",
            baseUrl: studioServiceDefinition.environments.staging.baseUrl,
            cadenceMinutes: 15,
            currentStatus: "healthy",
            lastCheckAt: now,
            lastBuild: "2026.04.07.31"
          }
        ]
      }
    ],
    incidents: [
      incidentSnapshotSchema.parse({
        id: "inc-demo-1",
        serviceSlug: "studio",
        serviceName: "OmniaCreata Studio",
        environmentSlug: "production",
        environmentName: "Production",
        title: "Studio production degraded health",
        summary: "Public probes show the Studio shell up, but health is degraded.",
        fingerprint: "studio:production:public_probe",
        severity: "P2",
        state: "open",
        latestCheckStatus: "degraded",
        latestRunType: "public_probe",
        latestVersionBuild: "2026.04.07.31",
        latestArtifacts: [
          {
            kind: "report",
            label: "deployment-verify-latest.json",
            href: "/api/incidents/inc-demo-1",
            metadata: {
              source: "demo"
            }
          }
        ],
        autoRemediationAttempted: true,
        recommendedNextPath: "Review provider smoke drift, then rerun staging verify.",
        openedAt: openTime,
        updatedAt: now,
        lastSeenAt: now,
        openDurationMinutes: minutesBetween(openTime, now)
      })
    ],
    actionRuns: [
      actionRunResultSchema.parse({
        id: "act-demo-1",
        incidentId: "inc-demo-1",
        serviceSlug: "studio",
        environmentSlug: "production",
        recipe: "recheck_public_health",
        status: "failed",
        summary: "Immediate public recheck still returned degraded Studio health.",
        artifacts: [],
        responsePayload: {
          status: "degraded"
        },
        createdAt: actionTime,
        completedAt: now
      })
    ],
    codexEscalations: [
      {
        id: "esc-demo-1",
        incidentId: "inc-demo-1",
        serviceSlug: "studio",
        environmentSlug: "production",
        status: "queued",
        recommendedNextPath: "Investigate provider auth drift before another rollout.",
        createdAt: now
      }
    ]
  };
}

function getDemoState(): DemoState {
  if (!globalThis.__OCOS_DEMO_STATE__) {
    globalThis.__OCOS_DEMO_STATE__ = createDemoState();
  }
  return globalThis.__OCOS_DEMO_STATE__;
}

function isDemoMode(): boolean {
  return getSupabaseAdmin() === null;
}

function buildNotificationPlan(input: {
  severity: "P1" | "P2" | "P3";
  action: "opened" | "resolved" | "updated";
  incident: IncidentSnapshot;
}): NotificationPlan {
  const immediate =
    input.severity === "P1" ||
    (input.severity === "P2" && input.action === "opened");

  return notificationPlanSchema.parse({
    shouldNotify: input.action !== "updated",
    channel: immediate ? "telegram" : "digest",
    severity: input.severity,
    title: `${input.incident.serviceName} ${input.incident.environmentName} ${input.action}`,
    body: `${input.incident.summary} (${input.incident.severity}/${input.incident.state})`,
    deepLink: `/incidents/${input.incident.id}`
  });
}

function activeIncidentStates(snapshot: IncidentSnapshot): boolean {
  return snapshot.state !== "resolved";
}

function mapIncidentRow(
  row: Record<string, unknown>,
  service: ServiceView | undefined,
  environment: ServiceEnvironmentView | undefined,
  artifacts: ArtifactBlob[] = [],
  latestCheck?: Record<string, unknown>
): IncidentSnapshot {
  const openedAt = String(row.opened_at ?? isoNow());
  const updatedAt = String(row.updated_at ?? openedAt);

  return incidentSnapshotSchema.parse({
    id: String(row.id),
    serviceSlug: service?.slug ?? "unknown",
    serviceName: service?.name ?? "Unknown service",
    environmentSlug: environment?.slug ?? "production",
    environmentName: environment?.name ?? "Unknown environment",
    title: String(row.title ?? "Untitled incident"),
    summary: String(row.summary ?? "No summary recorded."),
    fingerprint: String(row.fingerprint ?? ""),
    severity: row.severity,
    state: row.state,
    latestCheckStatus: latestCheck?.status as CheckStatus | undefined,
    latestRunType: latestCheck?.run_type ? String(latestCheck.run_type) : undefined,
    latestVersionBuild: latestCheck?.version_build ? String(latestCheck.version_build) : undefined,
    latestArtifacts: artifacts,
    autoRemediationAttempted: Boolean(row.auto_remediation_attempted),
    recommendedNextPath: row.recommended_next_path ? String(row.recommended_next_path) : undefined,
    openedAt,
    updatedAt,
    lastSeenAt: row.last_seen_at ? String(row.last_seen_at) : undefined,
    acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : undefined,
    resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
    silencedUntil: row.silenced_until ? String(row.silenced_until) : undefined,
    openDurationMinutes: minutesBetween(openedAt, updatedAt)
  });
}

export async function listServices(): Promise<ServiceView[]> {
  if (isDemoMode()) {
    return getDemoState().services;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return getDemoState().services;
  }

  const [{ data: services }, { data: environments }, { data: checkRuns }, { data: incidents }] =
    await Promise.all([
      supabase.from("services").select("*").order("name"),
      supabase.from("service_environments").select("*").order("name"),
      supabase.from("check_runs").select("*").order("recorded_at", { ascending: false }).limit(50),
      supabase
        .from("incidents")
        .select("*")
        .in("state", ["open", "acknowledged", "auto_remediating", "escalated", "silenced"])
    ]);

  const recentChecks = checkRuns ?? [];
  const activeIncidents = incidents ?? [];

  return (services ?? []).map((service) => {
    const envRows = (environments ?? []).filter((row) => row.service_id === service.id);
    return {
      id: service.id,
      slug: service.slug,
      name: service.name,
      description: service.description ?? "",
      environments: envRows.map((env) => {
        const latestCheck = recentChecks.find((row) => row.service_environment_id === env.id);
        const activeIncident = activeIncidents.find((row) => row.service_environment_id === env.id);
        return {
          id: env.id,
          slug: env.slug,
          name: env.name,
          baseUrl: env.base_url,
          cadenceMinutes: env.cadence_minutes,
          currentStatus: (activeIncident
            ? activeIncident.severity === "P1"
              ? "failed"
              : "degraded"
            : latestCheck?.status ?? "healthy") as CheckStatus,
          lastCheckAt: latestCheck?.recorded_at ?? undefined,
          lastBuild: latestCheck?.version_build ?? undefined
        };
      })
    };
  });
}

export async function listIncidents(): Promise<IncidentSnapshot[]> {
  if (isDemoMode()) {
    return getDemoState().incidents;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return getDemoState().incidents;
  }

  const [services, incidents, artifacts] = await Promise.all([
    listServices(),
    supabase.from("incidents").select("*").order("last_seen_at", { ascending: false }),
    supabase.from("artifact_blobs").select("*").order("created_at", { ascending: false }).limit(100)
  ]);
  const { data: checkRuns } = await supabase.from("check_runs").select("*").order("recorded_at", { ascending: false }).limit(100);

  const serviceLookup = new Map(services.map((service) => [service.id, service]));
  const envLookup = new Map(
    services.flatMap((service) => service.environments.map((env) => [env.id, env] as const))
  );
  const artifactRows = artifacts.data ?? [];
  const checkRunLookup = new Map((checkRuns ?? []).map((row) => [row.id, row]));

  return (incidents.data ?? []).map((row) =>
    mapIncidentRow(
      row,
      serviceLookup.get(String(row.service_id)),
      envLookup.get(String(row.service_environment_id)),
      artifactRows
        .filter((artifact) => artifact.incident_id === row.id)
        .map((artifact) => ({
          id: artifact.id,
          kind: artifact.kind,
          label: artifact.label,
          href: artifact.href,
          sha256: artifact.sha256 ?? undefined,
          metadata: (artifact.metadata ?? {}) as Record<string, JsonValue>
        })),
      checkRunLookup.get(String(row.latest_check_run_id))
    )
  );
}

export async function getIncident(incidentId: string): Promise<IncidentSnapshot | null> {
  const incidents = await listIncidents();
  return incidents.find((incident) => incident.id === incidentId) ?? null;
}

export async function listActionRuns(): Promise<ActionRunResult[]> {
  if (isDemoMode()) {
    return getDemoState().actionRuns;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return getDemoState().actionRuns;
  }

  const { data } = await supabase.from("action_runs").select("*").order("created_at", { ascending: false }).limit(50);
  return (data ?? []).map((row) =>
    actionRunResultSchema.parse({
      id: row.id,
      incidentId: row.incident_id ?? undefined,
      serviceSlug: "studio",
      environmentSlug: row.request_payload?.environmentSlug ?? "production",
      recipe: row.recipe,
      status: row.status,
      summary: row.summary,
      artifacts: [],
      responsePayload: row.response_payload ?? {},
      createdAt: row.created_at,
      completedAt: row.completed_at ?? undefined
    })
  );
}

export async function listCodexEscalations(): Promise<SummaryView["codexEscalations"]> {
  if (isDemoMode()) {
    return getDemoState().codexEscalations;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return getDemoState().codexEscalations;
  }

  const { data } = await supabase
    .from("codex_escalations")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(50);

  return (data ?? []).map((row) => ({
    id: row.id,
    incidentId: row.incident_id,
    serviceSlug: "studio",
    environmentSlug: "production",
    status: row.status,
    recommendedNextPath: row.recommended_next_path,
    createdAt: row.created_at
  }));
}

export async function getSummary(): Promise<SummaryView> {
  const [services, incidents, actionRuns, codexEscalations] = await Promise.all([
    listServices(),
    listIncidents(),
    listActionRuns(),
    listCodexEscalations()
  ]);

  const activeIncidents = incidents.filter(activeIncidentStates);
  const allEnvironments = services.flatMap((service) => service.environments);

  return {
    generatedAt: isoNow(),
    demoMode: isDemoMode(),
    serviceTotals: {
      total: allEnvironments.length,
      healthy: allEnvironments.filter((env) => env.currentStatus === "healthy").length,
      degraded: allEnvironments.filter((env) => env.currentStatus === "degraded").length,
      failed: allEnvironments.filter((env) => env.currentStatus === "failed").length
    },
    incidentsBySeverity: {
      P1: activeIncidents.filter((incident) => incident.severity === "P1").length,
      P2: activeIncidents.filter((incident) => incident.severity === "P2").length,
      P3: activeIncidents.filter((incident) => incident.severity === "P3").length
    },
    activeIncidents,
    services,
    actionRuns,
    codexEscalations
  };
}

async function insertIncidentArtifacts(incidentId: string, artifacts: ArtifactBlob[]): Promise<void> {
  if (!artifacts.length) {
    return;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return;
  }

  await supabase.from("artifact_blobs").insert(
    artifacts.map((artifact) => ({
      incident_id: incidentId,
      kind: artifact.kind,
      label: artifact.label,
      href: artifact.href,
      sha256: artifact.sha256,
      metadata: artifact.metadata ?? {}
    }))
  );
}

function severityFromCheck(payload: CheckRunPayload): "P1" | "P2" | "P3" {
  if (payload.environmentSlug === "production" && payload.status === "failed") {
    return "P1";
  }
  if (payload.environmentSlug === "production") {
    return "P2";
  }
  return "P3";
}

function severityFromEvent(payload: ServiceEventPayload): "P1" | "P2" | "P3" {
  if (payload.severity) {
    return payload.severity;
  }
  if (payload.eventType === "deployment_verify") {
    return "P2";
  }
  if (payload.eventType === "incident_bundle") {
    return "P2";
  }
  return "P3";
}

async function resolveServiceContext(serviceSlug: string, environmentSlug: "staging" | "production") {
  const services = await listServices();
  const service = services.find((candidate) => candidate.slug === serviceSlug);
  const environment = service?.environments.find((candidate) => candidate.slug === environmentSlug);
  return { service, environment };
}

async function getRecentStatusCounts(input: {
  runType: string;
  fingerprint: string;
}): Promise<{ consecutiveFailures: number; consecutiveHealthy: number }> {
  if (isDemoMode()) {
    return {
      consecutiveFailures: 2,
      consecutiveHealthy: 0
    };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      consecutiveFailures: 0,
      consecutiveHealthy: 0
    };
  }

  const { data } = await supabase
    .from("check_runs")
    .select("status")
    .eq("run_type", input.runType)
    .eq("fingerprint", input.fingerprint)
    .order("recorded_at", { ascending: false })
    .limit(6);

  let consecutiveFailures = 0;
  let consecutiveHealthy = 0;
  const rows = data ?? [];

  if (rows[0]?.status === "healthy") {
    for (const row of rows) {
      if (row.status === "healthy") {
        consecutiveHealthy += 1;
      } else {
        break;
      }
    }
    return { consecutiveFailures: 0, consecutiveHealthy };
  }

  for (const row of rows) {
    if (row.status !== "healthy") {
      consecutiveFailures += 1;
    } else {
      break;
    }
  }

  return {
    consecutiveFailures,
    consecutiveHealthy
  };
}

async function findActiveIncident(fingerprint: string): Promise<IncidentSnapshot | null> {
  const incidents = await listIncidents();
  return incidents.find((incident) => incident.fingerprint === fingerprint && incident.state !== "resolved") ?? null;
}

export async function acknowledgeIncident(incidentId: string): Promise<IncidentSnapshot | null> {
  const incident = await getIncident(incidentId);
  if (!incident) {
    return null;
  }

  if (isDemoMode()) {
    const demo = getDemoState();
    const target = demo.incidents.find((item) => item.id === incidentId);
    if (target) {
      target.state = "acknowledged";
      target.acknowledgedAt = isoNow();
      target.updatedAt = isoNow();
      return target;
    }
    return null;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return incident;
  }

  await supabase
    .from("incidents")
    .update({
      state: "acknowledged",
      acknowledged_at: isoNow(),
      updated_at: isoNow()
    })
    .eq("id", incidentId);

  return getIncident(incidentId);
}

export async function silenceIncident(incidentId: string, minutes = 30): Promise<IncidentSnapshot | null> {
  const incident = await getIncident(incidentId);
  if (!incident) {
    return null;
  }

  const silencedUntil = new Date(Date.now() + minutes * 60000).toISOString();
  if (isDemoMode()) {
    const demo = getDemoState();
    const target = demo.incidents.find((item) => item.id === incidentId);
    if (target) {
      target.state = "silenced";
      target.silencedUntil = silencedUntil;
      target.updatedAt = isoNow();
      return target;
    }
    return null;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return incident;
  }

  await supabase
    .from("incidents")
    .update({
      state: "silenced",
      silenced_until: silencedUntil,
      updated_at: isoNow()
    })
    .eq("id", incidentId);

  return getIncident(incidentId);
}

export async function recordCheckResult(payload: CheckRunPayload): Promise<{
  incident: IncidentSnapshot | null;
  notification: NotificationPlan;
  suggestedAction?: ActionDispatchRequest["recipe"];
}> {
  const fingerprint =
    payload.fingerprint ?? buildIncidentFingerprint(payload.serviceSlug, payload.environmentSlug, payload.runType);
  const { service, environment } = await resolveServiceContext(payload.serviceSlug, payload.environmentSlug);
  const runRecordedAt = payload.recordedAt ?? isoNow();

  if (isDemoMode()) {
    const demo = getDemoState();
    const active = demo.incidents.find((incident) => incident.fingerprint === fingerprint && incident.state !== "resolved");

    if (payload.status === "healthy" && active) {
      active.state = "resolved";
      active.resolvedAt = runRecordedAt;
      active.updatedAt = runRecordedAt;
      return {
        incident: active,
        notification: buildNotificationPlan({
          severity: active.severity,
          action: "resolved",
          incident: active
        })
      };
    }

    if (payload.status !== "healthy") {
      const incident =
        active ??
        incidentSnapshotSchema.parse({
          id: crypto.randomUUID(),
          serviceSlug: payload.serviceSlug,
          serviceName: service?.name ?? payload.serviceSlug,
          environmentSlug: payload.environmentSlug,
          environmentName: environment?.name ?? payload.environmentSlug,
          title:
            payload.environmentSlug === "production"
              ? "Studio production health incident"
              : "Studio staging health incident",
          summary: payload.summary,
          fingerprint,
          severity: severityFromCheck(payload),
          state: "open",
          latestCheckStatus: payload.status,
          latestRunType: payload.runType,
          latestVersionBuild: payload.versionBuild,
          latestArtifacts: payload.artifacts ?? [],
          autoRemediationAttempted: false,
          recommendedNextPath:
            payload.environmentSlug === "production"
              ? "Run a bounded public recheck, then inspect provider drift."
              : "Trigger staging verify and collect a bounded incident bundle.",
          openedAt: runRecordedAt,
          updatedAt: runRecordedAt,
          lastSeenAt: runRecordedAt,
          openDurationMinutes: 0
        });

      incident.summary = payload.summary;
      incident.latestCheckStatus = payload.status;
      incident.latestRunType = payload.runType;
      incident.latestVersionBuild = payload.versionBuild;
      incident.updatedAt = runRecordedAt;
      incident.lastSeenAt = runRecordedAt;
      if (!active) {
        demo.incidents.unshift(incident);
      }

      return {
        incident,
        notification: buildNotificationPlan({
          severity: incident.severity,
          action: active ? "updated" : "opened",
          incident
        }),
        suggestedAction: incident.autoRemediationAttempted ? undefined : "recheck_public_health"
      };
    }

    return {
      incident: null,
      notification: notificationPlanSchema.parse({
        shouldNotify: false
      })
    };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase || !service || !environment) {
    return {
      incident: null,
      notification: notificationPlanSchema.parse({
        shouldNotify: false
      })
    };
  }

  const { data: checkRunRow } = await supabase
    .from("check_runs")
    .insert({
      service_id: service.id,
      service_environment_id: environment.id,
      run_type: payload.runType,
      source: payload.source,
      status: payload.status,
      summary: payload.summary,
      fingerprint,
      health_status: payload.healthStatus ?? null,
      login_ok: payload.loginOk ?? null,
      version_build: payload.versionBuild ?? null,
      version_label: payload.versionLabel ?? null,
      checked_paths: payload.checkedPaths ?? [],
      metadata: payload.metadata ?? {},
      recorded_at: runRecordedAt
    })
    .select("*")
    .single();

  const recent = await getRecentStatusCounts({
    runType: payload.runType,
    fingerprint
  });
  const activeIncident = await findActiveIncident(fingerprint);

  if (
    payload.status === "healthy" &&
    activeIncident &&
    recent.consecutiveHealthy >= incidentThresholds.resolveAfterConsecutiveHealthyChecks
  ) {
    await supabase
      .from("incidents")
      .update({
        state: "resolved",
        resolved_at: runRecordedAt,
        last_seen_at: runRecordedAt,
        updated_at: runRecordedAt,
        latest_check_run_id: checkRunRow?.id ?? null
      })
      .eq("id", activeIncident.id);

    const resolved = await getIncident(activeIncident.id);
    return {
      incident: resolved,
      notification: buildNotificationPlan({
        severity: activeIncident.severity,
        action: "resolved",
        incident: resolved ?? activeIncident
      })
    };
  }

  if (
    payload.status !== "healthy" &&
    recent.consecutiveFailures >= incidentThresholds.openAfterConsecutiveFailures
  ) {
    if (activeIncident) {
      await supabase
        .from("incidents")
        .update({
          summary: payload.summary,
          last_seen_at: runRecordedAt,
          updated_at: runRecordedAt,
          latest_check_run_id: checkRunRow?.id ?? null,
          recommended_next_path:
            payload.environmentSlug === "production"
              ? "Run recheck_public_health, then compare provider/auth drift."
              : "Dispatch trigger_staging_verify and collect a bounded bundle."
        })
        .eq("id", activeIncident.id);

      await insertIncidentArtifacts(activeIncident.id, payload.artifacts ?? []);
      const updated = await getIncident(activeIncident.id);
      return {
        incident: updated,
        notification: buildNotificationPlan({
          severity: activeIncident.severity,
          action: "updated",
          incident: updated ?? activeIncident
        }),
        suggestedAction: updated?.autoRemediationAttempted ? undefined : "recheck_public_health"
      };
    }

    const severity = severityFromCheck(payload);
    const title =
      payload.environmentSlug === "production"
        ? "Studio production public probe failure"
        : "Studio staging public probe failure";

    const { data: insertedIncident } = await supabase
      .from("incidents")
      .insert({
        service_id: service.id,
        service_environment_id: environment.id,
        fingerprint,
        title,
        summary: payload.summary,
        severity,
        state: "open",
        source: payload.source,
        latest_check_run_id: checkRunRow?.id ?? null,
        auto_remediation_attempted: false,
        recommended_next_path:
          payload.environmentSlug === "production"
            ? "Run recheck_public_health, then compare provider/auth drift."
            : "Dispatch trigger_staging_verify and collect a bounded bundle.",
        opened_at: runRecordedAt,
        last_seen_at: runRecordedAt,
        updated_at: runRecordedAt
      })
      .select("*")
      .single();

    if (insertedIncident) {
      await insertIncidentArtifacts(insertedIncident.id, payload.artifacts ?? []);
    }

    const snapshot = insertedIncident ? await getIncident(insertedIncident.id) : null;
    return {
      incident: snapshot,
      notification:
        snapshot
          ? buildNotificationPlan({
              severity: snapshot.severity,
              action: "opened",
              incident: snapshot
            })
          : notificationPlanSchema.parse({ shouldNotify: false }),
      suggestedAction: "recheck_public_health"
    };
  }

  return {
    incident: activeIncident,
    notification: notificationPlanSchema.parse({
      shouldNotify: false
    })
  };
}

export async function recordServiceEvent(payload: ServiceEventPayload): Promise<{
  incident: IncidentSnapshot | null;
  notification: NotificationPlan;
}> {
  const fingerprint =
    payload.fingerprint ?? buildIncidentFingerprint(payload.serviceSlug, payload.environmentSlug, payload.eventType);
  const { service, environment } = await resolveServiceContext(payload.serviceSlug, payload.environmentSlug);
  const occurredAt = payload.occurredAt ?? isoNow();
  const severity = severityFromEvent(payload);

  if (isDemoMode()) {
    const demo = getDemoState();
    const incident = incidentSnapshotSchema.parse({
      id: crypto.randomUUID(),
      serviceSlug: payload.serviceSlug,
      serviceName: service?.name ?? payload.serviceSlug,
      environmentSlug: payload.environmentSlug,
      environmentName: environment?.name ?? payload.environmentSlug,
      title: payload.title ?? `${payload.eventType} reported by ${payload.serviceSlug}`,
      summary: payload.summary,
      fingerprint,
      severity,
      state: payload.status === "healthy" ? "resolved" : "open",
      latestArtifacts: payload.artifacts ?? [],
      autoRemediationAttempted: false,
      recommendedNextPath: payload.recommendedNextPath,
      openedAt: occurredAt,
      updatedAt: occurredAt,
      lastSeenAt: occurredAt,
      resolvedAt: payload.status === "healthy" ? occurredAt : undefined,
      openDurationMinutes: 0
    });
    demo.incidents.unshift(incident);
    return {
      incident,
      notification: buildNotificationPlan({
        severity,
        action: payload.status === "healthy" ? "resolved" : "opened",
        incident
      })
    };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase || !service || !environment) {
    return {
      incident: null,
      notification: notificationPlanSchema.parse({
        shouldNotify: false
      })
    };
  }

  const activeIncident = await findActiveIncident(fingerprint);
  if (payload.status === "healthy" && activeIncident) {
    await supabase
      .from("incidents")
      .update({
        state: "resolved",
        resolved_at: occurredAt,
        updated_at: occurredAt,
        last_seen_at: occurredAt
      })
      .eq("id", activeIncident.id);

    const resolved = await getIncident(activeIncident.id);
    return {
      incident: resolved,
      notification: buildNotificationPlan({
        severity: activeIncident.severity,
        action: "resolved",
        incident: resolved ?? activeIncident
      })
    };
  }

  if (activeIncident) {
    await supabase
      .from("incidents")
      .update({
        summary: payload.summary,
        updated_at: occurredAt,
        last_seen_at: occurredAt,
        recommended_next_path: payload.recommendedNextPath ?? activeIncident.recommendedNextPath ?? null
      })
      .eq("id", activeIncident.id);
    await insertIncidentArtifacts(activeIncident.id, payload.artifacts ?? []);
    const updated = await getIncident(activeIncident.id);
    return {
      incident: updated,
      notification: buildNotificationPlan({
        severity: activeIncident.severity,
        action: "updated",
        incident: updated ?? activeIncident
      })
    };
  }

  const { data: inserted } = await supabase
    .from("incidents")
    .insert({
      service_id: service.id,
      service_environment_id: environment.id,
      fingerprint,
      title: payload.title ?? `${payload.eventType} reported by ${payload.serviceSlug}`,
      summary: payload.summary,
      severity,
      state: "open",
      source: payload.source,
      recommended_next_path: payload.recommendedNextPath ?? null,
      opened_at: occurredAt,
      last_seen_at: occurredAt,
      updated_at: occurredAt
    })
    .select("*")
    .single();

  if (inserted) {
    await insertIncidentArtifacts(inserted.id, payload.artifacts ?? []);
  }

  const snapshot = inserted ? await getIncident(inserted.id) : null;
  return {
    incident: snapshot,
    notification:
      snapshot
        ? buildNotificationPlan({
            severity: snapshot.severity,
            action: "opened",
            incident: snapshot
          })
        : notificationPlanSchema.parse({ shouldNotify: false })
  };
}

async function persistActionRun(
  action: ActionRunResult,
  request: ActionDispatchRequest
): Promise<ActionRunResult> {
  if (isDemoMode()) {
    const demo = getDemoState();
    const existing = demo.actionRuns.find((run) => run.id === action.id);
    if (existing) {
      Object.assign(existing, action);
    } else {
      demo.actionRuns.unshift(action);
    }
    const incident = request.incidentId
      ? demo.incidents.find((candidate) => candidate.id === request.incidentId)
      : undefined;
    if (incident) {
      incident.autoRemediationAttempted = true;
      if (action.recipe === "create_codex_escalation") {
        incident.state = "escalated";
      } else if (incident.state !== "resolved") {
        incident.state = "auto_remediating";
      }
      incident.updatedAt = isoNow();
    }
    return action;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return action;
  }

  const services = await listServices();
  const service = services.find((candidate) => candidate.slug === request.serviceSlug);
  const environment = service?.environments.find((candidate) => candidate.slug === request.environmentSlug);

  if (!service || !environment) {
    return action;
  }

  await supabase.from("action_runs").insert({
    id: action.id,
    incident_id: request.incidentId ?? null,
    service_id: service.id,
    service_environment_id: environment.id,
    recipe: request.recipe,
    status: action.status,
    requested_by: request.requestedBy,
    summary: action.summary,
    request_payload: request,
    response_payload: action.responsePayload,
    created_at: action.createdAt,
    completed_at: action.completedAt ?? null
  });

  if (request.incidentId) {
    const updatePayload: Record<string, unknown> = {
      auto_remediation_attempted: true,
      latest_action_run_id: action.id,
      updated_at: isoNow()
    };
    if (request.recipe === "create_codex_escalation") {
      updatePayload.state = "escalated";
    }
    await supabase.from("incidents").update(updatePayload).eq("id", request.incidentId);
  }

  return action;
}

export async function createCodexEscalation(
  incidentId: string,
  requestedBy = "operator"
): Promise<{ bundle: CodexEscalationBundle; actionRun: ActionRunResult | null }> {
  const incident = await getIncident(incidentId);
  if (!incident) {
    throw new Error("Incident not found.");
  }

  const bundle = codexEscalationBundleSchema.parse({
    incidentId,
    serviceSlug: incident.serviceSlug,
    environmentSlug: incident.environmentSlug,
    fingerprint: incident.fingerprint,
    severity: incident.severity,
    state: incident.state,
    latestPublicCheck: {
      status: incident.latestCheckStatus,
      runType: incident.latestRunType
    },
    latestVerifyResult: {
      summary: incident.summary
    },
    currentBuild: incident.latestVersionBuild,
    artifactLinks: incident.latestArtifacts,
    recommendedNextPath:
      incident.recommendedNextPath ??
      "Review incident bundle, then open a Codex thread with the escalation payload.",
    generatedAt: isoNow()
  });

  const actionRun = actionRunResultSchema.parse({
    id: crypto.randomUUID(),
    incidentId,
    serviceSlug: incident.serviceSlug,
    environmentSlug: incident.environmentSlug,
    recipe: "create_codex_escalation",
    status: "succeeded",
    summary: "Codex escalation bundle generated and stored.",
    artifacts: bundle.artifactLinks,
    responsePayload: bundle,
    createdAt: isoNow(),
    completedAt: isoNow()
  });

  if (isDemoMode()) {
    const demo = getDemoState();
    demo.codexEscalations.unshift({
      id: crypto.randomUUID(),
      incidentId,
      serviceSlug: incident.serviceSlug,
      environmentSlug: incident.environmentSlug,
      status: "open",
      recommendedNextPath: bundle.recommendedNextPath,
      createdAt: bundle.generatedAt
    });
    await persistActionRun(actionRun, {
      incidentId,
      serviceSlug: incident.serviceSlug,
      environmentSlug: incident.environmentSlug,
      recipe: "create_codex_escalation",
      requestedBy,
      reason: "Operator escalation",
      metadata: {}
    });
    return { bundle, actionRun };
  }

  const supabase = getSupabaseAdmin();
  if (supabase) {
    await supabase.from("codex_escalations").insert({
      incident_id: incidentId,
      status: "open",
      bundle,
      recommended_next_path: bundle.recommendedNextPath,
      created_at: bundle.generatedAt
    });
  }

  await persistActionRun(actionRun, {
    incidentId,
    serviceSlug: incident.serviceSlug,
    environmentSlug: incident.environmentSlug,
    recipe: "create_codex_escalation",
    requestedBy,
    reason: "Operator escalation",
    metadata: {}
  });

  return { bundle, actionRun };
}

export async function runAction(request: ActionDispatchRequest): Promise<{
  actionRun: ActionRunResult;
  incident: IncidentSnapshot | null;
  escalationBundle?: CodexEscalationBundle;
}> {
  if (request.recipe === "create_codex_escalation" && request.incidentId) {
    const escalation = await createCodexEscalation(request.incidentId, request.requestedBy);
    return {
      actionRun: escalation.actionRun ?? actionRunResultSchema.parse({
        id: crypto.randomUUID(),
        incidentId: request.incidentId,
        serviceSlug: request.serviceSlug,
        environmentSlug: request.environmentSlug,
        recipe: "create_codex_escalation",
        status: "failed",
        summary: "Codex escalation could not be recorded.",
        artifacts: [],
        responsePayload: {},
        createdAt: isoNow(),
        completedAt: isoNow()
      }),
      incident: await getIncident(request.incidentId),
      escalationBundle: escalation.bundle
    };
  }

  if (request.recipe === "recheck_public_health") {
    const existingIncident = request.incidentId ? await getIncident(request.incidentId) : null;
    const probe = await runStudioPublicProbe(request.environmentSlug);
    const ingest = await recordCheckResult({
      ...probe,
      source: "manual",
      runType: "public_probe",
      fingerprint:
        existingIncident?.fingerprint ??
        buildIncidentFingerprint(request.serviceSlug, request.environmentSlug, "public_probe")
    });

    const actionRun = actionRunResultSchema.parse({
      id: crypto.randomUUID(),
      incidentId: request.incidentId,
      serviceSlug: request.serviceSlug,
      environmentSlug: request.environmentSlug,
      recipe: request.recipe,
      status: probe.status === "healthy" ? "succeeded" : "failed",
      summary:
        probe.status === "healthy"
          ? "Public recheck returned healthy Studio signals."
          : "Public recheck still found failing or degraded Studio signals.",
      artifacts: probe.artifacts ?? [],
      responsePayload: probe,
      createdAt: isoNow(),
      completedAt: isoNow()
    });
    await persistActionRun(actionRun, request);
    return {
      actionRun,
      incident: ingest.incident
    };
  }

  if (request.recipe === "trigger_staging_verify" || request.recipe === "collect_incident_bundle") {
    const dispatch = await dispatchStudioWorkflow({
      recipe: request.recipe,
      incidentId: request.incidentId,
      serviceSlug: request.serviceSlug,
      environmentSlug: request.environmentSlug
    });

    const actionRun = actionRunResultSchema.parse({
      id: crypto.randomUUID(),
      incidentId: request.incidentId,
      serviceSlug: request.serviceSlug,
      environmentSlug: request.environmentSlug,
      recipe: request.recipe,
      status: dispatch.queued ? "succeeded" : "failed",
      summary: dispatch.summary,
      artifacts: dispatch.runUrl
        ? [
            {
              kind: "workflow-artifact",
              label: "GitHub workflow",
              href: dispatch.runUrl
            }
          ]
        : [],
      responsePayload: dispatch,
      createdAt: isoNow(),
      completedAt: isoNow()
    });
    await persistActionRun(actionRun, request);
    return {
      actionRun,
      incident: request.incidentId ? await getIncident(request.incidentId) : null
    };
  }

  const fallback = actionRunResultSchema.parse({
    id: crypto.randomUUID(),
    incidentId: request.incidentId,
    serviceSlug: request.serviceSlug,
    environmentSlug: request.environmentSlug,
    recipe: request.recipe,
    status: "failed",
    summary: `Unsupported action recipe: ${request.recipe}`,
    artifacts: [],
    responsePayload: {},
    createdAt: isoNow(),
    completedAt: isoNow()
  });
  await persistActionRun(fallback, request);
  return {
    actionRun: fallback,
    incident: request.incidentId ? await getIncident(request.incidentId) : null
  };
}

export async function evaluateEscalationNeed(incidentId: string): Promise<{
  shouldEscalate: boolean;
  incident: IncidentSnapshot | null;
}> {
  const incident = await getIncident(incidentId);
  if (!incident) {
    return {
      shouldEscalate: false,
      incident: null
    };
  }

  const actions = await listActionRuns();
  const related = actions.filter((action) => action.incidentId === incidentId);
  const lastRemediation = related.find((action) => action.recipe !== "create_codex_escalation");
  const followUpFailed = lastRemediation?.status === "failed";

  return {
    shouldEscalate: shouldEscalateToCodex({
      severity: incident.severity,
      actionAttemptFailed: Boolean(lastRemediation),
      followUpVerifyFailed: followUpFailed,
      openDurationMinutes: minutesBetween(incident.openedAt)
    }),
    incident
  };
}
