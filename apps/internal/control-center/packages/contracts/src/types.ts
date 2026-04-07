import { z } from "zod";

export const incidentStates = [
  "open",
  "acknowledged",
  "auto_remediating",
  "resolved",
  "escalated",
  "silenced"
] as const;

export const severityLevels = ["P1", "P2", "P3"] as const;
export const checkStatuses = ["healthy", "degraded", "failed"] as const;
export const actionRunStatuses = ["queued", "running", "succeeded", "failed"] as const;
export const actionRecipes = [
  "recheck_public_health",
  "trigger_staging_verify",
  "collect_incident_bundle",
  "create_codex_escalation"
] as const;
export const reportScopeLevels = ["project", "service", "incident"] as const;
export const reportTypes = ["overview", "daily", "weekly", "incident_snapshot"] as const;
export const reportStatuses = ["healthy", "degraded", "failed"] as const;
export const chartTypes = ["line", "bar", "area", "timeline", "sparkline"] as const;

export type IncidentState = (typeof incidentStates)[number];
export type SeverityLevel = (typeof severityLevels)[number];
export type CheckStatus = (typeof checkStatuses)[number];
export type ActionRecipe = (typeof actionRecipes)[number];
export type ActionRunStatus = (typeof actionRunStatuses)[number];
export type ReportScopeLevel = (typeof reportScopeLevels)[number];
export type ReportType = (typeof reportTypes)[number];
export type ReportStatus = (typeof reportStatuses)[number];
export type ChartType = (typeof chartTypes)[number];

const jsonValue: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValue),
    z.record(jsonValue)
  ])
);

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export const checkedPathSchema = z.object({
  path: z.string().min(1),
  ok: z.boolean(),
  statusCode: z.number().int().optional(),
  latencyMs: z.number().int().nonnegative().optional(),
  detail: z.string().optional()
});

export const artifactBlobSchema = z.object({
  id: z.string().optional(),
  kind: z.enum(["log", "report", "workflow-artifact", "dashboard-link", "bundle", "note"]),
  label: z.string().min(1),
  href: z.string().min(1),
  sha256: z.string().optional(),
  metadata: z.record(jsonValue).optional()
});

export const projectViewSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().default(""),
  currentStatus: z.enum(checkStatuses),
  serviceCount: z.number().int().nonnegative(),
  environmentCount: z.number().int().nonnegative(),
  totalOpenIncidents: z.number().int().nonnegative(),
  incidentsBySeverity: z.object({
    P1: z.number().int().nonnegative(),
    P2: z.number().int().nonnegative(),
    P3: z.number().int().nonnegative()
  }),
  latestReportAt: z.string().datetime().optional()
});

export const serviceEnvironmentSummarySchema = z.object({
  id: z.string(),
  slug: z.enum(["staging", "production"]),
  name: z.string(),
  baseUrl: z.string(),
  cadenceMinutes: z.number().int().nonnegative(),
  currentStatus: z.enum(checkStatuses),
  lastCheckAt: z.string().datetime().optional(),
  lastBuild: z.string().optional()
});

export const serviceViewSchema = z.object({
  id: z.string(),
  projectSlug: z.string(),
  projectName: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().default(""),
  environments: z.array(serviceEnvironmentSummarySchema)
});

export const serviceEventPayloadSchema = z.object({
  serviceSlug: z.string().min(1),
  environmentSlug: z.enum(["staging", "production"]),
  eventType: z.enum(["deployment_verify", "incident_bundle", "bookkeeping_drift", "operator_note"]),
  source: z.string().min(1).default("api"),
  summary: z.string().min(1),
  severity: z.enum(severityLevels).optional(),
  fingerprint: z.string().optional(),
  recommendedNextPath: z.string().optional(),
  status: z.enum(checkStatuses).optional(),
  title: z.string().optional(),
  artifacts: z.array(artifactBlobSchema).default([]),
  metadata: z.record(jsonValue).default({}),
  occurredAt: z.string().datetime().optional()
});

export const checkRunPayloadSchema = z.object({
  serviceSlug: z.string().min(1),
  environmentSlug: z.enum(["staging", "production"]),
  runType: z.enum(["public_probe", "deployment_verify", "incident_bundle", "manual_recheck"]),
  source: z.enum(["cloudflare-worker", "github-actions", "manual", "api", "worker-forwarder"]),
  status: z.enum(checkStatuses),
  summary: z.string().min(1),
  fingerprint: z.string().optional(),
  healthStatus: z.string().optional(),
  loginOk: z.boolean().optional(),
  versionBuild: z.string().optional(),
  versionLabel: z.string().optional(),
  checkedPaths: z.array(checkedPathSchema).default([]),
  artifacts: z.array(artifactBlobSchema).default([]),
  metadata: z.record(jsonValue).default({}),
  recordedAt: z.string().datetime().optional()
});

