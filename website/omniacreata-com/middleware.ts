import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  defaultLocale,
  getPreferredLocale,
  isLocale,
  localeCookieName,
} from "@/i18n/config";

const PUBLIC_FILE = /\.[^/]+$/;
const INTERNAL_PATHS = ["/_next", "/api", "/opengraph-image"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    INTERNAL_PATHS.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const segments = pathname.split("/");
  const candidate = segments[1];

  if (candidate && isLocale(candidate)) {
    const response = NextResponse.next();
    response.cookies.set(localeCookieName, candidate, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return response;
  }

  const url = request.nextUrl.clone();
  const preferredLocale = getPreferredLocale({
    cookieLocale: request.cookies.get(localeCookieName)?.value,
    acceptLanguage: request.headers.get("accept-language"),
  });
  url.pathname =
    pathname === "/" ? `/${preferredLocale}` : `/${defaultLocale}${pathname}`;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
