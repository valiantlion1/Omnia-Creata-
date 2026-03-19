"use client";

import { brand, dashboardNavigation } from "@prompt-vault/config";
import type { Locale } from "@prompt-vault/types";
import { Download, Menu, Plus, Search, Settings2, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BrandMark } from "@/components/shared/brand-mark";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { Badge, Button, Surface } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { iconFor } from "@/lib/icons";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function navIconFor(key: string) {
  return iconFor(
    key === "dashboard"
      ? "layout-dashboard"
      : key === "library"
        ? "library-big"
        : key === "capture"
          ? "square-pen"
          : key === "projects"
            ? "folders"
            : "settings-2"
  );
}

export function AppShell({
  children,
  locale
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const pathname = usePathname();
  const { t } = useLocaleContext();
  const { cloudSyncState, isCloudSessionActive, runtime, syncQueueCount } = useVault();
  const [menuOpen, setMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const quickLinks = [
    {
      href: localizeHref(locale, "/app/capture"),
      label: t("app.quickCapture"),
      description: t("app.dashboardCaptureActionDescription"),
      icon: Plus
    },
    {
      href: localizeHref(locale, "/app/library"),
      label: t("app.quickOpenLibrary"),
      description: t("app.filterSurfaceDescription"),
      icon: Search
    },
    {
      href: localizeHref(locale, "/app/settings"),
      label: t("app.quickOpenSettings"),
      description: t("app.dashboardSettingsActionDescription"),
      icon: Settings2
    }
  ];

  async function onInstallApp() {
    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <div className="min-h-screen lg:px-4 lg:py-4">
      <div className="app-shell-frame mx-auto max-w-[1500px] px-4 pb-[calc(7.5rem+env(safe-area-inset-bottom))] pt-[max(0.875rem,env(safe-area-inset-top))] md:px-6 lg:h-[calc(100vh-2rem)] lg:overflow-hidden lg:rounded-[34px] lg:border lg:border-[var(--border)] lg:bg-[rgba(14,13,12,0.92)] lg:px-0 lg:pb-0 lg:pt-0 lg:shadow-[0_24px_80px_rgba(0,0,0,0.42)] lg:ring-1 lg:ring-white/4">
        <div className="app-chrome-bar hidden h-[72px] items-center justify-between border-b border-[var(--border)] px-5 lg:flex">
          <div className="flex items-center gap-4">
            <BrandMark compact />
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              {runtime.betaMode ? t("app.betaLabel") : t("common.app")}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge tone="accent">
              {syncQueueCount} {t("app.pendingSyncLabel").toLowerCase()}
            </Badge>
            <Badge tone={cloudSyncState === "error" ? "warning" : "default"}>
              {cloudSyncState === "loading"
                ? "Sync loading"
                : cloudSyncState === "saving"
                  ? "Syncing"
                  : cloudSyncState === "error"
                    ? "Sync issue"
                    : isCloudSessionActive
                      ? t("app.cloudReadyLabel")
                      : t("app.localReadyLabel")}
            </Badge>
            <Badge tone="info">{runtime.enableAI ? t("app.aiLiveLabel") : t("app.aiComingSoonLabel")}</Badge>
            {installPrompt ? (
              <Button onClick={onInstallApp} size="sm" variant="secondary">
                <Download className="h-4 w-4" />
                {t("app.installApp")}
              </Button>
            ) : null}
          </div>
        </div>

        <div className="lg:grid lg:h-[calc(100%-72px)] lg:grid-cols-[232px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden border-r border-[var(--border)] bg-[rgba(17,15,13,0.74)] lg:block">
            <div className="flex h-full flex-col gap-4 p-4">
              <div className="grid grid-cols-[44px_1fr_84px] items-center gap-2">
                <div className="flex h-11 w-11 items-center justify-center rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-strong)]" />
                </div>
                <ThemeSwitcher />
                <LanguageSwitcher />
              </div>

              <Surface className="app-sidebar-nav rounded-[24px] bg-transparent p-3 shadow-none ring-0 before:hidden">
                <div className="space-y-1.5">
                  {dashboardNavigation.map((item) => {
                    const Icon = navIconFor(item.key);
                    const href = localizeHref(locale, item.href);
                    const isActive = pathname === href;

                    return (
                      <Link
                        key={item.key}
                        className={cn(
                          "flex items-center gap-3 rounded-[16px] px-3.5 py-3 text-sm font-semibold transition",
                          isActive
                            ? "bg-[rgba(242,202,80,0.12)] text-[var(--accent-strong)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                        )}
                        href={href}
                      >
                        <Icon className="h-4 w-4" />
                        {t(`common.${item.key}`)}
                      </Link>
                    );
                  })}
                </div>
              </Surface>

              <Link href={localizeHref(locale, "/app/capture")}>
                <Button className="w-full" size="default">
                  <Plus className="h-4 w-4" />
                  {t("app.quickCapture")}
                </Button>
              </Link>
            </div>
          </aside>

          <div className="min-w-0 lg:overflow-y-auto lg:px-6 lg:py-6">
            <header className="mb-6 flex items-center justify-between gap-3 lg:hidden">
              <div className="flex items-center gap-3">
                <button
                  aria-expanded={menuOpen}
                  aria-label={t("app.quickActions")}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--border)] bg-[rgba(28,27,27,0.92)] text-[var(--accent-strong)] shadow-[var(--shadow-soft)] backdrop-blur-xl active:scale-95"
                  onClick={() => setMenuOpen((current) => !current)}
                  type="button"
                >
                {menuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </button>
              <BrandMark compact />
            </div>
            <div className="flex items-center gap-2">
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
            </header>

            <div className="lg:pt-1">{children}</div>
          </div>
        </div>
      </div>

      <div
        className={cn(
          "fixed inset-0 z-40 flex items-end lg:hidden",
          menuOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <button
          aria-label={t("common.cancel")}
          className={cn(
            "absolute inset-0 bg-black/45 transition",
            menuOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMenuOpen(false)}
          type="button"
        />
        <div className="relative w-full">
          <div className="mx-auto w-full max-w-[760px] px-4 md:px-6">
            <Surface
              className={cn(
                "rounded-b-none border-b-0 bg-[rgba(20,20,20,0.92)] px-4 py-4 shadow-[var(--shadow-panel)] transition duration-200",
                menuOpen ? "translate-y-0" : "translate-y-full"
              )}
              style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="font-display text-2xl font-extrabold tracking-[-0.05em] text-[var(--text-primary)]">
                    {brand.name}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge tone="accent">{runtime.betaMode ? t("app.betaLabel") : t("common.app")}</Badge>
                    <Badge>{isCloudSessionActive ? t("app.cloudReadyLabel") : t("app.localReadyLabel")}</Badge>
                    <Badge>
                      {syncQueueCount} {t("app.pendingSyncLabel").toLowerCase()}
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid gap-2.5">
                {quickLinks.map((item) => {
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] p-4 active:scale-[0.99]"
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[rgba(242,202,80,0.08)] text-[var(--accent-strong)]">
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-semibold text-[var(--text-primary)]">
                            {item.label}
                          </div>
                          <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                            {item.description}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {installPrompt ? (
                  <Button className="mt-2 justify-start" onClick={onInstallApp} size="sm">
                    <Download className="h-4 w-4" />
                    {t("app.installApp")}
                  </Button>
                ) : null}
              </div>
            </Surface>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 lg:hidden">
        <div className="mx-auto w-full max-w-[760px] px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 md:px-6">
          <nav className="app-mobile-dock relative grid grid-cols-5 items-center gap-2 rounded-[26px] border border-[var(--border)] bg-[rgba(20,20,20,0.94)] p-2 shadow-[0_-4px_20px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
            {dashboardNavigation.map((item) => {
              const href = localizeHref(locale, item.href);
              const isActive = pathname === href;
              const Icon = navIconFor(item.key);

              return (
                <Link
                  key={item.key}
                  href={href}
                  className={cn(
                    "flex min-h-12 flex-col items-center justify-center gap-1 rounded-[16px] px-2 py-2 text-center text-[10px] font-bold uppercase tracking-[0.1em]",
                    isActive
                      ? "bg-[rgba(53,53,52,0.85)] text-[var(--accent-strong)]"
                      : "text-[var(--text-secondary)] opacity-75 hover:text-[var(--accent-strong)] hover:opacity-100"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {t(`common.${item.key}`)}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
