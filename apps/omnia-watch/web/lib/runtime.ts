export type ProductMode = "connected" | "demo";

export function getConfiguredAccountUrl() {
  return process.env.NEXT_PUBLIC_ACCOUNT_URL ?? "https://account.omniacreata.com";
}

export function getConfiguredSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://watch.omniacreata.com";
}

export function getConfiguredHostingTarget() {
  return "firebase-app-hosting";
}

export function isSupabasePublicConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function isSupabaseAdminConfigured() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function isDeviceCredentialSecretConfigured() {
  return Boolean(process.env.DEVICE_CREDENTIAL_SECRET);
}

export function isSupabaseConfigured() {
  return isSupabasePublicConfigured();
}

export function isDevicePipelineConfigured() {
  return (
    isSupabasePublicConfigured() &&
    isSupabaseAdminConfigured() &&
    isDeviceCredentialSecretConfigured()
  );
}

export function getProductMode(): ProductMode {
  return isSupabasePublicConfigured() ? "connected" : "demo";
}

export function getDevicePipelineMode(): ProductMode {
  return isDevicePipelineConfigured() ? "connected" : "demo";
}
