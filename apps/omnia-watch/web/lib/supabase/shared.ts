export interface SupabaseCookieOptions {
  domain?: string;
  httpOnly?: boolean;
  maxAge?: number;
  path?: string;
  sameSite?: "lax" | "none" | "strict";
  secure?: boolean;
}

export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return { anonKey, url };
}

export function getSupabaseAdminConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return null;
  }

  return { serviceRoleKey, url };
}
