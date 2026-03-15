import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicConfig } from "./shared";

export function createSupabaseBrowserClient() {
  const config = getSupabasePublicConfig();
  if (!config) {
    return null;
  }

  return createBrowserClient(config.url, config.anonKey);
}
