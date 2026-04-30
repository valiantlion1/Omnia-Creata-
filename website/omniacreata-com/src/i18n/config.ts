export type LocaleCode =
  | "en"
  | "tr"
  | "de"
  | "fr"
  | "es"
  | "pt-BR"
  | "ar"
  | "ru"
  | "ja"
  | "zh-CN";

export type LocaleDefinition = {
  code: LocaleCode;
  label: string;
  nativeLabel: string;
  flag: string;
  dir: "ltr" | "rtl";
  default?: boolean;
  hreflang: string;
};

export const localeRegistry: LocaleDefinition[] = [
  {
    code: "en",
    label: "English",
    nativeLabel: "English",
    flag: "🇺🇸",
    dir: "ltr",
    default: true,
    hreflang: "en-US",
  },
  {
    code: "tr",
    label: "Turkish",
    nativeLabel: "Turkce",
    flag: "🇹🇷",
    dir: "ltr",
    hreflang: "tr-TR",
  },
  {
    code: "de",
    label: "German",
    nativeLabel: "Deutsch",
    flag: "🇩🇪",
    dir: "ltr",
    hreflang: "de-DE",
  },
  {
    code: "fr",
    label: "French",
    nativeLabel: "Francais",
    flag: "🇫🇷",
    dir: "ltr",
    hreflang: "fr-FR",
  },
  {
    code: "es",
    label: "Spanish",
    nativeLabel: "Espanol",
    flag: "🇪🇸",
    dir: "ltr",
    hreflang: "es-ES",
  },
  {
    code: "pt-BR",
    label: "Portuguese (Brazil)",
    nativeLabel: "Portugues (Brasil)",
    flag: "🇧🇷",
    dir: "ltr",
    hreflang: "pt-BR",
  },
  {
    code: "ar",
    label: "Arabic",
    nativeLabel: "Arabic",
    flag: "🇸🇦",
    dir: "rtl",
    hreflang: "ar",
  },
  {
    code: "ru",
    label: "Russian",
    nativeLabel: "Russkiy",
    flag: "🇷🇺",
    dir: "ltr",
    hreflang: "ru-RU",
  },
  {
    code: "ja",
    label: "Japanese",
    nativeLabel: "Nihongo",
    flag: "🇯🇵",
    dir: "ltr",
    hreflang: "ja-JP",
  },
  {
    code: "zh-CN",
    label: "Chinese (Simplified)",
    nativeLabel: "Zhongwen (Jianti)",
    flag: "🇨🇳",
    dir: "ltr",
    hreflang: "zh-CN",
  },
];

export const defaultLocale: LocaleCode = "en";
export const localeCookieName = "omniacreata-locale";
export const localeCodes = localeRegistry.map((locale) => locale.code);

export function isLocale(value: string): value is LocaleCode {
  return localeCodes.includes(value as LocaleCode);
}

export function getLocaleDefinition(locale: string) {
  return localeRegistry.find((entry) => entry.code === locale) ?? localeRegistry[0];
}

export function getLocaleDirection(locale: string) {
  return getLocaleDefinition(locale).dir;
}

export function getLocalizedPath(locale: LocaleCode, path = "/") {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `/${locale}${normalized === "/" ? "" : normalized}`;
}

export function stripLocaleFromPath(pathname: string) {
  const segments = pathname.split("/");
  const candidate = segments[1];

  if (candidate && isLocale(candidate)) {
    const rest = segments.slice(2).join("/");
    return rest ? `/${rest}` : "/";
  }

  return pathname || "/";
}

function normalizeAcceptLanguage(value: string) {
  return value
    .split(",")
    .map((entry) => entry.split(";")[0]?.trim())
    .filter(Boolean);
}

const localeAliases: Record<string, LocaleCode> = {
  ar: "ar",
  de: "de",
  en: "en",
  es: "es",
  fr: "fr",
  ja: "ja",
  pt: "pt-BR",
  "pt-br": "pt-BR",
  ru: "ru",
  tr: "tr",
  zh: "zh-CN",
  "zh-cn": "zh-CN",
};

export function getPreferredLocale(options: {
  cookieLocale?: string;
  acceptLanguage?: string | null;
}) {
  if (options.cookieLocale && isLocale(options.cookieLocale)) {
    return options.cookieLocale;
  }

  const accepted = normalizeAcceptLanguage(options.acceptLanguage ?? "");

  for (const language of accepted) {
    const lowered = language.toLowerCase();

    if (localeAliases[lowered]) {
      return localeAliases[lowered];
    }

    const base = lowered.split("-")[0];

    if (base && localeAliases[base]) {
      return localeAliases[base];
    }
  }

  return defaultLocale;
}

export function buildLanguageAlternates(path: string) {
  const alternates: Record<string, string> = {};

  for (const locale of localeRegistry) {
    alternates[locale.hreflang] = `https://omniacreata.com${getLocalizedPath(locale.code, path)}`;
  }

  alternates["x-default"] = `https://omniacreata.com${getLocalizedPath(defaultLocale, path)}`;

  return alternates;
}
