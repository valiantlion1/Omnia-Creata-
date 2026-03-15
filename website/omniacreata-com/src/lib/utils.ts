import { isLocale } from "@/i18n/config";

export function cn(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function absoluteUrl(path = "/") {
  return new URL(path, "https://omniacreata.com").toString();
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
