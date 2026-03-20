"use client";

import { dashboardNavigation } from "@prompt-vault/config";
import type { Locale } from "@prompt-vault/types";
import {
  BookOpen,
  ChevronRight,
  Download,
  FolderOpen,
  Home,
  PenSquare,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BrandMark } from "@/components/shared/brand-mark";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeSwitcher } from "@/components/shared/theme-switcher";
import { Badge, Button } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const NAV_ICONS: Record<string, typeof Home> = {
  dashboard: Home,
  library: BookOpen,
  capture: PenSquare,
  projects: FolderOpen,
  settings: Settings,
};

function screenMeta(pathname: string, locale: Locale) {
  if (pathname.includes("/app/library/")) {
    return locale === "tr"
      ? { title: "Entry", subtitle: "Oku, geri don, surum gecmisine guven." }
      : { title: "Entry", subtitle: "Read, refine, and trust the version trail." };
  }
  if (pathname.includes("/app/editor/")) {
    return locale === "tr"
      ? { title: "Editor", subtitle: "Icerigi merkeze koy, detaylari sonra ac." }
      : { title: "Editor", subtitle: "Keep the writing surface calm and details secondary." };
  }
  if (pathname.startsWith(`/${locale}/app/library`)) {
    return locale === "tr"
      ? { title: "Library", subtitle: "Kayitli her seyi ara, tara, filtrele." }
      : { title: "Library", subtitle: "Search, scan, and return to saved work fast." };
  }
  if (pathname.startsWith(`/${locale}/app/capture`)) {
    return locale === "tr"
      ? { title: "Capture", subtitle: "Dusunce geldigi anda yakala." }
      : { title: "Capture", subtitle: "Catch the idea the moment it appears." };
  }
  if (pathname.startsWith(`/${locale}/app/projects`)) {
    return locale === "tr"
      ? { title: "Projects", subtitle: "Girileri daha buyuk bir baglamda topla." }
      : { title: "Projects", subtitle: "Group related thinking without turning into a heavy workspace." };
  }
  if (pathname.startsWith(`/${locale}/app/settings`)) {
    return locale === "tr"
      ? { title: "Settings", subtitle: "Uygulamayi sade, guvenli ve sana uygun tut." }
      : { title: "Settings", subtitle: "Keep the app calm, secure, and tailored to your flow." };
  }
  return locale === "tr"
    ? { title: "Home", subtitle: "Neyi once yapman gerektigini hemen goster." }
    : { title: "Home", subtitle: "A real app home should tell you what to do next instantly." };
}

