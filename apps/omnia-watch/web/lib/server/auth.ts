import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import type { Locale } from "@omnia-watch/types";
import { getProductMode, type ProductMode } from "@/lib/runtime";
import { localizePath } from "@/lib/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthContext {
  mode: ProductMode;
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  user: User | null;
}

export const getAuthContext = cache(async (): Promise<AuthContext> => {
  const mode = getProductMode();
  if (mode === "demo") {
    return {
      mode,
      supabase: null,
      user: null
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      mode: "demo",
      supabase: null,
      user: null
    };
  }

  const {
    data: { user }
  } = await supabase.auth.getUser();

  return {
    mode,
    supabase,
    user
  };
});

export async function redirectIfAuthenticated(locale: Locale) {
  const auth = await getAuthContext();
  if (auth.mode === "connected" && auth.user) {
    redirect(localizePath(locale, "/app"));
  }
}

export async function requireAuthenticatedUser(locale: Locale) {
  const auth = await getAuthContext();
  if (auth.mode === "demo") {
    return auth;
  }

  if (!auth.user) {
    redirect(localizePath(locale, "/sign-in"));
  }

  return auth;
}
