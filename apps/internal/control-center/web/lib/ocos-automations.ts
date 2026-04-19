export type AutomationTriggerType = "schedule" | "event" | "incident" | "manual";
export type AutomationSafetyClass = "observe" | "bounded_action" | "escalation_prep";
export type AutomationStatus = "active" | "paused" | "degraded" | "failing";

export type AutomationListItem = {
  id: string;
  name: string;
  summary: string;
  triggerType: AutomationTriggerType;
  triggerLabel: string;
  projectSlug?: string;
  serviceSlug?: string;
  environmentSlug?: string;
  safetyClass: AutomationSafetyClass;
  owner: string;
  status: AutomationStatus;
  lastRunAt?: string;
  nextRunAt?: string;
  lastVerifiedAt?: string;
  successRate30d?: number;
  lastIncidentTitle?: string;
};

const seededAutomations: AutomationListItem[] = [
  {
    id: "auto-studio-prod-health",
    name: "Studio production health pulse",
    summary: "Runs the public production health probe on a fixed cadence and opens the incident lane only when the fingerprint changes.",
    triggerType: "schedule",
    triggerLabel: "Every 5 min",
    projectSlug: "studio",
    serviceSlug: "studio-web",
    environmentSlug: "production",
    safetyClass: "observe",
    owner: "worker",
    status: "active",
    lastRunAt: "2026-04-19T00:18:00.000Z",
    nextRunAt: "2026-04-19T00:23:00.000Z",
    lastVerifiedAt: "2026-04-19T00:18:00.000Z",
    successRate30d: 99.2
  },
  {
    id: "auto-studio-staging-verify",
    name: "Studio staging verify retry",
    summary: "Dispatches the bounded staging verify workflow after a production probe failure so the operator gets a fresh verify result before escalation.",
    triggerType: "incident",
    triggerLabel: "On P1/P2 probe failure",
    projectSlug: "studio",
    serviceSlug: "studio-web",
    environmentSlug: "staging",
    safetyClass: "bounded_action",
    owner: "ops",
    status: "active",
    lastRunAt: "2026-04-18T23:54:00.000Z",
    nextRunAt: "2026-04-19T00:24:00.000Z",
    lastVerifiedAt: "2026-04-18T23:57:00.000Z",
    successRate30d: 93.8,
    lastIncidentTitle: "Protected staging verify drift"
  },
  {
    id: "auto-studio-incident-bundle",
    name: "Incident bundle preparation",
    summary: "Collects the latest incident context, action history, and report objects into one escalation-ready artifact bundle.",
    triggerType: "incident",
    triggerLabel: "After failed bounded action",
    projectSlug: "studio",
    serviceSlug: "studio-api",
    environmentSlug: "production",
    safetyClass: "escalation_prep",
    owner: "codex bridge",
    status: "active",
    lastRunAt: "2026-04-18T22:41:00.000Z",
    nextRunAt: "On demand",
    lastVerifiedAt: "2026-04-18T22:43:00.000Z",
    successRate30d: 91.1,
    lastIncidentTitle: "Owner token verify mismatch"
  },
  {
    id: "auto-studio-provider-drift",
    name: "Provider drift digest",
    summary: "Builds a low-noise drift digest for provider changes and routes only the meaningful deltas into the operations queue.",
    triggerType: "event",
    triggerLabel: "On provider signal",
    projectSlug: "studio",
    serviceSlug: "studio-providers",
    environmentSlug: "production",
    safetyClass: "observe",
    owner: "ops",
    status: "paused",
    lastRunAt: "2026-04-17T17:20:00.000Z",
    nextRunAt: "Paused",
    lastVerifiedAt: "2026-04-17T17:20:00.000Z",
    successRate30d: 97.4
  },
  {
    id: "auto-studio-local-analyst",
    name: "Local analyst incident summary",
    summary: "Packages the latest incident bundle for the local analyst lane so the operator can request a deeper narrative without changing operational truth.",
    triggerType: "manual",
    triggerLabel: "Operator launch",
    projectSlug: "studio",
    serviceSlug: "studio-web",
    environmentSlug: "production",
    safetyClass: "escalation_prep",
    owner: "local analyst",
    status: "degraded",
    lastRunAt: "2026-04-18T21:08:00.000Z",
    nextRunAt: "Manual",
    lastVerifiedAt: "2026-04-18T21:11:00.000Z",
    successRate30d: 72.5,
    lastIncidentTitle: "LM Studio endpoint unavailable"
  },
  {
    id: "auto-studio-weekly-report",
    name: "Weekly project report materializer",
    summary: "Materializes the weekly project report so operators, automation prompts, and future AI summaries all read the same typed report surface.",
    triggerType: "schedule",
    triggerLabel: "Mondays 09:00",
    projectSlug: "studio",
    serviceSlug: "studio-reporting",
    environmentSlug: "production",
    safetyClass: "observe",
    owner: "reporting",
    status: "failing",
    lastRunAt: "2026-04-15T09:00:00.000Z",
    nextRunAt: "2026-04-22T09:00:00.000Z",
    lastVerifiedAt: "2026-04-15T09:03:00.000Z",
    successRate30d: 64.1,
    lastIncidentTitle: "Overview report persistence lag"
  }
];

export async function listAutomations(projectSlug?: string): Promise<AutomationListItem[]> {
  return seededAutomations.filter((automation) => (projectSlug ? automation.projectSlug === projectSlug : true));
}
