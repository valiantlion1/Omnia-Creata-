import type { Locale } from "@omnia-watch/types";
import { locales } from "@omnia-watch/types";
import { en } from "./en";
import { tr } from "./tr";

export const defaultLocale: Locale = "en";
export const supportedLocales = locales;

export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = {
  en,
  tr
};

export function isLocale(value: string): value is Locale {
  return supportedLocales.includes(value as Locale);
}

export function resolveLocale(value?: string | null): Locale {
  if (value && isLocale(value)) {
    return value;
  }

  return defaultLocale;
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function getAlternateLocale(locale: Locale): Locale {
  return locale === "en" ? "tr" : "en";
}
