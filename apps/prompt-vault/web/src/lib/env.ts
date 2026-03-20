import { brand } from "@prompt-vault/config";
import type { AIProviderKey, AuthMode } from "@prompt-vault/types";

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
  appName: process.env.NEXT_PUBLIC_APP_NAME ?? brand.name,
  betaMode: process.env.NEXT_PUBLIC_BETA_MODE !== "false",
  enableAI: process.env.NEXT_PUBLIC_ENABLE_AI === "true",
  enableAds: process.env.NEXT_PUBLIC_ENABLE_ADS !== "false",
  enablePro: process.env.NEXT_PUBLIC_ENABLE_PRO === "true",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  aiProvider: (process.env.AI_PROVIDER ?? "preview") as AIProviderKey,
  aiModel: process.env.AI_MODEL ?? "preview-organizer-v1",
  aiFallbackProvider: (process.env.AI_FALLBACK_PROVIDER ?? "preview") as AIProviderKey,
  aiRateLimitWindowSeconds: Number(process.env.AI_RATE_LIMIT_WINDOW_SECONDS ?? "3600"),
  aiRateLimitMaxRequests: Number(process.env.AI_RATE_LIMIT_MAX_REQUESTS ?? "30"),
  openRouterApiKey: process.env.OPENROUTER_API_KEY ?? "",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  togetherApiKey: process.env.TOGETHER_API_KEY ?? ""
};

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseAnonKey);
export const isSupabaseAdminConfigured = Boolean(
  env.supabaseUrl && env.supabaseServiceRoleKey
);
export const isBetaBuild = env.betaMode;
export const isAIEnabled = env.enableAI;
export const areAdsEnabled = env.enableAds;
export const isProEnabled = env.enablePro;

export function getAuthMode(): AuthMode {
  return {
    enabled: isSupabaseConfigured,
    strategy: isSupabaseConfigured ? "supabase" : "preview"
  };
}

export function getProductRuntime() {
  return {
    appName: env.appName,
    betaMode: env.betaMode,
    enableAI: env.enableAI,
    enableAds: env.enableAds,
    enablePro: env.enablePro
  } as const;
}

export function isAIProviderConfigured(provider: AIProviderKey) {
  if (provider === "preview") {
    return true;
  }

  if (provider === "openrouter") {
    return Boolean(env.openRouterApiKey);
  }

  if (provider === "groq") {
    return Boolean(env.groqApiKey);
  }

  if (provider === "together") {
    return Boolean(env.togetherApiKey);
  }

  return false;
}