export const incidentSnapshotSchema = z.object({
  id: z.string(),
  projectSlug: z.string(),
  projectName: z.string(),
  serviceSlug: z.string(),
  serviceName: z.string(),
  environmentSlug: z.enum(["staging", "production"]),
  environmentName: z.string(),
  title: z.string(),
  summary: z.string(),
  fingerprint: z.string(),
  severity: z.enum(severityLevels),
  state: z.enum(incidentStates),
  latestCheckStatus: z.enum(checkStatuses).optional(),
  latestRunType: z.string().optional(),
  latestVersionBuild: z.string().optional(),
  latestArtifacts: z.array(artifactBlobSchema).default([]),
  autoRemediationAttempted: z.boolean().default(false),
  recommendedNextPath: z.string().optional(),
  openedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastSeenAt: z.string().datetime().optional(),
  acknowledgedAt: z.string().datetime().optional(),
  resolvedAt: z.string().datetime().optional(),
  silencedUntil: z.string().datetime().optional(),
  openDurationMinutes: z.number().nonnegative().optional()
});

export const actionDispatchRequestSchema = z.object({
  incidentId: z.string().optional(),
  serviceSlug: z.string().min(1),
  environmentSlug: z.enum(["staging", "production"]),
  recipe: z.enum(actionRecipes),
  requestedBy: z.string().min(1),
  reason: z.string().min(1),
  metadata: z.record(jsonValue).default({})
});

export const actionRunResultSchema = z.object({
  id: z.string(),
  incidentId: z.string().optional(),
  projectSlug: z.string(),
  projectName: z.string(),
  serviceSlug: z.string().min(1),
  environmentSlug: z.enum(["staging", "production"]),
  recipe: z.enum(actionRecipes),
  status: z.enum(actionRunStatuses),
  summary: z.string().min(1),
  artifacts: z.array(artifactBlobSchema).default([]),
  responsePayload: z.record(jsonValue).default({}),
  createdAt: z.string().datetime(),
  completedAt: z.string().datetime().optional()
});

export const codexEscalationSummarySchema = z.object({
  id: z.string(),
  incidentId: z.string(),
  projectSlug: z.string(),
  projectName: z.string(),
  serviceSlug: z.string(),
  environmentSlug: z.enum(["staging", "production"]),
  status: z.string(),
  recommendedNextPath: z.string(),
  createdAt: z.string().datetime()
});

export const reportMetricSchema = z.object({
  key: z.string(),
  label: z.string(),
  value: z.number(),
  unit: z.string().optional(),
  detail: z.string().optional()
});

export const reportChartPointSchema = z.object({
  x: z.string(),
  y: z.number()
});

export const reportChartSeriesSchema = z.object({
  name: z.string(),
  points: z.array(reportChartPointSchema)
});

export const reportChartSchema = z.object({
  id: z.string(),
  type: z.enum(chartTypes),
  label: z.string(),
  series: z.array(reportChartSeriesSchema)
});

export const reportIncidentSummarySchema = z.object({
  id: z.string(),
  severity: z.enum(severityLevels),
  state: z.enum(incidentStates),
  summary: z.string()
});

