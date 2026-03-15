import "server-only";

import { createClient } from "@supabase/supabase-js";
import { env, isSupabaseAdminConfigured } from "@/lib/env";

export function createSupabaseAdminClient() {
  if (!isSupabaseAdminConfigured) {
    return null;
  }

  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}
