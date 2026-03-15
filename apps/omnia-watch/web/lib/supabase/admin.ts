import { createClient } from "@supabase/supabase-js";
import { getSupabaseAdminConfig } from "./shared";

export function createSupabaseAdminClient() {
  const config = getSupabaseAdminConfig();
  if (!config) {
    return null;
  }

  return createClient(config.url, config.serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