export function AppShell({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const pathname = usePathname();
  const { t } = useLocaleContext();
  const { isCloudSessionActive, runtime, cloudSyncState, syncQueueCount } = useVault();
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    function onBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  }, []);

  async function onInstallApp() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  const routeMeta = useMemo(() => screenMeta(pathname, locale), [locale, pathname]);

  const syncLabel =
    cloudSyncState === "loading"
      ? locale === "tr"
        ? "Yukleniyor"
        : "Loading"
      : cloudSyncState === "saving"
        ? locale === "tr"
          ? "Sync ediliyor"
          : "Syncing"
        : cloudSyncState === "error"
          ? locale === "tr"
            ? "Sorun var"
            : "Issue"
          : isCloudSessionActive
            ? locale === "tr"
              ? "Cloud hazir"
              : "Cloud ready"
            : locale === "tr"
              ? "Yerel mod"
              : "Local mode";

  return (
    <div className="min-h-[100dvh] bg-[var(--background)] px-0 py-0 lg:px-4 lg:py-4">
      <div className="vault-app-shell hidden min-h-[calc(100dvh-2rem)] lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="vault-sidebar px-4 py-4">
          <div className="vault-sidebar-section px-4 py-4">
            <BrandMark />
          </div>

          <div className="vault-sidebar-section p-2">
            <nav className="space-y-1.5">
              {dashboardNavigation.map((item) => {
                const Icon = NAV_ICONS[item.key] || Home;
                const href = localizeHref(locale, item.href);
                const isActive = pathname === href;

                return (
                  <Link
                    key={item.key}
                    className={cn(
                      "vault-press flex items-center gap-3 rounded-[18px] px-3.5 py-3 text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                        : "text-[var(--text-secondary)] hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--text-primary)]"
                    )}
                    href={href}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                    {t(`common.${item.key}`)}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="vault-sidebar-section p-3">
            <Link href={localizeHref(locale, "/app/capture")}>
              <Button className="w-full justify-between rounded-[18px]" size="lg">
                <span className="inline-flex items-center gap-2">
                  <PenSquare className="h-4 w-4" />
                  {locale === "tr" ? "Yeni capture" : "New capture"}
                </span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="mt-auto space-y-3">
            <div className="vault-sidebar-section p-4">
              <div className="vault-sidebar-label">
                {locale === "tr" ? "Durum" : "Status"}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone={isCloudSessionActive ? "success" : "default"}>{syncLabel}</Badge>
                <Badge tone="accent">
                  {syncQueueCount} {locale === "tr" ? "bekleyen" : "pending"}
                </Badge>
                <Badge tone="info">{runtime.enableAI ? "AI on" : "AI in V1"}</Badge>
              </div>
              {installPrompt ? (
                <Button className="mt-4 w-full" onClick={onInstallApp} size="sm" variant="secondary">
                  <Download className="h-4 w-4" />
                  {t("app.installApp")}
                </Button>
              ) : null}
            </div>

            <div className="vault-sidebar-section flex items-center justify-between px-3 py-3">
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
          </div>
        </aside>

        <section className="vault-main-shell min-h-0">
          <header className="vault-topbar">
            <div className="vault-route-header">
              <div className="flex items-center gap-2">
                <Badge tone="info">{routeMeta.title}</Badge>
                {runtime.betaMode ? <Badge tone="accent">Beta</Badge> : null}
              </div>
              <h1 className="vault-route-title">{routeMeta.title}</h1>
              <p className="vault-route-subtitle">{routeMeta.subtitle}</p>
            </div>
            <div className="flex items-center gap-2">
              <Link href={localizeHref(locale, "/app/library")}>
                <Button size="sm" variant="secondary">
                  <Search className="h-4 w-4" />
                  {locale === "tr" ? "Ara" : "Search"}
                </Button>
              </Link>
              <Link href={localizeHref(locale, "/app/capture")}>
                <Button size="sm">
                  <Sparkles className="h-4 w-4" />
                  {locale === "tr" ? "Yakala" : "Capture"}
                </Button>
              </Link>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto">
            <div className="vault-screen page-enter">{children}</div>
          </main>
        </section>
      </div>

      <div className="flex min-h-[100dvh] flex-col lg:hidden">
        <header
          className="border-b border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.82)] px-4 pb-3 pt-3 backdrop-blur-2xl"
          style={{ paddingTop: "max(0.9rem, env(safe-area-inset-top))" }}
        >
          <div className="flex items-center justify-between gap-3">
            <BrandMark compact />
            <div className="flex items-center gap-2">
              <Badge tone={isCloudSessionActive ? "success" : "default"}>{syncLabel}</Badge>
              <ThemeSwitcher />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
              {routeMeta.title}
            </div>
            <div className="mt-1 text-[15px] font-semibold text-[var(--text-primary)]">
              {routeMeta.subtitle}
            </div>
          </div>
        </header>

        <main className="flex-1 px-0 pb-[calc(5.6rem+env(safe-area-inset-bottom))]">
          <div className="vault-screen page-enter">{children}</div>
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.94)] backdrop-blur-2xl"
          style={{ paddingBottom: "max(0.45rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-[520px] items-end justify-around gap-1 px-2 pt-2">
            {dashboardNavigation.map((item) => {
              const Icon = NAV_ICONS[item.key] || Home;
              const href = localizeHref(locale, item.href);
              const isActive = pathname === href;
              const isCapture = item.key === "capture";

              if (isCapture) {
                return (
                  <Link key={item.key} className="vault-press -mt-4 flex flex-col items-center" href={href}>
                    <div
                      className={cn(
                        "flex h-13 w-13 items-center justify-center rounded-full border border-[rgba(200,162,72,0.2)] bg-gradient-to-b from-[var(--accent-strong)] to-[var(--accent)] shadow-[var(--shadow-glow)]",
                        isActive ? "scale-105" : ""
                      )}
                    >
                      <PenSquare className="h-5 w-5 text-[var(--accent-foreground)]" />
                    </div>
                    <span className="mt-1 text-[9px] font-semibold uppercase tracking-[0.08em] text-[var(--accent-strong)]">
                      {t(`common.${item.key}`)}
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.key}
                  className="vault-press flex min-w-[58px] flex-col items-center gap-1 py-1.5"
                  href={href}
                >
                  <div
                    className={cn(
                      "rounded-full px-3 py-1.5",
                      isActive ? "bg-[rgba(255,255,255,0.05)]" : ""
                    )}
                  >
                    <Icon
                      className={cn(
                        "h-4.5 w-4.5",
                        isActive ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
                      )}
                    />
                  </div>
                  <span
                    className={cn(
                      "text-[9px] font-semibold uppercase tracking-[0.08em]",
                      isActive ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
                    )}
                  >
                    {t(`common.${item.key}`)}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
