import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, supportedLocales } from "@omnia-watch/i18n";
import { updateSupabaseSession } from "@/lib/supabase/middleware";

const PUBLIC_FILE = /\.(.*)$/;

function getPreferredLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get("omnia-watch-locale")?.value;
  if (cookieLocale && supportedLocales.includes(cookieLocale as (typeof supportedLocales)[number])) {
    return cookieLocale;
  }

  const preferred = request.headers.get("accept-language")?.toLowerCase() ?? "";
  if (preferred.includes("tr")) {
    return "tr";
  }

  return defaultLocale;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return updateSupabaseSession(request, NextResponse.next());
  }

  if (supportedLocales.some((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))) {
    return updateSupabaseSession(request, NextResponse.next());
  }

  const locale = getPreferredLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;

  const response = NextResponse.redirect(url);
  response.cookies.set("omnia-watch-locale", locale, {
    maxAge: 60 * 60 * 24 * 365,
    path: "/"
  });
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
