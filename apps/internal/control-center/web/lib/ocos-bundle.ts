import {
  type ActionRunResult,
  type ArtifactBlob,
  type CheckStatus,
  type CodexEscalationSummary,
  type IncidentSnapshot,
  type JsonValue,
  type NotificationPlan,
  type OcosReport,
  type ProjectSummaryView,
  type ProjectView,
  type ServiceView,
  actionRunResultSchema,
  codexEscalationSummarySchema,
  incidentSnapshotSchema,
  notificationPlanSchema,
  ocosReportSchema,
  projectSummaryViewSchema,
  projectViewSchema,
  serviceViewSchema,
  studioProjectDefinition,
  studioServiceDefinition
} from "@ocos/contracts";

import { isoNow, minutesBetween } from "@/lib/crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

type RawRow = Record<string, unknown>;

export type RawSnapshot = {
  generatedAt: string;
  projects: RawRow[];
  services: RawRow[];
  environments: RawRow[];
  checkRuns: RawRow[];
  incidents: RawRow[];
  actionRuns: RawRow[];
  codexEscalations: RawRow[];
  artifacts: RawRow[];
  reports: RawRow[];
};

export type LoadedBundle = {
  generatedAt: string;
  projects: ProjectView[];
  services: ServiceView[];
  incidents: IncidentSnapshot[];
  actionRuns: ActionRunResult[];
  codexEscalations: CodexEscalationSummary[];
  reports: OcosReport[];
};

type DemoState = {
  services: ServiceView[];
  incidents: IncidentSnapshot[];
  actionRuns: ActionRunResult[];
  codexEscalations: CodexEscalationSummary[];
};

declare global {
  var __OCOS_DEMO_STATE__: DemoState | undefined;
}

export function sortStatus(status: CheckStatus): number {
  if (status === "failed") {
    return 0;
  }
  if (status === "degraded") {
    return 1;
  }
  return 2;
}

export function combineStatuses(statuses: CheckStatus[]): CheckStatus {
  if (statuses.some((status) => status === "failed")) {
    return "failed";
  }
  if (statuses.some((status) => status === "degraded")) {
    return "degraded";
  }
  return "healthy";
}

export function activeIncidentStates(snapshot: IncidentSnapshot): boolean {
  return snapshot.state !== "resolved";
}

export function reportScopeKey(projectSlug: string): string {
  return `project:${projectSlug}`;
}

export function isDemoMode(): boolean {
  return getSupabaseAdmin() === null;
}

function createDemoState(): DemoState {
  const now = isoNow();
  const openedAt = new Date(Date.now() - 8 * 60000).toISOString();
  const actionCreatedAt = new Date(Date.now() - 6 * 60000).toISOString();

  return {
    services: [
      serviceViewSchema.parse({
        id: "svc-studio",
        projectSlug: "studio",
        projectName: studioProjectDefinition.name,
        slug: "studio",
        name: studioServiceDefinition.name,
        description: "Studio-first monitored surface for OCOS foundation.",
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
      })
    ],
    incidents: [
      incidentSnapshotSchema.parse({
        id: "inc-demo-1",
        projectSlug: "studio",
        projectName: studioProjectDefinition.name,
        serviceSlug: "studio",
        serviceName: studioServiceDefinition.name,
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
        openedAt,
        updatedAt: now,
        lastSeenAt: now,
        openDurationMinutes: minutesBetween(openedAt, now)
      })
    ],
    actionRuns: [
      actionRunResultSchema.parse({
        id: "act-demo-1",
        incidentId: "inc-demo-1",
        projectSlug: "studio",
        projectName: studioProjectDefinition.name,
        serviceSlug: "studio",
        environmentSlug: "production",
        recipe: "recheck_public_health",
        status: "failed",
        summary: "Immediate public recheck still returned degraded Studio health.",
        artifacts: [],
        responsePayload: {
          status: "degraded"
        },
        createdAt: actionCreatedAt,
        completedAt: now
      })
    ],
    codexEscalations: [
      codexEscalationSummarySchema.parse({
        id: "esc-demo-1",
        incidentId: "inc-demo-1",
        projectSlug: "studio",
        projectName: studioProjectDefinition.name,
        serviceSlug: "studio",
        environmentSlug: "production",
        status: "queued",
        recommendedNextPath: "Investigate provider auth drift before another rollout.",
        createdAt: now
      })
    ]
  };
}

