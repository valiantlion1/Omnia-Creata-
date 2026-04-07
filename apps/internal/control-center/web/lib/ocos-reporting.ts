import {
  type ActionRunResult,
  type ArtifactBlob,
  type IncidentSnapshot,
  type OcosReport,
  type ProjectView,
  type ReportType,
  type ServiceView,
  ocosReportSchema
} from "@ocos/contracts";

import {
  activeIncidentStates,
  combineStatuses,
  getDemoState,
  isDemoMode,
  loadDerivedBundle,
  loadRawSnapshot,
  reportScopeKey
} from "@/lib/ocos-bundle";
import { isoNow } from "@/lib/crypto";
import { getSupabaseAdmin } from "@/lib/supabase";

type RawRow = Record<string, unknown>;

function startOfUtcDay(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)).toISOString();
}

function endOfUtcDay(date = new Date()): string {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999)).toISOString();
}

function startOfUtcWeek(date = new Date()): string {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
  const weekday = value.getUTCDay() === 0 ? 7 : value.getUTCDay();
  value.setUTCDate(value.getUTCDate() - weekday + 1);
  return value.toISOString();
}

function endOfUtcWeek(date = new Date()): string {
  const value = new Date(startOfUtcWeek(date));
  value.setUTCDate(value.getUTCDate() + 6);
  value.setUTCHours(23, 59, 59, 999);
  return value.toISOString();
}

function reportWindow(reportType: "overview" | "daily" | "weekly") {
  const now = new Date();
  if (reportType === "weekly") {
    return {
      periodStart: startOfUtcWeek(now),
      periodEnd: endOfUtcWeek(now)
    };
  }

  return {
    periodStart: startOfUtcDay(now),
    periodEnd: endOfUtcDay(now)
  };
}

function withinWindow(candidate: string | undefined, startIso: string, endIso: string): boolean {
  if (!candidate) {
    return false;
  }
  const value = Date.parse(candidate);
  return value >= Date.parse(startIso) && value <= Date.parse(endIso);
}

function formatBucketLabel(input: string, reportType: "overview" | "daily" | "weekly"): string {
  const date = new Date(input);
  return reportType === "weekly"
    ? new Intl.DateTimeFormat("en-GB", { month: "short", day: "2-digit" }).format(date)
    : new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(date);
}

function statusToScore(status: string | undefined): number {
  if (status === "failed") {
    return 0;
  }
  if (status === "degraded") {
    return 55;
  }
  return 100;
}

function buildHealthTrendSeries(checkRuns: RawRow[], projectServices: ServiceView[], reportType: "overview" | "daily" | "weekly") {
  const pointsByEnvironment = new Map<string, Array<{ x: string; y: number }>>();

  for (const checkRun of [...checkRuns].reverse()) {
    const environmentId = String(checkRun.service_environment_id);
    const environment = projectServices
      .flatMap((service) => service.environments)
      .find((candidate) => candidate.id === environmentId);
    if (!environment) {
      continue;
    }

    const points = pointsByEnvironment.get(environment.name) ?? [];
    points.push({
      x: formatBucketLabel(String(checkRun.recorded_at ?? isoNow()), reportType),
      y: statusToScore(String(checkRun.status))
    });
    pointsByEnvironment.set(environment.name, points.slice(-12));
  }

  return [...pointsByEnvironment.entries()].map(([name, points]) => ({
    name,
    points
  }));
}

