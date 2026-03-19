"use client";

import { brand, releaseNotes } from "@prompt-vault/config";
import { Shield, Sparkles, SwatchBook, Upload } from "lucide-react";
import Link from "next/link";
import { Badge, Button, Select, Surface } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";
import { useTheme } from "next-themes";
import type { ReactNode } from "react";

function SettingsRow({
  title,
  description,
  control
}: {
  title: string;
  description?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] p-4">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-[var(--text-primary)]">{title}</div>
        {description ? (
          <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{description}</div>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export function SettingsView() {
  const {
    dataset,
    exportVault,
    updatePreferences,
    authMode,
    resetPreview,
    runtime,
    syncQueueCount,
    isCloudSessionActive,
    cloudSyncState
  } = useVault();
  const { locale, t } = useLocaleContext();
  const { setTheme, theme } = useTheme();
  const latestRelease = releaseNotes[0];

  return (
    <div className="space-y-6 lg:space-y-7">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Surface className="rounded-[28px] bg-[linear-gradient(135deg,rgba(242,202,80,0.08),rgba(20,20,20,0.92)_48%,rgba(111,151,141,0.06))] p-5 md:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="info">{t("common.settings")}</Badge>
              <Badge tone="accent">{t("app.freePlanLabel")}</Badge>
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-extrabold tracking-[-0.05em] text-[var(--text-primary)] md:text-[2rem]">
                {t("app.settingsTitle")}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)] md:text-base md:leading-8">
                {t("app.settingsSubtitle")}
              </p>
            </div>
          </div>
        </Surface>

        <Surface className="rounded-[28px] bg-[rgba(20,20,20,0.9)] p-5 md:p-6">
          <div className="grid gap-3">
            <StatusMetric icon={<Sparkles className="h-4 w-4" />} label={t("app.planTitle")} value={runtime.enableAds ? t("app.adsOnLabel") : t("app.adsOffLabel")} />
            <StatusMetric
              icon={<Shield className="h-4 w-4" />}
              label={t("app.vaultStatus")}
              value={
                cloudSyncState === "loading"
                  ? locale === "tr"
                    ? "Sync yukleniyor"
                    : "Sync loading"
                  : cloudSyncState === "saving"
                    ? locale === "tr"
                      ? "Sync ediliyor"
                      : "Syncing"
                    : cloudSyncState === "error"
                      ? locale === "tr"
                        ? "Sync sorunu"
                        : "Sync issue"
                      : isCloudSessionActive
                        ? t("app.cloudReadyLabel")
                        : t("app.localReadyLabel")
              }
            />
            <StatusMetric icon={<Upload className="h-4 w-4" />} label={t("app.pendingSyncLabel")} value={`${syncQueueCount}`} />
          </div>
        </Surface>
      </section>

      <section className="space-y-4">
        <SectionHeader icon={<SwatchBook className="h-4 w-4" />} title={t("settings.appearance")} />
        <Surface className="space-y-3 rounded-[22px] bg-[rgba(28,27,27,0.96)] p-5">
          <SettingsRow
            control={
              <Select
                className="w-[140px]"
                onChange={(event) => {
                  setTheme(event.target.value);
                  updatePreferences({
                    theme: event.target.value as "system" | "light" | "dark"
                  });
                }}
                value={theme ?? dataset.preferences.theme}
              >
                <option value="system">{t("settings.themeSystem")}</option>
                <option value="light">{t("settings.themeLight")}</option>
                <option value="dark">{t("settings.themeDark")}</option>
              </Select>
            }
            description={t("settings.appearanceDescription")}
            title={t("common.theme")}
          />
          <SettingsRow
            control={
              <Select
                className="w-[140px]"
                onChange={(event) =>
                  updatePreferences({
                    density: event.target.value as "comfortable" | "compact"
                  })
                }
                value={dataset.preferences.density}
              >
                <option value="comfortable">{t("settings.densityComfortable")}</option>
                <option value="compact">{t("settings.densityCompact")}</option>
              </Select>
            }
            description={t("settings.defaultsDescription")}
            title={t("settings.density")}
          />
        </Surface>
      </section>

      <section className="space-y-4">
        <SectionHeader icon={<Shield className="h-4 w-4" />} title={t("settings.account")} />
        <Surface className="space-y-3 rounded-[22px] bg-[rgba(28,27,27,0.96)] p-5">
          <SettingsRow
            control={<Badge tone="accent">{isCloudSessionActive ? t("settings.live") : t("settings.preview")}</Badge>}
            description={
              isCloudSessionActive ? t("settings.accountReadySupabase") : t("settings.accountReadyPreview")
            }
            title={t("settings.account")}
          />
          <SettingsRow
            control={<Badge>{runtime.enablePro ? t("app.proReadyLabel") : t("app.proComingSoonLabel")}</Badge>}
            description={t("app.planSummary")}
            title={t("app.planTitle")}
          />
        </Surface>
      </section>

      <section className="space-y-4">
        <SectionHeader icon={<Upload className="h-4 w-4" />} title={t("settings.backups")} />
        <Surface className="space-y-3 rounded-[22px] bg-[rgba(28,27,27,0.96)] p-5">
          <div className="grid gap-2 sm:grid-cols-3">
            <Button onClick={() => exportVault("json")} variant="secondary">
              {t("app.exportJson")}
            </Button>
            <Button onClick={() => exportVault("markdown")} variant="secondary">
              {t("app.exportMarkdown")}
            </Button>
            <Button onClick={() => exportVault("txt")} variant="secondary">
              {t("app.exportTxt")}
            </Button>
          </div>
          {!authMode.enabled ? (
            <Button onClick={resetPreview} variant="ghost">
              {t("settings.resetPreviewData")}
            </Button>
          ) : null}
        </Surface>
      </section>

      <section className="space-y-4">
        <SectionHeader icon={<Sparkles className="h-4 w-4" />} title={locale === "tr" ? "Guncelleme notlari" : "Update notes"} />
        <Surface className="space-y-4 rounded-[22px] bg-[rgba(28,27,27,0.96)] p-5">
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              <Badge tone="accent">{latestRelease.version}</Badge>
              <Badge>{formatDate(latestRelease.publishedAt, locale)}</Badge>
            </div>
            <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              {latestRelease.title[locale]}
            </div>
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              {latestRelease.summary[locale]}
            </p>
          </div>

          <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 text-sm leading-7 text-[var(--text-secondary)]">
            {locale === "tr"
              ? `${brand.name} icindeki tum surum gecmisi ve son aktivite akisini ayri ekranda gorebilirsin.`
              : `You can open the dedicated screen to see ${brand.name}'s full release history and latest activity flow.`}
          </div>

          <Link href={localizeHref(locale, "/app/recent")}>
            <Button variant="secondary">
              {locale === "tr" ? "Tum guncelleme notlarini ac" : "Open full update notes"}
            </Button>
          </Link>
        </Surface>
      </section>
    </div>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-strong)]">
        {icon}
      </div>
      <h2 className="font-display text-xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
        {title}
      </h2>
    </div>
  );
}

function StatusMetric({
  label,
  value,
  icon
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
        <span className="text-[var(--accent-secondary-strong)]">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
