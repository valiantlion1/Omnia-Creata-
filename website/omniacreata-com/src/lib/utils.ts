import { isLocale } from "@/i18n/config";

export const STUDIO_PREVIEW_URL =
  process.env.NEXT_PUBLIC_STUDIO_URL || "";

export const STUDIO_PREVIEW_AVAILABLE = Boolean(STUDIO_PREVIEW_URL);

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function absoluteUrl(path = "/") {
  return new URL(path, "https://omniacreata.com").toString();
}

export function studioUrl(path = "/") {
  return new URL(path, STUDIO_PREVIEW_URL || absoluteUrl("/")).toString();
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
  return STUDIO_PREVIEW_AVAILABLE ? studioUrl("/") : withLocalePrefix(locale, "/contact");
}

export function studioPrimaryLabel() {
  return STUDIO_PREVIEW_AVAILABLE ? "Open Studio" : "Contact";
}

export function studioAccessHref(locale: string) {
  return STUDIO_PREVIEW_AVAILABLE
    ? studioUrl("/")
    : `${withLocalePrefix(locale, "/contact")}?intent=studio_access`;
}

export function studioAccessLabel() {
  return STUDIO_PREVIEW_AVAILABLE ? "Open Studio" : "Contact us";
}