export function getDemoState(): DemoState {
  if (!globalThis.__OCOS_DEMO_STATE__) {
    globalThis.__OCOS_DEMO_STATE__ = createDemoState();
  }
  return globalThis.__OCOS_DEMO_STATE__;
}

export function buildNotificationPlan(input: {
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
    title: `${input.incident.projectName} ${input.incident.environmentName} ${input.action}`,
    body: `${input.incident.summary} (${input.incident.severity}/${input.incident.state})`,
    deepLink: `/projects/${input.incident.projectSlug}/operations?incident=${input.incident.id}`
  });
}

export async function loadRawSnapshot(): Promise<RawSnapshot | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return null;
  }

  const [
    projectsResponse,
    servicesResponse,
    environmentsResponse,
    checkRunsResponse,
    incidentsResponse,
    actionRunsResponse,
    codexEscalationsResponse,
    artifactsResponse,
    reportsResponse
  ] = await Promise.all([
    supabase.from("projects").select("*").order("name"),
    supabase.from("services").select("*").order("name"),
    supabase.from("service_environments").select("*").order("name"),
    supabase.from("check_runs").select("*").order("recorded_at", { ascending: false }).limit(240),
    supabase.from("incidents").select("*").order("last_seen_at", { ascending: false }).limit(120),
    supabase.from("action_runs").select("*").order("created_at", { ascending: false }).limit(120),
    supabase.from("codex_escalations").select("*").order("created_at", { ascending: false }).limit(80),
    supabase.from("artifact_blobs").select("*").order("created_at", { ascending: false }).limit(240),
    supabase.from("reports").select("*").order("updated_at", { ascending: false }).limit(120)
  ]);

  return {
    generatedAt: isoNow(),
    projects: projectsResponse.data ?? [],
    services: servicesResponse.data ?? [],
    environments: environmentsResponse.data ?? [],
    checkRuns: checkRunsResponse.data ?? [],
    incidents: incidentsResponse.data ?? [],
    actionRuns: actionRunsResponse.data ?? [],
    codexEscalations: codexEscalationsResponse.data ?? [],
    artifacts: artifactsResponse.data ?? [],
    reports: reportsResponse.data ?? []
  };
}

function latestReportAtForProject(projectSlug: string, reports: OcosReport[]): string | undefined {
  return reports
    .filter((report) => report.projectSlug === projectSlug)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0]?.updatedAt;
}

function mapReportRow(row: RawRow, projectLookup: Map<string, RawRow>): OcosReport {
  const project = projectLookup.get(String(row.project_id));
  const payload = ((row.payload ?? {}) as Record<string, unknown>) ?? {};

  return ocosReportSchema.parse({
    id: String(row.id),
    projectSlug: String(project?.slug ?? "unknown"),
    projectName: String(project?.name ?? "Unknown project"),
    scopeLevel: row.scope_level,
    scopeKey: String(row.scope_key),
    reportType: row.report_type,
    status: row.status,
    headline: String(row.headline),
    periodStart: String(row.period_start),
    periodEnd: String(row.period_end),
    summary: payload.summary ?? {
      headline: String(row.headline),
      status: row.status,
      keyFindings: [],
      recommendedActions: []
    },
    metrics: Array.isArray(payload.metrics) ? payload.metrics : [],
    charts: Array.isArray(payload.charts) ? payload.charts : [],
    incidents: Array.isArray(payload.incidents) ? payload.incidents : [],
    source: String(row.source ?? "system"),
    createdAt: String(row.created_at ?? isoNow()),
    updatedAt: String(row.updated_at ?? isoNow())
  });
}

