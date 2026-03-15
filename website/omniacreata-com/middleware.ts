import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  defaultLocale,
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
    if (candidate !== defaultLocale) {
      const url = request.nextUrl.clone();
      const rest = segments.slice(2).join("/");
      url.pathname = `/${defaultLocale}${rest ? `/${rest}` : ""}`;
      return NextResponse.redirect(url);
    }

    const response = NextResponse.next();
    response.cookies.set(localeCookieName, defaultLocale, {
      maxAge: 60 * 60 * 24 * 365,
      path: "/",
    });
    return response;
  }

  const url = request.nextUrl.clone();
  url.pathname =
    pathname === "/" ? `/${defaultLocale}` : `/${defaultLocale}${pathname}`;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
