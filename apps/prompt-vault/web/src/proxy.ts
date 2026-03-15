import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { locales } from "@prompt-vault/types";

const publicFile = /\.[^/]+$/;
const excluded = new Set(["/icon", "/apple-icon", "/manifest.webmanifest", "/robots.txt", "/sitemap.xml", "/sw.js"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    publicFile.test(pathname) ||
    excluded.has(pathname)
  ) {
    return NextResponse.next();
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );

  if (hasLocale) {
    return NextResponse.next();
  }

  const preferredLocale = request.cookies.get("pv-locale")?.value;
  const locale = locales.includes(preferredLocale as (typeof locales)[number])
    ? preferredLocale
    : "en";
  const nextUrl = request.nextUrl.clone();
  nextUrl.pathname = pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;

  return NextResponse.redirect(nextUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
