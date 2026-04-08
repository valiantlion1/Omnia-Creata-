import {
  type ActionDispatchRequest,
  type ActionRunResult,
  type CheckRunPayload,
  type CodexEscalationBundle,
  type IncidentSnapshot,
  type NotificationPlan,
  type OcosReport,
  type OrgSummaryView,
  type ProjectSummaryView,
  type ProjectView,
  type ServiceEventPayload,
  type ServiceView,
  actionRunResultSchema,
  buildIncidentFingerprint,
  codexEscalationBundleSchema,
  incidentSnapshotSchema,
  notificationPlanSchema,
  shouldEscalateToCodex,
  studioProjectDefinition,
  incidentThresholds
} from "@ocos/contracts";

import {
  activeIncidentStates,
  buildNotificationPlan,
  buildProjectSummary,
  getDemoState,
  incidentsBySeverityFromIncidents,
  isDemoMode,
  loadDerivedBundle,
  reportScopeKey,
  serviceTotalsFromServices
} from "@/lib/ocos-bundle";
import { buildAndPersistProjectReport, buildDemoReports, ensureOverviewReports } from "@/lib/ocos-reporting";
import { isoNow, minutesBetween } from "@/lib/crypto";
import { dispatchStudioWorkflow } from "@/lib/github";
import { runStudioPublicProbe } from "@/lib/studio-probe";
import { getSupabaseAdmin } from "@/lib/supabase";

export type SummaryView = OrgSummaryView;
export type { ServiceView };

async function loadProjectAwareBundle() {
  const bundle = await loadDerivedBundle();

  if (!isDemoMode()) {
    return bundle;
  }

  const demoReports = buildDemoReports();
  return {
    ...bundle,
    reports: demoReports,
    projects: bundle.projects.map((project) => ({
      ...project,
      latestReportAt: demoReports
        .filter((report) => report.projectSlug === project.slug)
        .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0]?.updatedAt
    }))
  };
}

export async function listProjects(): Promise<ProjectView[]> {
  return (await loadProjectAwareBundle()).projects;
}

export async function listServices(projectSlug?: string): Promise<ServiceView[]> {
  const services = (await loadProjectAwareBundle()).services;
  return projectSlug ? services.filter((service) => service.projectSlug === projectSlug) : services;
}

export async function listIncidents(projectSlug?: string): Promise<IncidentSnapshot[]> {
  const incidents = (await loadProjectAwareBundle()).incidents;
  return projectSlug ? incidents.filter((incident) => incident.projectSlug === projectSlug) : incidents;
}

export async function getIncident(incidentId: string): Promise<IncidentSnapshot | null> {
  const incidents = await listIncidents();
  return incidents.find((incident) => incident.id === incidentId) ?? null;
}

export async function listActionRuns(projectSlug?: string): Promise<ActionRunResult[]> {
  const actionRuns = (await loadProjectAwareBundle()).actionRuns;
  return projectSlug ? actionRuns.filter((actionRun) => actionRun.projectSlug === projectSlug) : actionRuns;
}

export async function listCodexEscalations(projectSlug?: string) {
  const codexEscalations = (await loadProjectAwareBundle()).codexEscalations;
  return projectSlug
    ? codexEscalations.filter((codexEscalation) => codexEscalation.projectSlug === projectSlug)
    : codexEscalations;
}

export async function listReports(input: {
  projectSlug?: string;
  scopeLevel?: "project" | "service" | "incident";
  reportType?: "overview" | "daily" | "weekly" | "incident_snapshot";
  limit?: number;
} = {}): Promise<OcosReport[]> {
  const reports = (await loadProjectAwareBundle()).reports;
  return reports
    .filter((report) => (input.projectSlug ? report.projectSlug === input.projectSlug : true))
    .filter((report) => (input.scopeLevel ? report.scopeLevel === input.scopeLevel : true))
    .filter((report) => (input.reportType ? report.reportType === input.reportType : true))
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
    .slice(0, input.limit ?? 50);
}

