"use client";

import type { Route } from "next";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  localeCookieName,
  localeRegistry,
  stripLocaleFromPath,
  type LocaleCode,
} from "@/i18n/config";

type LocaleSwitcherProps = {
  locale: LocaleCode;
  label: string;
};

export function LocaleSwitcher({ locale, label }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const router = useRouter();

  const pathWithoutLocale = useMemo(() => stripLocaleFromPath(pathname), [pathname]);

  function onChange(nextLocale: string) {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=${60 * 60 * 24 * 365}`;
    router.push(
      `/${nextLocale}${pathWithoutLocale === "/" ? "" : pathWithoutLocale}` as Route,
    );
  }

  return (
    <label className="flex items-center gap-3 text-xs text-foreground-soft">
      <span className="hidden uppercase tracking-[0.28em] text-muted sm:inline">
        {label}
      </span>
      <div className="relative">
        <select
          aria-label={label}
          className="h-9 rounded-full border border-white/10 bg-white/[0.04] px-3 pr-8 text-sm text-foreground outline-none transition hover:border-[rgba(217,181,109,0.22)]"
          defaultValue={locale}
          onChange={(event) => onChange(event.target.value)}
        >
          {localeRegistry.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {entry.flag} {entry.nativeLabel}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted">
          v
        </span>
      </div>
    </label>
  );
}
