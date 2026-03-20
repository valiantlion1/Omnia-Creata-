"use client";

import { brand, releaseNotes } from "@prompt-vault/config";
import { Download } from "lucide-react";
import Link from "next/link";
import { Badge, Button, Select } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";

function SettingsRow({
  title,
  description,
  control,
}: {
  title: string;
  description?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-medium text-[var(--text-primary)]">{title}</div>
        {description ? (
          <div className="mt-0.5 text-xs text-[var(--text-tertiary)]">{description}</div>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function SettingsGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-1">
      <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
        {title}
      </h2>
      <div className="divide-y divide-[var(--border)] rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] px-4">
        {children}
      </div>
    </section>
  );
}

export function SettingsView() {
  const {
    dataset, exportVault, updatePreferences, authMode,
    resetPreview, runtime, syncQueueCount,
    isCloudSessionActive, cloudSyncState,
  } = useVault();
  const { locale, t } = useLocaleContext();
  const { setTheme, theme } = useTheme();
  const latestRelease = releaseNotes[0];

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col gap-8 py-2">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          {t("app.settingsTitle")}
        </h1>
        <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
          {t("app.settingsSubtitle")}
        </p>
      </div>

      {/* Appearance */}
      <SettingsGroup title={t("settings.appearance")}>
        <SettingsRow
          title={t("common.theme")}
          description={t("settings.appearanceDescription")}
          control={
            <Select
              className="w-[120px] h-9 text-xs"
              onChange={(e) => {
                setTheme(e.target.value);
                updatePreferences({ theme: e.target.value as "system" | "light" | "dark" });
              }}
              value={theme ?? dataset.preferences.theme}
            >
              <option value="system">{t("settings.themeSystem")}</option>
              <option value="light">{t("settings.themeLight")}</option>
              <option value="dark">{t("settings.themeDark")}</option>
            </Select>
          }
        />
        <SettingsRow
          title={t("settings.density")}
          description={t("settings.defaultsDescription")}
          control={
            <Select
              className="w-[120px] h-9 text-xs"
              onChange={(e) => updatePreferences({ density: e.target.value as "comfortable" | "compact" })}
              value={dataset.preferences.density}
            >
              <option value="comfortable">{t("settings.densityComfortable")}</option>
              <option value="compact">{t("settings.densityCompact")}</option>
            </Select>
          }
        />
      </SettingsGroup>

      {/* Account & Sync */}
      <SettingsGroup title={t("settings.account")}>
        <SettingsRow
          title={t("settings.account")}
          description={isCloudSessionActive ? t("settings.accountReadySupabase") : t("settings.accountReadyPreview")}
          control={
            <Badge tone={isCloudSessionActive ? "success" : "default"}>
              {isCloudSessionActive ? t("settings.live") : t("settings.preview")}
            </Badge>
          }
        />
        <SettingsRow
          title={t("app.vaultStatus")}
          control={
            <span className="text-xs font-medium text-[var(--text-primary)]">
              {cloudSyncState === "loading"
                ? locale === "tr" ? "Yükleniyor" : "Loading"
                : cloudSyncState === "saving"
                  ? locale === "tr" ? "Sync ediliyor" : "Syncing"
                  : cloudSyncState === "error"
                    ? locale === "tr" ? "Sorun var" : "Issue"
                    : isCloudSessionActive
                      ? t("app.cloudReadyLabel")
                      : t("app.localReadyLabel")}
            </span>
          }
        />
        <SettingsRow
          title={t("app.pendingSyncLabel")}
          control={<span className="text-xs font-medium text-[var(--text-primary)]">{syncQueueCount}</span>}
        />
        <SettingsRow
          title={t("app.planTitle")}
          description={t("app.planSummary")}
          control={
            <Badge>{runtime.enablePro ? t("app.proReadyLabel") : t("app.proComingSoonLabel")}</Badge>
          }
        />
      </SettingsGroup>

      {/* Backups */}
      <SettingsGroup title={t("settings.backups")}>
        <div className="space-y-2 py-3">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => exportVault("json")} size="sm" variant="secondary">
              <Download className="h-3.5 w-3.5" />
              JSON
            </Button>
            <Button onClick={() => exportVault("markdown")} size="sm" variant="secondary">
              <Download className="h-3.5 w-3.5" />
              Markdown
            </Button>
            <Button onClick={() => exportVault("txt")} size="sm" variant="secondary">
              <Download className="h-3.5 w-3.5" />
              TXT
            </Button>
          </div>
          {!authMode.enabled ? (
            <Button onClick={resetPreview} size="sm" variant="ghost">
              {t("settings.resetPreviewData")}
            </Button>
          ) : null}
        </div>
      </SettingsGroup>

      {/* About / Release notes */}
      <SettingsGroup title={locale === "tr" ? "Hakkında" : "About"}>
        <div className="space-y-2 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text-primary)]">{brand.name}</span>
            <Badge tone="accent">{latestRelease.version}</Badge>
          </div>
          <p className="text-xs leading-relaxed text-[var(--text-secondary)]">
            {latestRelease.summary[locale]}
          </p>
          <Link href={localizeHref(locale, "/app/recent")}>
            <Button size="sm" variant="ghost">
              {locale === "tr" ? "Güncelleme notları" : "Release notes"}
            </Button>
          </Link>
        </div>
      </SettingsGroup>
    </div>
  );
}
