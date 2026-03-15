"use client";

import { localizeHref } from "@/lib/locale";
import { saveLocalePreference } from "@/lib/storage";
import { useLocaleContext } from "@/providers/locale-provider";
import { locales, type Locale } from "@prompt-vault/types";
import { usePathname, useRouter } from "next/navigation";

export function LanguageSwitcher() {
  const { locale, t } = useLocaleContext();
  const pathname = usePathname();
  const router = useRouter();

  function onChange(nextLocale: string) {
    const safeLocale = (locales.includes(nextLocale as Locale) ? nextLocale : "en") as Locale;
    saveLocalePreference(safeLocale);
    const nextPath = localizeHref(safeLocale, pathname);
    const search = typeof window !== "undefined" ? window.location.search : "";
    router.push(search ? `${nextPath}${search}` : nextPath);
  }

  return (
    <select
      aria-label={t("common.language")}
      className="h-10 appearance-none rounded-full border border-[var(--border)] bg-[color:rgba(255,255,255,0.03)] px-4 pr-8 text-sm font-medium text-[var(--text-secondary)] shadow-[var(--shadow-panel)] backdrop-blur-xl hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none"
      onChange={(event) => onChange(event.target.value)}
      value={locale}
    >
      <option value="en">EN</option>
      <option value="tr">TR</option>
    </select>
  );
}