export async function upsertProjectOverviewReport(projectSlug: string): Promise<OcosReport | null> {
  return buildAndPersistProjectReport(projectSlug, "overview");
}

export async function upsertProjectPeriodicReport(projectSlug: string, reportType: "daily" | "weekly"): Promise<OcosReport | null> {
  return buildAndPersistProjectReport(projectSlug, reportType);
}

export async function getProject(projectSlug: string): Promise<ProjectSummaryView | null> {
  await upsertProjectOverviewReport(projectSlug);
  await upsertProjectPeriodicReport(projectSlug, "daily");
  await upsertProjectPeriodicReport(projectSlug, "weekly");

  return buildProjectSummary(await loadProjectAwareBundle(), projectSlug);
}

export async function getSummary(): Promise<OrgSummaryView> {
  await ensureOverviewReports();
  const bundle = await loadProjectAwareBundle();
  const activeIncidents = bundle.incidents.filter(activeIncidentStates);

  return {
    generatedAt: bundle.generatedAt,
    demoMode: isDemoMode(),
    organizationTotals: {
      projects: bundle.projects.length,
      services: bundle.services.length,
      environments: bundle.services.flatMap((service) => service.environments).length
    },
    serviceTotals: serviceTotalsFromServices(bundle.services),
    incidentsBySeverity: incidentsBySeverityFromIncidents(bundle.incidents),
    projects: bundle.projects,
    activeIncidents,
    actionRuns: bundle.actionRuns.slice(0, 8),
    codexEscalations: bundle.codexEscalations.slice(0, 8),
    latestReports: bundle.reports
      .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))
      .slice(0, 8)
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
      }))
  };
}