function buildProjectViews(services: ServiceView[], incidents: IncidentSnapshot[], reports: OcosReport[]): ProjectView[] {
  const seeds = new Map<string, { id: string; slug: string; name: string; description: string }>();

  for (const service of services) {
    seeds.set(service.projectSlug, {
      id: service.projectSlug,
      slug: service.projectSlug,
      name: service.projectName,
      description:
        service.projectSlug === studioProjectDefinition.slug
          ? studioProjectDefinition.description
          : `${service.projectName} project.`
    });
  }

  return [...seeds.values()]
    .map((project) => {
      const projectServices = services.filter((service) => service.projectSlug === project.slug);
      const projectIncidents = incidents.filter(
        (incident) => incident.projectSlug === project.slug && activeIncidentStates(incident)
      );

      return projectViewSchema.parse({
        id: project.id,
        slug: project.slug,
        name: project.name,
        description: project.description,
        currentStatus: combineStatuses(
          projectServices.flatMap((service) => service.environments.map((environment) => environment.currentStatus))
        ),
        serviceCount: projectServices.length,
        environmentCount: projectServices.flatMap((service) => service.environments).length,
        totalOpenIncidents: projectIncidents.length,
        incidentsBySeverity: {
          P1: projectIncidents.filter((incident) => incident.severity === "P1").length,
          P2: projectIncidents.filter((incident) => incident.severity === "P2").length,
          P3: projectIncidents.filter((incident) => incident.severity === "P3").length
        },
        latestReportAt: latestReportAtForProject(project.slug, reports)
      });
    })
    .sort((left, right) => {
      const statusCompare = sortStatus(left.currentStatus) - sortStatus(right.currentStatus);
      if (statusCompare !== 0) {
        return statusCompare;
      }
      return left.name.localeCompare(right.name);
    });
}

