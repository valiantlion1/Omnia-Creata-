import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicConfig, type SupabaseCookieOptions } from "./shared";

export async function createSupabaseServerClient() {
  const config = getSupabasePublicConfig();
  if (!config) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; options: SupabaseCookieOptions; value: string }>) {
        try {
          cookiesToSet.forEach(({ name, options, value }) => {
            cookieStore.set({ ...options, name, value });
          });
        } catch {
          // Cookie mutation can be unavailable in some server component contexts.
        }
      }
    }
  });
}