export const ocosReportSchema = z.object({
  id: z.string(),
  projectSlug: z.string(),
  projectName: z.string(),
  scopeLevel: z.enum(reportScopeLevels),
  scopeKey: z.string(),
  reportType: z.enum(reportTypes),
  status: z.enum(reportStatuses),
  headline: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  summary: z.object({
    headline: z.string(),
    status: z.enum(reportStatuses),
    keyFindings: z.array(z.string()),
    recommendedActions: z.array(z.string())
  }),
  metrics: z.array(reportMetricSchema).default([]),
  charts: z.array(reportChartSchema).default([]),
  incidents: z.array(reportIncidentSummarySchema).default([]),
  source: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const reportSummarySchema = z.object({
  id: z.string(),
  projectSlug: z.string(),
  projectName: z.string(),
  scopeLevel: z.enum(reportScopeLevels),
  scopeKey: z.string(),
  reportType: z.enum(reportTypes),
  status: z.enum(reportStatuses),
  headline: z.string(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export const codexEscalationBundleSchema = z.object({
  incidentId: z.string(),
  projectSlug: z.string(),
  projectName: z.string(),
  serviceSlug: z.string(),
  environmentSlug: z.enum(["staging", "production"]),
  fingerprint: z.string(),
  severity: z.enum(severityLevels),
  state: z.enum(incidentStates),
  latestPublicCheck: z.record(jsonValue).default({}),
  latestVerifyResult: z.record(jsonValue).default({}),
  currentBuild: z.string().optional(),
  artifactLinks: z.array(artifactBlobSchema).default([]),
  recommendedNextPath: z.string().min(1),
  generatedAt: z.string().datetime()
});

export const notificationPlanSchema = z.object({
  shouldNotify: z.boolean().default(false),
  channel: z.enum(["telegram", "digest"]).default("telegram"),
  severity: z.enum(severityLevels).optional(),
  title: z.string().optional(),
  body: z.string().optional(),
  deepLink: z.string().optional()
});

export const projectSummaryViewSchema = z.object({
  generatedAt: z.string().datetime(),
  demoMode: z.boolean(),
  project: projectViewSchema,
  services: z.array(serviceViewSchema),
  serviceTotals: z.object({
    total: z.number().int().nonnegative(),
    healthy: z.number().int().nonnegative(),
    degraded: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative()
  }),
  incidentsBySeverity: z.object({
    P1: z.number().int().nonnegative(),
    P2: z.number().int().nonnegative(),
    P3: z.number().int().nonnegative()
  }),
  activeIncidents: z.array(incidentSnapshotSchema),
  actionRuns: z.array(actionRunResultSchema),
  codexEscalations: z.array(codexEscalationSummarySchema),
  latestReports: z.array(reportSummarySchema),
  overviewReport: ocosReportSchema.optional()
});

export const orgSummaryViewSchema = z.object({
  generatedAt: z.string().datetime(),
  demoMode: z.boolean(),
  organizationTotals: z.object({
    projects: z.number().int().nonnegative(),
    services: z.number().int().nonnegative(),
    environments: z.number().int().nonnegative()
  }),
  serviceTotals: z.object({
    total: z.number().int().nonnegative(),
    healthy: z.number().int().nonnegative(),
    degraded: z.number().int().nonnegative(),
    failed: z.number().int().nonnegative()
  }),
  incidentsBySeverity: z.object({
    P1: z.number().int().nonnegative(),
    P2: z.number().int().nonnegative(),
    P3: z.number().int().nonnegative()
  }),
  projects: z.array(projectViewSchema),
  activeIncidents: z.array(incidentSnapshotSchema),
  actionRuns: z.array(actionRunResultSchema),
  codexEscalations: z.array(codexEscalationSummarySchema),
  latestReports: z.array(reportSummarySchema)
});

export type ServiceEventPayload = z.infer<typeof serviceEventPayloadSchema>;
export type CheckRunPayload = z.infer<typeof checkRunPayloadSchema>;
export type ProjectView = z.infer<typeof projectViewSchema>;
export type ServiceEnvironmentSummary = z.infer<typeof serviceEnvironmentSummarySchema>;
export type ServiceView = z.infer<typeof serviceViewSchema>;
export type IncidentSnapshot = z.infer<typeof incidentSnapshotSchema>;
export type ActionDispatchRequest = z.infer<typeof actionDispatchRequestSchema>;
export type ActionRunResult = z.infer<typeof actionRunResultSchema>;
export type CodexEscalationBundle = z.infer<typeof codexEscalationBundleSchema>;
export type CodexEscalationSummary = z.infer<typeof codexEscalationSummarySchema>;
export type NotificationPlan = z.infer<typeof notificationPlanSchema>;
export type ArtifactBlob = z.infer<typeof artifactBlobSchema>;
export type OcosReport = z.infer<typeof ocosReportSchema>;
export type ReportSummary = z.infer<typeof reportSummarySchema>;
export type ProjectSummaryView = z.infer<typeof projectSummaryViewSchema>;
export type OrgSummaryView = z.infer<typeof orgSummaryViewSchema>;

export function buildIncidentFingerprint(
  serviceSlug: string,
  environmentSlug: string,
  category: string
): string {
  return [serviceSlug, environmentSlug, category].join(":").toLowerCase();
}

export function shouldEscalateToCodex(input: {
  severity: SeverityLevel;
  actionAttemptFailed: boolean;
  followUpVerifyFailed: boolean;
  openDurationMinutes: number;
}): boolean {
  if (input.actionAttemptFailed && input.followUpVerifyFailed) {
    return true;
  }
  return ["P1", "P2"].includes(input.severity) && input.openDurationMinutes >= 20;
}
