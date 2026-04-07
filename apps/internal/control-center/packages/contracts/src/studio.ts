import type { ActionRecipe } from "./types.js";

export const ocosHostnames = {
  production: "https://ops.omniacreata.com",
  staging: "https://staging-ops.omniacreata.com",
  hooks: "https://hooks-ops.omniacreata.com"
} as const;

export const studioProjectDefinition = {
  slug: "studio",
  name: "OmniaCreata Studio",
  description: "Studio-first project cockpit for OCOS foundation."
} as const;

export const studioServiceDefinition = {
  slug: "studio",
  name: "OmniaCreata Studio",
  environments: {
    production: {
      slug: "production",
      name: "Production",
      baseUrl: "https://studio.omniacreata.com",
      apiPrefix: "/api",
      loginPath: "/login",
      healthPath: "/api/v1/healthz",
      versionPath: "/api/v1/version",
      cadenceMinutes: 5
    },
    staging: {
      slug: "staging",
      name: "Staging",
      baseUrl: "https://staging-studio.omniacreata.com",
      apiPrefix: "/api",
      loginPath: "/login",
      healthPath: "/api/v1/healthz",
      versionPath: "/api/v1/version",
      cadenceMinutes: 15
    }
  }
} as const;

export const studioAllowedRecipes: ActionRecipe[] = [
  "recheck_public_health",
  "trigger_staging_verify",
  "collect_incident_bundle",
  "create_codex_escalation"
];

export const incidentThresholds = {
  openAfterConsecutiveFailures: 2,
  resolveAfterConsecutiveHealthyChecks: 2,
  codexEscalationMinutes: 20
} as const;

export const telegramPolicy = {
  immediate: ["P1-open", "P1-resolved", "P2-open"],
  digest: ["P3-open", "P3-resolved"]
} as const;
