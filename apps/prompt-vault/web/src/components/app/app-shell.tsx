"use client";

import { dashboardNavigation } from "@prompt-vault/config";
import type { Locale } from "@prompt-vault/types";
import {
  Download,
  FolderOpen,
  Menu,
  Plus,
  Search,
  Settings2,
  Star,
  X
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BrandMark } from "@/components/shared/brand-mark";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { Badge, Button, Surface } from "@/components/ui/primitives";
import { iconFor } from "@/lib/icons";
import { localizeHref } from "@/lib/locale";
import { cn } from "@/lib/cn";
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
        : key === "collections"
          ? "folders"
          : key === "favorites"
            ? "star"
            : key === "recent"
              ? "clock-3"
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
  const { authMode } = useVault();
  const [quickOpenPathname, setQuickOpenPathname] = useState<string | null>(null);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const quickOpen = quickOpenPathname === pathname;

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  const mobileQuickLinks = [
    {
      href: localizeHref(locale, "/app/editor/new"),
      label: t("app.quickCreatePrompt"),
      icon: Plus
    },
    {
      href: localizeHref(locale, "/app/library"),
      label: t("app.quickOpenLibrary"),
      icon: Search
    },
    {
      href: localizeHref(locale, "/app/collections"),
      label: t("app.quickOpenCollections"),
      icon: FolderOpen
    },
    {
      href: localizeHref(locale, "/app/favorites"),
      label: t("app.quickOpenFavorites"),
      icon: Star
    },
    {
      href: localizeHref(locale, "/app/settings"),
      label: t("app.quickOpenSettings"),
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
    <div className="mx-auto flex min-h-screen max-w-[1640px] gap-4 px-3 py-3 md:gap-5 md:px-5 md:py-4">
      <aside className="hidden w-[286px] shrink-0 lg:block">
        <Surface className="sticky top-4 space-y-8 p-5">
          <BrandMark />
          <div className="space-y-2.5">
            {dashboardNavigation.map((item) => {
              const Icon = navIconFor(item.key);
              const href = localizeHref(locale, item.href);
              const isActive = pathname === href;

              return (
                <Link
                  key={item.key}
                  className={cn(
                    "group flex items-center gap-3 rounded-[16px] border px-3.5 py-3 text-sm font-medium transition",
                    isActive
                      ? "border border-[color:rgba(212,175,55,0.3)] bg-gradient-to-br from-[rgba(212,175,55,0.15)] to-[rgba(212,175,55,0.05)] text-[var(--accent-strong)] shadow-[var(--shadow-glow)]"
                      : "border-transparent text-[var(--text-secondary)] hover:-translate-x-0.5 hover:border-[var(--border)] hover:bg-white/5 hover:text-[var(--text-primary)]"
                  )}
                  href={href}
                >
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      isActive ? "text-[var(--accent-strong)]" : "text-[var(--text-tertiary)]"
                    )}
                  />
                  {t(`common.${item.key}`)}
                  <span
                    className={cn(
                      "ml-auto h-1.5 w-1.5 rounded-full transition",
                      isActive
                        ? "bg-[var(--accent-strong)]"
                        : "bg-transparent group-hover:bg-[var(--border-strong)]"
                    )}
                  />
                </Link>
              );
            })}
          </div>
          <div className="space-y-4 rounded-[20px] border border-[var(--border)] bg-gradient-to-b from-[rgba(212,175,55,0.1)] to-[var(--surface)] p-4 shadow-[var(--shadow-panel)] ring-1 ring-inset ring-white/5">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[var(--text-tertiary)]">
                  {t("app.syncLabel")}
                </div>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {t("app.vaultStatus")}
                </span>
              </div>
              <Badge tone={authMode.enabled ? "accent" : "warning"}>
                {authMode.enabled ? t("app.syncStatusSupabase") : t("app.syncStatusPreview")}
              </Badge>
            </div>
            <p className="text-sm leading-6 text-[var(--text-secondary)]">
              {authMode.enabled
                ? t("app.syncDescriptionSupabase")
                : t("app.syncDescriptionPreview")}
            </p>
            <div className="grid grid-cols-2 gap-2">
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
          </div>
        </Surface>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div
          className="flex items-center justify-between rounded-[22px] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 shadow-[var(--shadow-soft)] backdrop-blur-xl lg:hidden"
          style={{ paddingTop: "max(0.625rem, env(safe-area-inset-top))" }}
        >
          <BrandMark compact />
          <div className="flex items-center gap-2">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
        <div className="flex-1">{children}</div>
        <button
          aria-expanded={quickOpen}
          aria-label={t("app.quickActions")}
          className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] right-3 z-50 flex h-11 w-11 items-center justify-center rounded-full border border-[color:rgba(212,175,55,0.3)] bg-gradient-to-br from-[rgba(212,175,55,0.2)] to-[rgba(212,175,55,0.1)] text-[var(--accent-strong)] shadow-[var(--shadow-glow)] active:scale-95 sm:right-4 lg:hidden"
          onClick={() =>
            setQuickOpenPathname((current) => (current === pathname ? null : pathname))
          }
          type="button"
        >
          {quickOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>
        <div
          className={cn(
            "fixed inset-0 z-40 flex items-end lg:hidden",
            quickOpen ? "pointer-events-auto" : "pointer-events-none"
          )}
        >
          <button
            aria-label={t("common.cancel")}
            className={cn(
            "absolute inset-0 bg-black/45 transition",
              quickOpen ? "opacity-100" : "opacity-0"
            )}
            onClick={() => setQuickOpenPathname(null)}
            type="button"
          />
          <Surface
            className={cn(
              "relative w-full rounded-b-none p-4 shadow-[var(--shadow-soft)] transition duration-200",
              quickOpen ? "translate-y-0" : "translate-y-full"
            )}
            style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {t("app.quickActions")}
              </div>
              <Badge>{t("common.productName")}</Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {mobileQuickLinks.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    className="flex min-h-11 items-center gap-2 rounded-2xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2.5 text-sm font-medium text-[var(--text-primary)] hover:border-[var(--border-strong)] hover:bg-[var(--surface-muted)] active:scale-[0.99]"
                    href={item.href}
                    onClick={() => setQuickOpenPathname(null)}
                  >
                    <Icon className="h-4 w-4 text-[var(--accent)]" />
                    {item.label}
                  </Link>
                );
              })}
              {installPrompt ? (
                <Button className="justify-start sm:col-span-2" onClick={onInstallApp} size="sm">
                  <Download className="h-4 w-4" />
                  {t("app.installApp")}
                </Button>
              ) : null}
            </div>
          </Surface>
        </div>
        <nav
          className="sticky bottom-4 z-40 grid grid-cols-3 gap-2 rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-2 shadow-[var(--shadow-soft)] backdrop-blur-xl sm:grid-cols-6 lg:hidden"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          {dashboardNavigation.map((item) => {
            const href = localizeHref(locale, item.href);
            const isActive = pathname === href;
            const Icon = navIconFor(item.key);
            return (
              <Link
                key={item.key}
                href={href}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center gap-1 rounded-[14px] border px-2 py-2 text-center text-[10px] font-semibold tracking-[0.01em]",
                  isActive
                    ? "border border-[color:rgba(212,175,55,0.3)] bg-gradient-to-br from-[rgba(212,175,55,0.15)] to-[rgba(212,175,55,0.05)] text-[var(--accent-strong)]"
                    : "border-transparent text-[var(--text-secondary)]"
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
  );
}
