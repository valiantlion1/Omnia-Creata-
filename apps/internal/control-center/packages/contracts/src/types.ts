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

export type IncidentState = (typeof incidentStates)[number];
export type SeverityLevel = (typeof severityLevels)[number];
export type CheckStatus = (typeof checkStatuses)[number];
export type ActionRecipe = (typeof actionRecipes)[number];
export type ActionRunStatus = (typeof actionRunStatuses)[number];

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

export const codexEscalationBundleSchema = z.object({
  incidentId: z.string(),
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

export type ServiceEventPayload = z.infer<typeof serviceEventPayloadSchema>;
export type CheckRunPayload = z.infer<typeof checkRunPayloadSchema>;
export type IncidentSnapshot = z.infer<typeof incidentSnapshotSchema>;
export type ActionDispatchRequest = z.infer<typeof actionDispatchRequestSchema>;
export type ActionRunResult = z.infer<typeof actionRunResultSchema>;
export type CodexEscalationBundle = z.infer<typeof codexEscalationBundleSchema>;
export type NotificationPlan = z.infer<typeof notificationPlanSchema>;
export type ArtifactBlob = z.infer<typeof artifactBlobSchema>;

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
