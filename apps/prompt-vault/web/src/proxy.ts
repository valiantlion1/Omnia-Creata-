import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { locales } from "@prompt-vault/types";
import { env, isSupabaseConfigured } from "@/lib/env";

const publicFile = /\.[^/]+$/;
const excluded = new Set(["/icon", "/apple-icon", "/manifest.webmanifest", "/robots.txt", "/sitemap.xml", "/sw.js"]);

async function refreshSupabaseAuthSession(request: NextRequest, response: NextResponse) {
  if (!isSupabaseConfigured) {
    return response;
  }

  const supabase = createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookieValues) {
        cookieValues.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookieValues.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  await supabase.auth.getUser();

  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    publicFile.test(pathname) ||
    excluded.has(pathname)
  ) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api")) {
    return refreshSupabaseAuthSession(request, NextResponse.next());
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (hasLocale) {
    return refreshSupabaseAuthSession(request, NextResponse.next());
  }

  const preferredLocale = request.cookies.get("pv-locale")?.value;
  const locale = locales.includes(preferredLocale as (typeof locales)[number])
    ? preferredLocale
    : "en";
  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;

  return refreshSupabaseAuthSession(request, NextResponse.redirect(nextUrl));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