async function refreshProjectOverview(projectSlug: string): Promise<void> {
  if (!isDemoMode()) {
    await buildAndPersistProjectReport(projectSlug, "overview");
  }
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

  await refreshProjectOverview(incident.projectSlug);
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

  await refreshProjectOverview(incident.projectSlug);
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
          projectSlug: service?.projectSlug ?? studioProjectDefinition.slug,
          projectName: service?.projectName ?? studioProjectDefinition.name,
          serviceSlug: payload.serviceSlug,
          serviceName: service?.name ?? payload.serviceSlug,
          environmentSlug: payload.environmentSlug,
          environmentName: environment?.name ?? payload.environmentSlug,
          title: payload.environmentSlug === "production" ? "Studio production public probe failure" : "Studio staging public probe failure",
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

    await refreshProjectOverview(activeIncident.projectSlug);
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

      await refreshProjectOverview(activeIncident.projectSlug);
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

    const { data: insertedIncident } = await supabase
      .from("incidents")
      .insert({
        service_id: service.id,
        service_environment_id: environment.id,
        fingerprint,
        title: payload.environmentSlug === "production" ? "Studio production public probe failure" : "Studio staging public probe failure",
        summary: payload.summary,
        severity: severityFromCheck(payload),
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

    await refreshProjectOverview(service.projectSlug);
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
  const occurredAt = payload.occurredAt ?? isoNow();
  const { service, environment } = await resolveServiceContext(payload.serviceSlug, payload.environmentSlug);

  if (isDemoMode()) {
    const demo = getDemoState();
    const active = demo.incidents.find((incident) => incident.fingerprint === fingerprint && incident.state !== "resolved");

    if (payload.status === "healthy" && active) {
      active.state = "resolved";
      active.resolvedAt = occurredAt;
      active.updatedAt = occurredAt;
      active.lastSeenAt = occurredAt;
      return {
        incident: active,
        notification: buildNotificationPlan({
          severity: active.severity,
          action: "resolved",
          incident: active
        })
      };
    }

    const incident =
      active ??
      incidentSnapshotSchema.parse({
        id: crypto.randomUUID(),
        projectSlug: service?.projectSlug ?? studioProjectDefinition.slug,
        projectName: service?.projectName ?? studioProjectDefinition.name,
        serviceSlug: payload.serviceSlug,
        serviceName: service?.name ?? payload.serviceSlug,
        environmentSlug: payload.environmentSlug,
        environmentName: environment?.name ?? payload.environmentSlug,
        title: payload.title ?? `${payload.serviceSlug} ${payload.eventType}`,
        summary: payload.summary,
        fingerprint,
        severity: severityFromEvent(payload),
        state: "open",
        latestCheckStatus: payload.status,
        latestRunType: payload.eventType,
        latestArtifacts: payload.artifacts ?? [],
        autoRemediationAttempted: false,
        recommendedNextPath:
          payload.recommendedNextPath ??
          "Review the latest report block, then choose a bounded action or escalate to Codex.",
        openedAt: occurredAt,
        updatedAt: occurredAt,
        lastSeenAt: occurredAt,
        openDurationMinutes: 0
      });

    incident.summary = payload.summary;
    incident.title = payload.title ?? incident.title;
    incident.severity = severityFromEvent(payload);
    incident.state = incident.state === "resolved" ? "open" : incident.state;
    incident.latestCheckStatus = payload.status;
    incident.latestRunType = payload.eventType;
    incident.latestArtifacts = payload.artifacts ?? [];
    incident.recommendedNextPath = payload.recommendedNextPath ?? incident.recommendedNextPath;
    incident.updatedAt = occurredAt;
    incident.lastSeenAt = occurredAt;
    if (!active) {
      demo.incidents.unshift(incident);
    }

    return {
      incident,
      notification: buildNotificationPlan({
        severity: incident.severity,
        action: active ? "updated" : "opened",
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
        last_seen_at: occurredAt,
        updated_at: occurredAt
      })
      .eq("id", activeIncident.id);

    await supabase.from("incident_events").insert({
      incident_id: activeIncident.id,
      event_type: payload.eventType,
      payload
    });

    await refreshProjectOverview(activeIncident.projectSlug);
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

  let incidentId = activeIncident?.id;
  let notificationAction: "opened" | "updated" = activeIncident ? "updated" : "opened";

  if (activeIncident) {
    await supabase
      .from("incidents")
      .update({
        title: payload.title ?? activeIncident.title,
        summary: payload.summary,
        severity: severityFromEvent(payload),
        recommended_next_path:
          payload.recommendedNextPath ??
          activeIncident.recommendedNextPath ??
          "Review the latest report block, then choose a bounded action or escalate to Codex.",
        last_seen_at: occurredAt,
        updated_at: occurredAt
      })
      .eq("id", activeIncident.id);
  } else {
    const { data: insertedIncident } = await supabase
      .from("incidents")
      .insert({
        service_id: service.id,
        service_environment_id: environment.id,
        fingerprint,
        title: payload.title ?? `${service.name} ${payload.eventType}`,
        summary: payload.summary,
        severity: severityFromEvent(payload),
        state: "open",
        source: payload.source,
        recommended_next_path:
          payload.recommendedNextPath ??
          "Review the latest report block, then choose a bounded action or escalate to Codex.",
        opened_at: occurredAt,
        last_seen_at: occurredAt,
        updated_at: occurredAt,
        metadata: payload.metadata ?? {}
      })
      .select("id")
      .single();

    incidentId = insertedIncident?.id ? String(insertedIncident.id) : undefined;
  }

  if (!incidentId) {
    return {
      incident: null,
      notification: notificationPlanSchema.parse({
        shouldNotify: false
      })
    };
  }

  await supabase.from("incident_events").insert({
    incident_id: incidentId,
    event_type: payload.eventType,
    payload
  });

  if ((payload.artifacts ?? []).length > 0) {
    await supabase.from("artifact_blobs").insert(
      payload.artifacts.map((artifact) => ({
        incident_id: incidentId,
        kind: artifact.kind,
        label: artifact.label,
        href: artifact.href,
        sha256: artifact.sha256 ?? null,
        metadata: artifact.metadata ?? {}
      }))
    );
  }

  await refreshProjectOverview(service.projectSlug);
  const snapshot = await getIncident(incidentId);
  return {
    incident: snapshot,
    notification:
      snapshot
        ? buildNotificationPlan({
            severity: snapshot.severity,
            action: notificationAction,
            incident: snapshot
          })
        : notificationPlanSchema.parse({ shouldNotify: false })
  };
}

async function persistActionRun(input: {
  request: ActionDispatchRequest;
  status: ActionRunResult["status"];
  summary: string;
  responsePayload?: Record<string, unknown>;
  artifacts?: ActionRunResult["artifacts"];
  completedAt?: string;
  incident?: IncidentSnapshot | null;
}): Promise<ActionRunResult> {
  const createdAt = isoNow();
  const completedAt =
    input.completedAt ?? (input.status === "queued" || input.status === "running" ? undefined : createdAt);

  if (isDemoMode()) {
    const demo = getDemoState();
    const targetIncident =
      input.incident ?? (input.request.incidentId ? demo.incidents.find((item) => item.id === input.request.incidentId) ?? null : null);
    const actionRun = actionRunResultSchema.parse({
      id: crypto.randomUUID(),
      incidentId: input.request.incidentId,
      projectSlug: targetIncident?.projectSlug ?? studioProjectDefinition.slug,
      projectName: targetIncident?.projectName ?? studioProjectDefinition.name,
      serviceSlug: input.request.serviceSlug,
      environmentSlug: input.request.environmentSlug,
      recipe: input.request.recipe,
      status: input.status,
      summary: input.summary,
      artifacts: input.artifacts ?? [],
      responsePayload: (input.responsePayload ?? {}) as Record<string, never>,
      createdAt,
      completedAt
    });

    demo.actionRuns.unshift(actionRun);

    if (targetIncident) {
      targetIncident.autoRemediationAttempted ||= input.request.recipe !== "create_codex_escalation";
      targetIncident.updatedAt = createdAt;
      if (input.request.recipe === "create_codex_escalation") {
        targetIncident.state = "escalated";
      } else if (input.status === "queued" || input.status === "running") {
        targetIncident.state = "auto_remediating";
      }
    }

    return actionRun;
  }

  const supabase = getSupabaseAdmin();
  const { service, environment } = await resolveServiceContext(
    input.request.serviceSlug,
    input.request.environmentSlug
  );

  if (!supabase || !service || !environment) {
    return actionRunResultSchema.parse({
      id: crypto.randomUUID(),
      incidentId: input.request.incidentId,
      projectSlug: studioProjectDefinition.slug,
      projectName: studioProjectDefinition.name,
      serviceSlug: input.request.serviceSlug,
      environmentSlug: input.request.environmentSlug,
      recipe: input.request.recipe,
      status: input.status,
      summary: input.summary,
      artifacts: input.artifacts ?? [],
      responsePayload: (input.responsePayload ?? {}) as Record<string, never>,
      createdAt,
      completedAt
    });
  }

  const { data: actionRow } = await supabase
    .from("action_runs")
    .insert({
      incident_id: input.request.incidentId ?? null,
      service_id: service.id,
      service_environment_id: environment.id,
      recipe: input.request.recipe,
      status: input.status,
      requested_by: input.request.requestedBy,
      summary: input.summary,
      request_payload: input.request.metadata ?? {},
      response_payload: input.responsePayload ?? {},
      completed_at: completedAt ?? null
    })
    .select("*")
    .single();

  if (actionRow && (input.artifacts ?? []).length > 0) {
    await supabase.from("artifact_blobs").insert(
      (input.artifacts ?? []).map((artifact) => ({
        incident_id: input.request.incidentId ?? null,
        action_run_id: actionRow.id,
        kind: artifact.kind,
        label: artifact.label,
        href: artifact.href,
        sha256: artifact.sha256 ?? null,
        metadata: artifact.metadata ?? {}
      }))
    );
  }

  if (input.request.incidentId && actionRow) {
    const nextState =
      input.request.recipe === "create_codex_escalation"
        ? "escalated"
        : input.status === "queued" || input.status === "running"
          ? "auto_remediating"
          : undefined;

    await supabase
      .from("incidents")
      .update({
        latest_action_run_id: actionRow.id,
        auto_remediation_attempted:
          input.request.recipe === "create_codex_escalation" ? undefined : true,
        state: nextState,
        updated_at: createdAt
      })
      .eq("id", input.request.incidentId);
  }

  await refreshProjectOverview(service.projectSlug);
  return actionRunResultSchema.parse({
    id: String(actionRow?.id ?? crypto.randomUUID()),
    incidentId: input.request.incidentId,
    projectSlug: service.projectSlug,
    projectName: service.projectName,
    serviceSlug: input.request.serviceSlug,
    environmentSlug: input.request.environmentSlug,
    recipe: input.request.recipe,
    status: input.status,
    summary: input.summary,
    artifacts: input.artifacts ?? [],
    responsePayload: (input.responsePayload ?? {}) as Record<string, never>,
    createdAt: String(actionRow?.created_at ?? createdAt),
    completedAt: actionRow?.completed_at ? String(actionRow.completed_at) : completedAt
  });
}

export async function createCodexEscalation(incidentId: string): Promise<{
  bundle: CodexEscalationBundle;
  actionRun: ActionRunResult;
}> {
  const incident = await getIncident(incidentId);
  if (!incident) {
    throw new Error("Incident not found.");
  }

  if (isDemoMode()) {
    const demo = getDemoState();
    const latestActionRun =
      demo.actionRuns.find((item) => item.incidentId === incidentId) ?? null;
    const bundle = codexEscalationBundleSchema.parse({
      incidentId,
      projectSlug: incident.projectSlug,
      projectName: incident.projectName,
      serviceSlug: incident.serviceSlug,
      environmentSlug: incident.environmentSlug,
      fingerprint: incident.fingerprint,
      severity: incident.severity,
      state: incident.state,
      latestPublicCheck: {
        status: incident.latestCheckStatus,
        runType: incident.latestRunType,
        versionBuild: incident.latestVersionBuild
      },
      latestVerifyResult: latestActionRun
        ? {
            recipe: latestActionRun.recipe,
            status: latestActionRun.status,
            summary: latestActionRun.summary
          }
        : {},
      currentBuild: incident.latestVersionBuild,
      artifactLinks: incident.latestArtifacts,
      recommendedNextPath:
        incident.recommendedNextPath ?? "Inspect the project cockpit and continue with Codex triage.",
      generatedAt: isoNow()
    });

    const escalationId = crypto.randomUUID();
    demo.codexEscalations.unshift({
      id: escalationId,
      incidentId,
      projectSlug: incident.projectSlug,
      projectName: incident.projectName,
      serviceSlug: incident.serviceSlug,
      environmentSlug: incident.environmentSlug,
      status: "queued",
      recommendedNextPath: bundle.recommendedNextPath,
      createdAt: bundle.generatedAt
    });

    const actionRun = await persistActionRun({
      request: {
        incidentId,
        serviceSlug: incident.serviceSlug,
        environmentSlug: incident.environmentSlug,
        recipe: "create_codex_escalation",
        requestedBy: "system",
        reason: `Codex escalation for ${incident.title}`,
        metadata: {}
      },
      status: "succeeded",
      summary: "Codex escalation bundle created.",
      responsePayload: {
        escalationId
      },
      artifacts: [
        {
          kind: "bundle",
          label: "Codex escalation bundle",
          href: `/projects/${incident.projectSlug}/operations?incident=${incidentId}`,
          metadata: {
            escalationId
          }
        }
      ],
      incident
    });

    return { bundle, actionRun };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase admin client is not configured.");
  }

  const [latestPublicCheckResponse, latestVerifyResponse] = await Promise.all([
    supabase
      .from("check_runs")
      .select("*")
      .eq("service_id", (await resolveServiceContext(incident.serviceSlug, incident.environmentSlug)).service?.id ?? "")
      .eq("service_environment_id", (await resolveServiceContext(incident.serviceSlug, incident.environmentSlug)).environment?.id ?? "")
      .in("run_type", ["public_probe", "manual_recheck"])
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("check_runs")
      .select("*")
      .eq("service_id", (await resolveServiceContext(incident.serviceSlug, incident.environmentSlug)).service?.id ?? "")
      .eq("service_environment_id", (await resolveServiceContext(incident.serviceSlug, incident.environmentSlug)).environment?.id ?? "")
      .in("run_type", ["deployment_verify", "incident_bundle"])
      .order("recorded_at", { ascending: false })
      .limit(1)
      .maybeSingle()
  ]);

  const latestPublicCheck = latestPublicCheckResponse.data
    ? {
        status: latestPublicCheckResponse.data.status,
        summary: latestPublicCheckResponse.data.summary,
        runType: latestPublicCheckResponse.data.run_type,
        versionBuild: latestPublicCheckResponse.data.version_build,
        checkedPaths: latestPublicCheckResponse.data.checked_paths,
        recordedAt: latestPublicCheckResponse.data.recorded_at
      }
    : {};

  const latestVerifyResult = latestVerifyResponse.data
    ? {
        status: latestVerifyResponse.data.status,
        summary: latestVerifyResponse.data.summary,
        runType: latestVerifyResponse.data.run_type,
        versionBuild: latestVerifyResponse.data.version_build,
        checkedPaths: latestVerifyResponse.data.checked_paths,
        recordedAt: latestVerifyResponse.data.recorded_at
      }
    : {};

  const bundle = codexEscalationBundleSchema.parse({
    incidentId,
    projectSlug: incident.projectSlug,
    projectName: incident.projectName,
    serviceSlug: incident.serviceSlug,
    environmentSlug: incident.environmentSlug,
    fingerprint: incident.fingerprint,
    severity: incident.severity,
    state: incident.state,
    latestPublicCheck,
    latestVerifyResult,
    currentBuild: incident.latestVersionBuild,
    artifactLinks: incident.latestArtifacts,
    recommendedNextPath:
      incident.recommendedNextPath ?? "Inspect the project cockpit and continue with Codex triage.",
    generatedAt: isoNow()
  });

  const { data: escalationRow } = await supabase
    .from("codex_escalations")
    .insert({
      incident_id: incidentId,
      status: "queued",
      bundle,
      recommended_next_path: bundle.recommendedNextPath
    })
    .select("*")
    .single();

  const actionRun = await persistActionRun({
    request: {
      incidentId,
      serviceSlug: incident.serviceSlug,
      environmentSlug: incident.environmentSlug,
      recipe: "create_codex_escalation",
      requestedBy: "system",
      reason: `Codex escalation for ${incident.title}`,
      metadata: {}
    },
    status: "succeeded",
    summary: "Codex escalation bundle created.",
    responsePayload: {
      escalationId: escalationRow?.id
    },
    artifacts: [
      {
        kind: "bundle",
        label: "Codex escalation bundle",
        href: `/projects/${incident.projectSlug}/operations?incident=${incidentId}`,
        metadata: {
          escalationId: escalationRow?.id
        }
      }
    ],
    incident
  });

  await supabase
    .from("incidents")
    .update({
      state: "escalated",
      recommended_next_path: bundle.recommendedNextPath,
      updated_at: bundle.generatedAt
    })
    .eq("id", incidentId);

  await refreshProjectOverview(incident.projectSlug);
  return {
    bundle,
    actionRun
  };
}

export async function runAction(input: ActionDispatchRequest): Promise<{
  actionRun: ActionRunResult;
  incident: IncidentSnapshot | null;
  escalationBundle?: CodexEscalationBundle;
}> {
  const incident = input.incidentId ? await getIncident(input.incidentId) : null;

  if (input.recipe === "create_codex_escalation") {
    const escalation = await createCodexEscalation(input.incidentId ?? "");
    return {
      actionRun: escalation.actionRun,
      incident: await getIncident(input.incidentId ?? ""),
      escalationBundle: escalation.bundle
    };
  }

  if (input.recipe === "recheck_public_health") {
    const probe = await runStudioPublicProbe(input.environmentSlug);
    const checkResult = await recordCheckResult({
      ...probe,
      runType: "manual_recheck",
      source: "manual",
      fingerprint: incident?.fingerprint ?? probe.fingerprint
    });

    const actionRun = await persistActionRun({
      request: input,
      status:
        probe.status === "healthy" || checkResult.incident?.state === "resolved" ? "succeeded" : "failed",
      summary:
        probe.status === "healthy" || checkResult.incident?.state === "resolved"
          ? `Manual recheck cleared ${input.serviceSlug}/${input.environmentSlug}.`
          : `Manual recheck still reports ${probe.status} for ${input.serviceSlug}/${input.environmentSlug}.`,
      responsePayload: {
        probeStatus: probe.status,
        summary: probe.summary
      },
      artifacts: probe.artifacts,
      incident: checkResult.incident ?? incident
    });

    return {
      actionRun,
      incident: input.incidentId ? await getIncident(input.incidentId) : checkResult.incident
    };
  }

  const workflow = await dispatchStudioWorkflow({
    recipe: input.recipe,
    incidentId: input.incidentId,
    serviceSlug: input.serviceSlug,
    environmentSlug: input.environmentSlug
  });

  const actionRun = await persistActionRun({
    request: input,
    status: workflow.queued ? "queued" : "failed",
    summary: workflow.summary,
    responsePayload: workflow.runUrl
      ? {
          runUrl: workflow.runUrl
        }
      : {},
    artifacts: workflow.runUrl
      ? [
          {
            kind: "workflow-artifact",
            label: "GitHub workflow run",
            href: workflow.runUrl,
            metadata: {
              recipe: input.recipe
            }
          }
        ]
      : [],
    incident
  });

  return {
    actionRun,
    incident: input.incidentId ? await getIncident(input.incidentId) : incident
  };
}

export async function evaluateEscalationNeed(incidentId: string): Promise<{
  shouldEscalate: boolean;
  reason: string;
}> {
  const incident = await getIncident(incidentId);
  if (!incident) {
    return {
      shouldEscalate: false,
      reason: "Incident not found."
    };
  }

  if (incident.state === "escalated") {
    return {
      shouldEscalate: false,
      reason: "Incident is already escalated."
    };
  }

  const actionRuns = (await listActionRuns(incident.projectSlug))
    .filter((actionRun) => actionRun.incidentId === incidentId && actionRun.recipe !== "create_codex_escalation")
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const latestAction = actionRuns[0];
  const actionAttemptFailed = latestAction?.status === "failed";
  const followUpVerifyFailed =
    incident.latestCheckStatus !== undefined && incident.latestCheckStatus !== "healthy";
  const openDurationMinutes = incident.openDurationMinutes ?? minutesBetween(incident.openedAt, isoNow());
  const shouldEscalate = shouldEscalateToCodex({
    severity: incident.severity,
    actionAttemptFailed: Boolean(actionAttemptFailed),
    followUpVerifyFailed,
    openDurationMinutes
  });

  return {
    shouldEscalate,
    reason: shouldEscalate
      ? "The incident stayed unhealthy after bounded remediation and meets Codex escalation policy."
      : "The incident has not met the Codex escalation threshold yet."
  };
}