function deriveLiveBundle(snapshot: RawSnapshot): LoadedBundle {
  const projectLookup = new Map(snapshot.projects.map((project) => [String(project.id), project]));
  const serviceRowLookup = new Map(snapshot.services.map((service) => [String(service.id), service]));
  const environmentRowsByService = new Map<string, RawRow[]>();
  const latestCheckByEnvironmentId = new Map<string, RawRow>();
  const activeIncidentByEnvironmentId = new Map<string, RawRow>();
  const artifactRowsByIncidentId = new Map<string, ArtifactBlob[]>();
  const checkRunLookup = new Map(snapshot.checkRuns.map((row) => [String(row.id), row]));

  for (const environment of snapshot.environments) {
    const key = String(environment.service_id);
    const rows = environmentRowsByService.get(key) ?? [];
    rows.push(environment);
    environmentRowsByService.set(key, rows);
  }

  for (const checkRun of snapshot.checkRuns) {
    const key = String(checkRun.service_environment_id);
    if (!latestCheckByEnvironmentId.has(key)) {
      latestCheckByEnvironmentId.set(key, checkRun);
    }
  }

  for (const incident of snapshot.incidents) {
    if (String(incident.state) === "resolved") {
      continue;
    }
    const key = String(incident.service_environment_id);
    if (!activeIncidentByEnvironmentId.has(key)) {
      activeIncidentByEnvironmentId.set(key, incident);
    }
  }

  for (const artifact of snapshot.artifacts) {
    if (!artifact.incident_id) {
      continue;
    }
    const key = String(artifact.incident_id);
    const rows = artifactRowsByIncidentId.get(key) ?? [];
    rows.push({
      id: String(artifact.id),
      kind: artifact.kind as ArtifactBlob["kind"],
      label: String(artifact.label),
      href: String(artifact.href),
      sha256: artifact.sha256 ? String(artifact.sha256) : undefined,
      metadata: (artifact.metadata ?? {}) as Record<string, JsonValue>
    });
    artifactRowsByIncidentId.set(key, rows);
  }

  const services = snapshot.services
    .map((serviceRow) => {
      const projectRow = projectLookup.get(String(serviceRow.project_id));
      const environments = (environmentRowsByService.get(String(serviceRow.id)) ?? []).map((environmentRow) => {
        const activeIncident = activeIncidentByEnvironmentId.get(String(environmentRow.id));
        const latestCheck = latestCheckByEnvironmentId.get(String(environmentRow.id));
        const currentStatus = activeIncident
          ? String(activeIncident.severity) === "P1"
            ? "failed"
            : "degraded"
          : ((latestCheck?.status as CheckStatus | undefined) ?? "healthy");

        return {
          id: String(environmentRow.id),
          slug: environmentRow.slug as "staging" | "production",
          name: String(environmentRow.name),
          baseUrl: String(environmentRow.base_url),
          cadenceMinutes: Number(environmentRow.cadence_minutes),
          currentStatus,
          lastCheckAt: latestCheck?.recorded_at ? String(latestCheck.recorded_at) : undefined,
          lastBuild: latestCheck?.version_build ? String(latestCheck.version_build) : undefined
        };
      });

      return serviceViewSchema.parse({
        id: String(serviceRow.id),
        projectSlug: String(projectRow?.slug ?? studioProjectDefinition.slug),
        projectName: String(projectRow?.name ?? studioProjectDefinition.name),
        slug: String(serviceRow.slug),
        name: String(serviceRow.name),
        description: String(serviceRow.description ?? ""),
        environments
      });
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const serviceLookup = new Map(services.map((service) => [service.id, service]));
  const environmentLookup = new Map(
    services.flatMap((service) => service.environments.map((environment) => [environment.id, environment] as const))
  );

  const incidents = snapshot.incidents.map((row) => {
    const service = serviceLookup.get(String(row.service_id));
    const environment = environmentLookup.get(String(row.service_environment_id));
    const latestCheck =
      checkRunLookup.get(String(row.latest_check_run_id)) ??
      latestCheckByEnvironmentId.get(String(row.service_environment_id));
    const openedAt = String(row.opened_at ?? isoNow());
    const updatedAt = String(row.updated_at ?? openedAt);

    return incidentSnapshotSchema.parse({
      id: String(row.id),
      projectSlug: service?.projectSlug ?? studioProjectDefinition.slug,
      projectName: service?.projectName ?? studioProjectDefinition.name,
      serviceSlug: service?.slug ?? String(serviceRowLookup.get(String(row.service_id))?.slug ?? "unknown"),
      serviceName: service?.name ?? String(serviceRowLookup.get(String(row.service_id))?.name ?? "Unknown service"),
      environmentSlug: (environment?.slug ?? "production") as "staging" | "production",
      environmentName: environment?.name ?? "Unknown environment",
      title: String(row.title ?? "Untitled incident"),
      summary: String(row.summary ?? "No summary recorded."),
      fingerprint: String(row.fingerprint ?? ""),
      severity: row.severity,
      state: row.state,
      latestCheckStatus: latestCheck?.status as CheckStatus | undefined,
      latestRunType: latestCheck?.run_type ? String(latestCheck.run_type) : undefined,
      latestVersionBuild: latestCheck?.version_build ? String(latestCheck.version_build) : undefined,
      latestArtifacts: artifactRowsByIncidentId.get(String(row.id)) ?? [],
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
  });

  const incidentLookup = new Map(incidents.map((incident) => [incident.id, incident]));

  const actionRuns = snapshot.actionRuns.map((row) => {
    const service = serviceLookup.get(String(row.service_id));
    const environment = environmentLookup.get(String(row.service_environment_id));
    const requestPayload = ((row.request_payload ?? {}) as Record<string, unknown>) ?? {};

    return actionRunResultSchema.parse({
      id: String(row.id),
      incidentId: row.incident_id ? String(row.incident_id) : undefined,
      projectSlug: service?.projectSlug ?? studioProjectDefinition.slug,
      projectName: service?.projectName ?? studioProjectDefinition.name,
      serviceSlug: service?.slug ?? "studio",
      environmentSlug: (environment?.slug ??
        ((requestPayload.environmentSlug as "staging" | "production" | undefined) ?? "production")) as "staging" | "production",
      recipe: row.recipe,
      status: row.status,
      summary: String(row.summary ?? ""),
      artifacts: [],
      responsePayload: ((row.response_payload ?? {}) as Record<string, JsonValue>) ?? {},
      createdAt: String(row.created_at ?? isoNow()),
      completedAt: row.completed_at ? String(row.completed_at) : undefined
    });
  });

  const codexEscalations = snapshot.codexEscalations.map((row) => {
    const incident = incidentLookup.get(String(row.incident_id));
    const bundle = ((row.bundle ?? {}) as Record<string, unknown>) ?? {};

    return codexEscalationSummarySchema.parse({
      id: String(row.id),
      incidentId: String(row.incident_id),
      projectSlug: incident?.projectSlug ?? String(bundle.projectSlug ?? studioProjectDefinition.slug),
      projectName: incident?.projectName ?? String(bundle.projectName ?? studioProjectDefinition.name),
      serviceSlug: incident?.serviceSlug ?? String(bundle.serviceSlug ?? "studio"),
      environmentSlug: (incident?.environmentSlug ?? bundle.environmentSlug ?? "production") as "staging" | "production",
      status: String(row.status ?? "open"),
      recommendedNextPath: String(
        row.recommended_next_path ??
          bundle.recommendedNextPath ??
          "Open the project operation surface and review the escalation bundle."
      ),
      createdAt: String(row.created_at ?? isoNow())
    });
  });

  const reports = snapshot.reports.map((row) => mapReportRow(row, projectLookup));
  const projects = buildProjectViews(services, incidents, reports);

  return {
    generatedAt: snapshot.generatedAt,
    projects,
    services,
    incidents,
    actionRuns,
    codexEscalations,
    reports
  };
}

export async function loadDerivedBundle(): Promise<LoadedBundle> {
  if (isDemoMode()) {
    const state = getDemoState();
    return {
      generatedAt: isoNow(),
      projects: buildProjectViews(state.services, state.incidents, []),
      services: state.services,
      incidents: state.incidents,
      actionRuns: state.actionRuns,
      codexEscalations: state.codexEscalations,
      reports: []
    };
  }

  const snapshot = await loadRawSnapshot();
  if (!snapshot) {
    const state = getDemoState();
    return {
      generatedAt: isoNow(),
      projects: buildProjectViews(state.services, state.incidents, []),
      services: state.services,
      incidents: state.incidents,
      actionRuns: state.actionRuns,
      codexEscalations: state.codexEscalations,
      reports: []
    };
  }

  return deriveLiveBundle(snapshot);
}

export function serviceTotalsFromServices(services: ServiceView[]) {
  const environments = services.flatMap((service) => service.environments);
  return {
    total: environments.length,
    healthy: environments.filter((environment) => environment.currentStatus === "healthy").length,
    degraded: environments.filter((environment) => environment.currentStatus === "degraded").length,
    failed: environments.filter((environment) => environment.currentStatus === "failed").length
  };
}

export function incidentsBySeverityFromIncidents(incidents: IncidentSnapshot[]) {
  const active = incidents.filter(activeIncidentStates);
  return {
    P1: active.filter((incident) => incident.severity === "P1").length,
    P2: active.filter((incident) => incident.severity === "P2").length,
    P3: active.filter((incident) => incident.severity === "P3").length
  };
}

export function buildProjectSummary(bundle: LoadedBundle, projectSlug: string): ProjectSummaryView | null {
  const project = bundle.projects.find((candidate) => candidate.slug === projectSlug);
  if (!project) {
    return null;
  }

  const services = bundle.services.filter((service) => service.projectSlug === projectSlug);
  const activeIncidents = bundle.incidents.filter(
    (incident) => incident.projectSlug === projectSlug && activeIncidentStates(incident)
  );
  const actionRuns = bundle.actionRuns.filter((actionRun) => actionRun.projectSlug === projectSlug);
  const codexEscalations = bundle.codexEscalations.filter((item) => item.projectSlug === projectSlug);
  const latestReports = bundle.reports
    .filter((report) => report.projectSlug === projectSlug)
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, 6)
    .map((report) => ({
      id: report.id,
      projectSlug: report.projectSlug,
      projectName: report.projectName,
      scopeLevel: report.scopeLevel,
      scopeKey: report.scopeKey,
      reportType: report.reportType,
      status: report.status,
      headline: report.headline,
      periodStart: report.periodStart,
      periodEnd: report.periodEnd,
      updatedAt: report.updatedAt
    }));
  const overviewReport = bundle.reports.find(
    (report) => report.projectSlug === projectSlug && report.reportType === "overview"
  );

  return projectSummaryViewSchema.parse({
    generatedAt: bundle.generatedAt,
    demoMode: isDemoMode(),
    project,
    services,
    serviceTotals: serviceTotalsFromServices(services),
    incidentsBySeverity: incidentsBySeverityFromIncidents(activeIncidents),
    activeIncidents,
    actionRuns,
    codexEscalations,
    latestReports,
    overviewReport
  });
}
