"use server";

import { redirect } from "next/navigation";
import type { Locale } from "@omnia-watch/types";
import { isSupabasePublicConfigured } from "@/lib/runtime";
import { localizePath } from "@/lib/site";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface AuthActionState {
  error: string | null;
  success: string | null;
}

const initialAuthState: AuthActionState = {
  error: null,
  success: null
};

function getAuthRedirect(locale: Locale) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const next = encodeURIComponent(localizePath(locale, "/app"));
  return `${siteUrl}/auth/callback?next=${next}`;
}

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? "")
  };
}

function readEmail(formData: FormData) {
  return String(formData.get("email") ?? "").trim();
}

export async function signInAction(
  locale: Locale,
  _previousState: AuthActionState = initialAuthState,
  formData: FormData
): Promise<AuthActionState> {
  if (!isSupabasePublicConfigured()) {
    return {
      error: "Supabase authentication is not configured yet. Omnia Watch is currently running in demo mode.",
      success: null
    };
  }

  const { email, password } = readCredentials(formData);
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      error: "Supabase authentication is unavailable in this environment.",
      success: null
    };
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    return {
      error: error.message,
      success: null
    };
  }

  redirect(localizePath(locale, "/app"));
}

export async function signUpAction(
  locale: Locale,
  _previousState: AuthActionState = initialAuthState,
  formData: FormData
): Promise<AuthActionState> {
  if (!isSupabasePublicConfigured()) {
    return {
      error: "Supabase authentication is not configured yet. Omnia Watch is currently running in demo mode.",
      success: null
    };
  }

  const { email, password } = readCredentials(formData);
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      error: "Supabase authentication is unavailable in this environment.",
      success: null
    };
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    options: {
      emailRedirectTo: getAuthRedirect(locale)
    },
    password
  });

  if (error) {
    return {
      error: error.message,
      success: null
    };
  }

  if (data.session) {
    redirect(localizePath(locale, "/app"));
  }

  return {
    error: null,
    success:
      "Account created. If email confirmation is enabled in Supabase, finish the verification email before signing in."
  };
}

export async function signInWithGoogleAction(
  locale: Locale,
  _previousState: AuthActionState = initialAuthState,
  _formData?: FormData
): Promise<AuthActionState> {
  if (!isSupabasePublicConfigured()) {
    return {
      error: "Supabase authentication is not configured yet. Omnia Watch is currently running in demo mode.",
      success: null
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      error: "Supabase authentication is unavailable in this environment.",
      success: null
    };
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    options: {
      redirectTo: getAuthRedirect(locale)
    },
    provider: "google"
  });

  if (error) {
    return {
      error: error.message,
      success: null
    };
  }

  if (data.url) {
    redirect(data.url);
  }

  return {
    error: "Supabase did not return a Google authorization URL.",
    success: null
  };
}

export async function sendMagicLinkAction(
  locale: Locale,
  _previousState: AuthActionState = initialAuthState,
  formData: FormData
): Promise<AuthActionState> {
  if (!isSupabasePublicConfigured()) {
    return {
      error: "Supabase authentication is not configured yet. Omnia Watch is currently running in demo mode.",
      success: null
    };
  }

  const email = readEmail(formData);
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      error: "Supabase authentication is unavailable in this environment.",
      success: null
    };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: getAuthRedirect(locale),
      shouldCreateUser: true
    }
  });

  if (error) {
    return {
      error: error.message,
      success: null
    };
  }

  return {
    error: null,
    success:
      "Magic link sent. Check your inbox and open the link on this browser to continue into Omnia Watch."
  };
}

export async function signOutAction(locale: Locale) {
  if (isSupabasePublicConfigured()) {
    const supabase = await createSupabaseServerClient();
    await supabase?.auth.signOut();
  }

  redirect(localizePath(locale, "/sign-in"));
}
