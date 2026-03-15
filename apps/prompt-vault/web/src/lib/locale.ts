import { locales, type Locale } from "@prompt-vault/types";
import { notFound } from "next/navigation";

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function assertLocale(value: string): Locale {
  if (!isLocale(value)) {
    notFound();
  }

  return value;
}

export function stripLocaleFromPath(pathname: string) {
  const segments = pathname.split("/");
  if (segments.length > 1 && isLocale(segments[1])) {
    return `/${segments.slice(2).join("/")}`.replace(/\/+$/, "") || "/";
  }

  return pathname || "/";
}

export function localizeHref(locale: Locale, pathname: string) {
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const withoutLocale = stripLocaleFromPath(normalized);

  return withoutLocale === "/" ? `/${locale}` : `/${locale}${withoutLocale}`;
}
