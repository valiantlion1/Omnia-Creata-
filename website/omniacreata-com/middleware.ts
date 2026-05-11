import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  defaultLocale,
  isLocale,
  localeCookieName,
} from "@/i18n/config";

const PUBLIC_FILE = /\.[^/]+$/;
const INTERNAL_PATHS = ["/_next", "/api", "/opengraph-image"];
const APEX_HOST = "omniacreata.com";
const CANONICAL_HOST = "www.omniacreata.com";
const VERCEL_APP_HOST = /\.vercel\.app$/;
const MAINTENANCE_SEGMENT = "maintenance";
const DEFAULT_STUDIO_ORIGIN = "https://studio.omniacreata.com";
const STUDIO_ROUTE_SEGMENTS = new Set([
  "account",
  "billing",
  "chat",
  "community",
  "compose",
  "create",
  "dashboard",
  "elements",
  "explore",
  "gallery",
  "history",
  "landing",
  "library",
  "login",
  "media",
  "plan",
  "profile",
  "projects",
  "settings",
  "shared",
  "signup",
  "social",
  "studio",
  "subscription",
  "u",
]);

function isMaintenanceModeEnabled() {
  const value = (
    process.env.SITE_MAINTENANCE_MODE ??
    process.env.NEXT_PUBLIC_SITE_MAINTENANCE_MODE ??
    ""
  )
    .trim()
    .toLowerCase();

  return value === "1" || value === "true" || value === "on" || value === "yes";
}

function isMaintenancePath(pathname: string) {
  const segments = pathname.split("/");
  const candidate = segments[1];

  if (candidate && isLocale(candidate)) {
    return segments[2] === MAINTENANCE_SEGMENT;
  }

  return candidate === MAINTENANCE_SEGMENT;
}

function localeFromPath(pathname: string) {
  const candidate = pathname.split("/")[1];
  return candidate && isLocale(candidate) ? candidate : defaultLocale;
}

function getStudioOrigin() {
  const configured = (
    process.env.NEXT_PUBLIC_STUDIO_URL ??
    process.env.STUDIO_URL ??
    ""
  ).trim();

  return configured || DEFAULT_STUDIO_ORIGIN;
}

function studioPathFromPublicPath(pathname: string) {
  const segments = pathname.split("/");
  const firstSegment = segments[1];
  const offset = firstSegment && isLocale(firstSegment) ? 2 : 1;
  const routeSegment = segments[offset];

  if (!routeSegment || !STUDIO_ROUTE_SEGMENTS.has(routeSegment)) {
    return null;
  }

  if (routeSegment === "studio" && segments.length === offset + 1) {
    return "/landing";
  }

  const studioPath = `/${segments.slice(offset).join("/")}`;
  return studioPath === "/" ? "/landing" : studioPath;
}

function maybeRedirectStudioRoute(request: NextRequest, pathname: string) {
  const studioPath = studioPathFromPublicPath(pathname);
  if (!studioPath) return null;

  const url = new URL(studioPath, getStudioOrigin());
  url.search = request.nextUrl.search;
  return NextResponse.redirect(url, 307);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = request.headers.get("host")?.split(":")[0]?.toLowerCase();

  if (host && VERCEL_APP_HOST.test(host)) {
    const url = request.nextUrl.clone();
    url.protocol = "https";
    url.hostname = CANONICAL_HOST;
    if (pathname === "/") {
      url.pathname = `/${defaultLocale}`;
    }
    return NextResponse.redirect(url, 308);
  }

  if (host === APEX_HOST) {
    const url = request.nextUrl.clone();
    url.protocol = "https";
    url.hostname = CANONICAL_HOST;
    if (pathname === "/") {
      url.pathname = `/${defaultLocale}`;
    }
    return NextResponse.redirect(url, 308);
  }

  if (host === CANONICAL_HOST && pathname === "/") {
    const url = request.nextUrl.clone();
    url.protocol = "https";
    url.pathname = `/${defaultLocale}`;
    return NextResponse.redirect(url, 308);
  }

  if (
    INTERNAL_PATHS.some((prefix) => pathname.startsWith(prefix)) ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  const studioRedirect = maybeRedirectStudioRoute(request, pathname);
  if (studioRedirect) {
    return studioRedirect;
  }

  if (isMaintenanceModeEnabled() && !isMaintenancePath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${localeFromPath(pathname)}/${MAINTENANCE_SEGMENT}`;
    url.search = "";
    return NextResponse.redirect(url, 307);
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
  url.pathname =
    pathname === "/" ? `/${defaultLocale}` : `/${defaultLocale}${pathname}`;

  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
