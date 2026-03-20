"use client";

import { dashboardNavigation } from "@prompt-vault/config";
import type { Locale } from "@prompt-vault/types";
import { Download, Home, BookOpen, PenSquare, FolderOpen, Settings, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
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

export function AppShell({
  children,
  locale,
}: {
  children: ReactNode;
  locale: Locale;
}) {
  const pathname = usePathname();
  const { t } = useLocaleContext();
  const { isCloudSessionActive, runtime } = useVault();
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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--background)]">
      {/* ─── Desktop Layout ─── */}
      <div className="hidden lg:flex lg:h-screen">
        {/* Sidebar */}
        <aside className="flex w-[220px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--background)]">
          {/* Brand */}
          <div className="flex items-center gap-3 px-5 py-5">
            <BrandMark compact />
            {runtime.betaMode ? (
              <Badge tone="accent">Beta</Badge>
            ) : null}
          </div>

          {/* Nav links */}
          <nav className="flex-1 space-y-0.5 px-3 py-2">
            {dashboardNavigation.map((item) => {
              const Icon = NAV_ICONS[item.key] || Home;
              const href = localizeHref(locale, item.href);
              const isActive = pathname === href;

              return (
                <Link
                  key={item.key}
                  className={cn(
                    "vault-press flex items-center gap-3 rounded-[10px] px-3 py-2.5 text-[13px] font-medium transition-colors",
                    isActive
                      ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                      : "text-[var(--text-secondary)] hover:bg-[var(--surface)] hover:text-[var(--text-primary)]"
                  )}
                  href={href}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  {t(`common.${item.key}`)}
                </Link>
              );
            })}
          </nav>

          {/* Bottom section */}
          <div className="space-y-3 border-t border-[var(--border)] px-3 py-4">
            <Link href={localizeHref(locale, "/app/capture")}>
              <Button className="w-full" size="default">
                <PenSquare className="h-4 w-4" />
                {t("app.quickCapture")}
              </Button>
            </Link>

            <div className="flex items-center gap-2 px-1">
              <Badge tone={isCloudSessionActive ? "success" : "default"}>
                {isCloudSessionActive ? t("app.cloudReadyLabel") : t("app.localReadyLabel")}
              </Badge>
            </div>

            {installPrompt ? (
              <Button className="w-full" onClick={onInstallApp} size="sm" variant="secondary">
                <Download className="h-4 w-4" />
                {t("app.installApp")}
              </Button>
            ) : null}

            <div className="flex items-center gap-1.5 px-1">
              <ThemeSwitcher />
              <LanguageSwitcher />
            </div>
          </div>
        </aside>

        {/* Main content area */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[800px] px-6 py-6">
            {children}
          </div>
        </main>
      </div>

      {/* ─── Mobile Layout ─── */}
      <div className="flex flex-1 flex-col lg:hidden">
        {/* Mobile top bar */}
        <header className="flex items-center justify-between px-4 py-3" style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}>
          <BrandMark compact />
          <div className="flex items-center gap-2">
            <Link
              className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-[var(--surface)] text-[var(--text-secondary)]"
              href={localizeHref(locale, "/app/library")}
            >
              <Search className="h-4 w-4" />
            </Link>
            <ThemeSwitcher />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
          <div className="page-enter">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <nav
          className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--border)] bg-[rgba(0,0,0,0.92)] backdrop-blur-xl"
          style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex max-w-[500px] items-end justify-around px-2 pt-1.5">
            {dashboardNavigation.map((item) => {
              const Icon = NAV_ICONS[item.key] || Home;
              const href = localizeHref(locale, item.href);
              const isActive = pathname === href;
              const isCapture = item.key === "capture";

              if (isCapture) {
                return (
                  <Link
                    key={item.key}
                    href={href}
                    className="vault-press -mt-4 flex flex-col items-center"
                  >
                    <div className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full shadow-lg transition-transform",
                      isActive
                        ? "bg-gradient-to-b from-[var(--accent-strong)] to-[var(--accent)] shadow-[var(--shadow-glow)]"
                        : "bg-gradient-to-b from-[var(--accent-strong)] to-[var(--accent)] opacity-90"
                    )}>
                      <PenSquare className="h-5 w-5 text-[var(--accent-foreground)]" />
                    </div>
                    <span className={cn(
                      "mt-1 text-[9px] font-semibold uppercase tracking-[0.08em]",
                      isActive ? "text-[var(--accent-strong)]" : "text-[var(--text-tertiary)]"
                    )}>
                      {t(`common.${item.key}`)}
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.key}
                  href={href}
                  className="vault-press flex min-w-[52px] flex-col items-center gap-0.5 py-1.5"
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-[var(--accent-strong)]" : "text-[var(--text-tertiary)]"
                  )} />
                  <span className={cn(
                    "text-[9px] font-semibold uppercase tracking-[0.08em]",
                    isActive ? "text-[var(--accent-strong)]" : "text-[var(--text-tertiary)]"
                  )}>
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
