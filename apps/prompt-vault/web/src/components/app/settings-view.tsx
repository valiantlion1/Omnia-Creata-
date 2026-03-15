"use client";

import { PageHeader } from "@/components/app/page-header";
import { Badge, Button, SectionHeading, Select, Surface } from "@/components/ui/primitives";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";
import { useTheme } from "next-themes";

export function SettingsView() {
  const { dataset, exportVault, updatePreferences, authMode, resetPreview } = useVault();
  const { t } = useLocaleContext();
  const { setTheme, theme } = useTheme();

  return (
    <div className="space-y-6">
      <PageHeader title={t("app.settingsTitle")} subtitle={t("app.settingsSubtitle")} />
      <div className="grid gap-6 xl:grid-cols-2">
        <Surface className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <SectionHeading
              title={t("settings.appearance")}
              description={t("settings.appearanceDescription")}
            />
            <Badge tone="accent">{authMode.enabled ? t("settings.live") : t("settings.preview")}</Badge>
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-[var(--text-secondary)]">{t("common.theme")}</label>
            <Select
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
          </div>
          <div className="space-y-2">
            <label className="block text-sm text-[var(--text-secondary)]">{t("settings.density")}</label>
            <Select
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
          </div>
        </Surface>
        <Surface className="space-y-4 p-5">
          <SectionHeading
            title={t("settings.defaults")}
            description={t("settings.defaultsDescription")}
          />
          <div className="space-y-2">
            <label className="block text-sm text-[var(--text-secondary)]">{t("settings.defaultLibraryView")}</label>
            <Select
              onChange={(event) =>
                updatePreferences({
                  defaultView: event.target.value as "list" | "grid"
                })
              }
              value={dataset.preferences.defaultView}
            >
              <option value="list">{t("settings.viewList")}</option>
              <option value="grid">{t("settings.viewGrid")}</option>
            </Select>
          </div>
          <p className="text-sm leading-7 text-[var(--text-secondary)]">{t("app.offlineDescription")}</p>
        </Surface>
        <Surface className="space-y-4 p-5">
          <SectionHeading
            title={t("settings.backups")}
            description={t("settings.backupsDescription")}
          />
          <div className="flex flex-wrap gap-2">
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
        </Surface>
        <Surface className="space-y-4 p-5">
          <SectionHeading
            title={t("settings.account")}
            description={t("settings.accountDescription")}
          />
          <p className="text-sm leading-7 text-[var(--text-secondary)]">
            {authMode.enabled
              ? t("settings.accountReadySupabase")
              : t("settings.accountReadyPreview")}
          </p>
          {!authMode.enabled ? (
            <Button onClick={resetPreview} variant="ghost">
              {t("settings.resetPreviewData")}
            </Button>
          ) : null}
        </Surface>
      </div>
    </div>
  );
}