function buildIncidentVolumeSeries(incidents: IncidentSnapshot[], reportType: "overview" | "daily" | "weekly") {
  const buckets = new Map<string, number>();
  for (const incident of incidents) {
    const key = reportType === "weekly"
      ? new Intl.DateTimeFormat("en-GB", { month: "short", day: "2-digit" }).format(new Date(incident.openedAt))
      : new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(new Date(incident.openedAt));
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  return [
    {
      name: "Incidents",
      points: [...buckets.entries()].map(([x, y]) => ({ x, y }))
    }
  ];
}

function buildActionOutcomeSeries(actionRuns: ActionRunResult[]) {
  const counts = new Map<string, number>();
  for (const actionRun of actionRuns) {
    counts.set(actionRun.status, (counts.get(actionRun.status) ?? 0) + 1);
  }

  return [
    {
      name: "Actions",
      points: [...counts.entries()].map(([x, y]) => ({ x, y }))
    }
  ];
}

function buildAvailabilitySeries(checkRuns: RawRow[], reportType: "overview" | "daily" | "weekly") {
  return [
    {
      name: "Availability",
      points: [...checkRuns]
        .reverse()
        .slice(-18)
        .map((checkRun) => ({
          x: formatBucketLabel(String(checkRun.recorded_at ?? isoNow()), reportType),
          y: statusToScore(String(checkRun.status))
      }))
    }
  ];
}

function buildProjectReportFromState(input: {
  project: ProjectView;
  projectServices: ServiceView[];
  incidents: IncidentSnapshot[];
  actionRuns: ActionRunResult[];
  checkRuns: RawRow[];
  reportType: "overview" | "daily" | "weekly";
}): OcosReport {
  const activeIncidents = input.incidents.filter(activeIncidentStates);
  const window = reportWindow(input.reportType);
  const healthyChecks = input.checkRuns.filter((checkRun) => String(checkRun.status) === "healthy").length;
  const totalChecks = input.checkRuns.length;
  const degradedChecks = input.checkRuns.filter((checkRun) => String(checkRun.status) !== "healthy").length;
  const availability = totalChecks ? Number(((healthyChecks / totalChecks) * 100).toFixed(1)) : 100;
  const errorRate = totalChecks ? Number(((degradedChecks / totalChecks) * 100).toFixed(1)) : 0;

  const findings = activeIncidents.length
    ? [
        `${activeIncidents.length} active incident${activeIncidents.length === 1 ? "" : "s"} in the queue.`,
        `${input.actionRuns.length} bounded action run${input.actionRuns.length === 1 ? "" : "s"} recorded in this window.`,
        `Current project status is ${input.project.currentStatus}.`
      ]
    : [
        "No active incidents in the current project queue.",
        `${input.projectServices.length} service${input.projectServices.length === 1 ? "" : "s"} remain under sparse monitoring.`,
        "Bounded action lane is currently quiet."
      ];

  const recommendedActions = activeIncidents.length
    ? activeIncidents
        .map((incident) => incident.recommendedNextPath)
        .filter((value): value is string => Boolean(value))
        .slice(0, 3)
    : ["No immediate intervention required; keep sparse probes and bounded workflows armed."];

  return ocosReportSchema.parse({
    id: crypto.randomUUID(),
    projectSlug: input.project.slug,
    projectName: input.project.name,
    scopeLevel: "project",
    scopeKey: reportScopeKey(input.project.slug),
    reportType: input.reportType,
    status: input.project.currentStatus,
    headline:
      input.project.currentStatus === "healthy"
        ? `${input.project.name} is stable across ${input.project.environmentCount} environments.`
        : `${input.project.name} is ${input.project.currentStatus} with ${activeIncidents.length} active incident${activeIncidents.length === 1 ? "" : "s"}.`,
    periodStart: window.periodStart,
    periodEnd: window.periodEnd,
    summary: {
      headline:
        input.project.currentStatus === "healthy"
          ? `${input.project.name} is stable.`
          : `${input.project.name} is ${input.project.currentStatus}.`,
      status: input.project.currentStatus,
      keyFindings: findings,
      recommendedActions
    },
    metrics: [
      {
        key: "availability",
        label: "Availability",
        value: availability,
        unit: "%"
      },
      {
        key: "error_rate",
        label: "Error rate",
        value: errorRate,
        unit: "%"
      },
      {
        key: "deployment_verifies",
        label: "Deploy verifies",
        value: input.checkRuns.filter((checkRun) => String(checkRun.run_type) === "deployment_verify").length
      },
      {
        key: "bounded_actions",
        label: "Bounded actions",
        value: input.actionRuns.length
      }
    ],
    charts: [
      {
        id: "health-trend",
        type: "line",
        label: "Health trend",
        series: buildHealthTrendSeries(input.checkRuns, input.projectServices, input.reportType)
      },
      {
        id: "incident-volume",
        type: "bar",
        label: "Incident volume",
        series: buildIncidentVolumeSeries(input.incidents, input.reportType)
      },
      {
        id: "action-outcomes",
        type: "bar",
        label: "Action outcomes",
        series: buildActionOutcomeSeries(input.actionRuns)
      },
      {
        id: "availability-sparkline",
        type: "sparkline",
        label: "Availability",
        series: buildAvailabilitySeries(input.checkRuns, input.reportType)
      }
    ],
    incidents: input.incidents.slice(0, 8).map((incident) => ({
      id: incident.id,
      severity: incident.severity,
      state: incident.state,
      summary: incident.summary
    })),
    source: "system",
    createdAt: isoNow(),
    updatedAt: isoNow()
  });
}

async function upsertReport(report: OcosReport): Promise<OcosReport> {
  if (isDemoMode()) {
    return report;
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return report;
  }

  const { data: projectRow } = await supabase
    .from("projects")
    .select("id, slug, name")
    .eq("slug", report.projectSlug)
    .maybeSingle();

  if (!projectRow) {
    return report;
  }

  const payload = {
    summary: report.summary,
    metrics: report.metrics,
    charts: report.charts,
    incidents: report.incidents
  };

  const { data } = await supabase
    .from("reports")
    .upsert(
      {
        project_id: projectRow.id,
        scope_level: report.scopeLevel,
        scope_key: report.scopeKey,
        report_type: report.reportType,
        status: report.status,
        headline: report.headline,
        period_start: report.periodStart,
        period_end: report.periodEnd,
        payload,
        source: report.source,
        updated_at: isoNow()
      },
      {
        onConflict: "scope_key,report_type,period_start,period_end"
      }
    )
    .select("*")
    .single();

  return data
    ? ocosReportSchema.parse({
        id: String(data.id),
        projectSlug: String(projectRow.slug),
        projectName: String(projectRow.name),
        scopeLevel: data.scope_level,
        scopeKey: String(data.scope_key),
        reportType: data.report_type,
        status: data.status,
        headline: String(data.headline),
        periodStart: String(data.period_start),
        periodEnd: String(data.period_end),
        summary: payload.summary,
        metrics: payload.metrics,
        charts: payload.charts,
        incidents: payload.incidents,
        source: String(data.source ?? "system"),
        createdAt: String(data.created_at ?? isoNow()),
        updatedAt: String(data.updated_at ?? isoNow())
      })
    : report;
}

export function buildDemoReports(): OcosReport[] {
  const state = getDemoState();
  const reportTypes: Array<"overview" | "daily" | "weekly"> = ["overview", "daily", "weekly"];
  const project = {
    id: "studio",
    slug: "studio",
    name: "OmniaCreata Studio",
    description: "Studio-first project cockpit for OCOS foundation.",
    currentStatus: combineStatuses(
      state.services.flatMap((service) => service.environments.map((environment) => environment.currentStatus))
    ),
    serviceCount: state.services.length,
    environmentCount: state.services.flatMap((service) => service.environments).length,
    totalOpenIncidents: state.incidents.filter(activeIncidentStates).length,
    incidentsBySeverity: {
      P1: state.incidents.filter((incident) => activeIncidentStates(incident) && incident.severity === "P1").length,
      P2: state.incidents.filter((incident) => activeIncidentStates(incident) && incident.severity === "P2").length,
      P3: state.incidents.filter((incident) => activeIncidentStates(incident) && incident.severity === "P3").length
    }
  } satisfies ProjectView;

  return reportTypes.map((reportType) =>
    buildProjectReportFromState({
      project,
      projectServices: state.services,
      incidents: state.incidents,
      actionRuns: state.actionRuns,
      checkRuns: state.services.flatMap((service) => service.environments).map((environment) => ({
        service_environment_id: environment.id,
        status: environment.currentStatus,
        recorded_at: isoNow(),
        run_type: "public_probe"
      })),
      reportType
    })
  );
}

export async function buildAndPersistProjectReport(
  projectSlug: string,
  reportType: "overview" | "daily" | "weekly"
): Promise<OcosReport | null> {
  if (isDemoMode()) {
    return buildDemoReports().find(
      (report) => report.projectSlug === projectSlug && report.reportType === reportType
    ) ?? null;
  }

  const snapshot = await loadRawSnapshot();
  if (!snapshot) {
    return null;
  }

  const bundle = await loadDerivedBundle();
  const project = bundle.projects.find((candidate) => candidate.slug === projectSlug);
  if (!project) {
    return null;
  }

  const projectServices = bundle.services.filter((service) => service.projectSlug === projectSlug);
  const projectServiceIds = new Set(projectServices.map((service) => service.id));
  const window = reportWindow(reportType);
  const incidents = bundle.incidents.filter((incident) => {
    if (incident.projectSlug !== projectSlug) {
      return false;
    }
    if (reportType === "overview") {
      return activeIncidentStates(incident) || withinWindow(incident.updatedAt, window.periodStart, window.periodEnd);
    }
    return withinWindow(incident.updatedAt, window.periodStart, window.periodEnd);
  });
  const actionRuns = bundle.actionRuns.filter(
    (actionRun) =>
      actionRun.projectSlug === projectSlug &&
      withinWindow(actionRun.createdAt, window.periodStart, window.periodEnd)
  );
  const checkRuns = snapshot.checkRuns.filter(
    (checkRun) =>
      projectServiceIds.has(String(checkRun.service_id)) &&
      withinWindow(String(checkRun.recorded_at ?? ""), window.periodStart, window.periodEnd)
  );

  return upsertReport(
    buildProjectReportFromState({
      project,
      projectServices,
      incidents,
      actionRuns,
      checkRuns,
      reportType
    })
  );
}

export async function ensureOverviewReports(): Promise<void> {
  if (isDemoMode()) {
    return;
  }

  const bundle = await loadDerivedBundle();
  await Promise.all(bundle.projects.map((project) => buildAndPersistProjectReport(project.slug, "overview")));
}
