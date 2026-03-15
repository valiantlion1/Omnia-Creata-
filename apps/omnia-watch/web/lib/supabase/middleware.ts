import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabasePublicConfig, type SupabaseCookieOptions } from "./shared";

export async function updateSupabaseSession(
  request: NextRequest,
  response: NextResponse
) {
  const config = getSupabasePublicConfig();
  if (!config) {
    return response;
  }

  let nextResponse = response;

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; options: SupabaseCookieOptions; value: string }>) {
        cookiesToSet.forEach(({ name, options, value }) => {
          request.cookies.set({ ...options, name, value });
          nextResponse.cookies.set({ ...options, name, value });
        });
      }
    }
  });

  await supabase.auth.getUser();
  return nextResponse;
}
