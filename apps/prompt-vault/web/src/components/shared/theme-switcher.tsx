"use client";

import { useLocaleContext } from "@/providers/locale-provider";
import { useTheme } from "next-themes";

export function ThemeSwitcher() {
  const { resolvedTheme, theme, setTheme } = useTheme();
  const { t } = useLocaleContext();
  const value = theme ?? resolvedTheme ?? "system";

  return (
    <select
      aria-label={t("common.theme")}
      className="h-10 appearance-none rounded-full border border-[var(--border)] bg-[color:rgba(255,255,255,0.03)] px-4 pr-8 text-sm font-medium text-[var(--text-secondary)] shadow-[var(--shadow-panel)] backdrop-blur-xl hover:border-[var(--border-strong)] focus:border-[var(--accent)] focus:outline-none"
      onChange={(event) => setTheme(event.target.value)}
      value={value}
    >
      <option value="system">{t("settings.themeSystem")}</option>
      <option value="light">{t("settings.themeLight")}</option>
      <option value="dark">{t("settings.themeDark")}</option>
    </select>
  );
}
