import { isLocale } from "@/i18n/config";

export const SITE_ORIGIN = "https://www.omniacreata.com";
export const STUDIO_ORIGIN = "https://studio.omniacreata.com";

export const STUDIO_PREVIEW_URL =
  process.env.NEXT_PUBLIC_STUDIO_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://127.0.0.1:5173"
    : STUDIO_ORIGIN);

const STUDIO_LANDING_PATH = "/landing";

export const STUDIO_PREVIEW_AVAILABLE = Boolean(STUDIO_PREVIEW_URL);

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function absoluteUrl(path = "/") {
  return new URL(path, SITE_ORIGIN).toString();
}

export function studioUrl(path = "/") {
  return new URL(path, STUDIO_PREVIEW_URL || absoluteUrl("/")).toString();
}

export function studioLandingHref(locale: string) {
  return STUDIO_PREVIEW_AVAILABLE ? studioUrl(STUDIO_LANDING_PATH) : studioPageHref(locale);
}

export function withLocalePrefix(locale: string, href: string) {
  if (!href.startsWith("/")) {
    return href;
  }

  const hashIndex = href.indexOf("#");
  const hash = hashIndex >= 0 ? href.slice(hashIndex) : "";
  const pathname = hashIndex >= 0 ? href.slice(0, hashIndex) : href;
  const candidate = pathname.split("/")[1];

  if (candidate && isLocale(candidate)) {
    return href;
  }

  if (href === "/") {
    return `/${locale}`;
  }

  return `/${locale}${pathname}${hash}`;
}

export function studioPageHref(locale: string) {
  return withLocalePrefix(locale, "/products/omnia-creata-studio");
}

export function studioPrimaryHref(locale: string) {
  return studioLandingHref(locale);
}

function isTurkish(locale?: string) {
  return locale === "tr";
}

export function studioPrimaryLabel(locale?: string) {
  if (STUDIO_PREVIEW_AVAILABLE) {
    return isTurkish(locale) ? "Studio'yu ac" : "Open Studio";
  }

  return isTurkish(locale) ? "Studio'yu gor" : "See Studio";
}

export function studioAccessHref(locale: string) {
  return studioLandingHref(locale);
}

export function studioAccessLabel(locale?: string) {
  if (STUDIO_PREVIEW_AVAILABLE) {
    return isTurkish(locale) ? "Studio'yu ac" : "Open Studio";
  }

  return isTurkish(locale) ? "Studio'yu gor" : "See Studio";
}
