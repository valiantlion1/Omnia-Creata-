export const appEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  publicHostname: process.env.NEXT_PUBLIC_OCOS_HOSTNAME ?? "localhost",
  demoMode:
    process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA === "true" ||
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY,
  trustCloudflareAccess:
    process.env.OCOS_TRUST_CLOUDFLARE_ACCESS === "true" || process.env.NODE_ENV !== "production",
  internalApiToken: process.env.OCOS_INTERNAL_API_TOKEN ?? "",
  demoOperatorToken: process.env.OCOS_DEMO_OPERATOR_TOKEN ?? "local-operator-token",
  githubRepo: process.env.OCOS_GITHUB_REPO ?? "",
  githubWorkflowId: process.env.OCOS_GITHUB_WORKFLOW_ID ?? "ocos-studio-bounded-action.yml",
  githubRef: process.env.OCOS_GITHUB_REF ?? "main",
  hooksBaseUrl: process.env.OCOS_HOOKS_BASE_URL ?? "https://hooks-ops.omniacreata.com",
  studioProdBaseUrl: process.env.OCOS_STUDIO_PROD_BASE_URL ?? "https://studio.omniacreata.com",
  studioStagingBaseUrl:
    process.env.OCOS_STUDIO_STAGING_BASE_URL ?? "https://staging-studio.omniacreata.com"
} as const;
