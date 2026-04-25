"use client";

import { dashboardNavigation } from "@prompt-vault/config";
import type { Locale } from "@prompt-vault/types";
import { BookOpen, Filter, Home, PenSquare, Settings, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { BrandMark } from "@/components/shared/brand-mark";
import { cn } from "@/lib/cn";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

const NAV_ICONS: Record<string, typeof Home> = {
  dashboard: Home,
  library: BookOpen,
  capture: PenSquare,
  settings: Settings
};

const MOBILE_NAV_KEYS = new Set(["dashboard", "library", "capture", "settings"]);

function isNavigationActive(key: string, href: string, pathname: string, locale: Locale) {
  if (key === "dashboard") return pathname === href;
  if (key === "library") return pathname.startsWith(localizeHref(locale, "/app/library"));
  if (key === "capture") {
    return pathname.startsWith(localizeHref(locale, "/app/capture")) || pathname.startsWith(localizeHref(locale, "/app/editor"));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function screenTitle(pathname: string, locale: Locale) {
  if (pathname.startsWith(`/${locale}/app/library`)) return "Library";
  if (pathname.startsWith(`/${locale}/app/projects`)) return "Projects";
  if (pathname.startsWith(`/${locale}/app/settings`)) return "Settings";
  if (pathname.startsWith(`/${locale}/app/recent`)) return locale === "tr" ? "Son" : "Recent";
  if (pathname.startsWith(`/${locale}/app/favorites`)) return locale === "tr" ? "Favoriler" : "Favorites";
  return "Home";
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
  const { cloudSyncState, isCloudSessionActive } = useVault();

  const mobileNavigation = useMemo(
    () => dashboardNavigation.filter((item) => MOBILE_NAV_KEYS.has(item.key)),
    []
  );

  const isHomeRoute = pathname === localizeHref(locale, "/app");
  const isLibraryRoute = pathname.startsWith(`/${locale}/app/library`);
  const isCaptureRoute =
    pathname.startsWith(`/${locale}/app/capture`) || pathname.startsWith(`/${locale}/app/editor`);
  const syncLabel =
    cloudSyncState === "loading"
      ? locale === "tr"
        ? "Yukleniyor"
        : "Loading"
      : cloudSyncState === "saving"
        ? locale === "tr"
          ? "Kaydediliyor"
          : "Saving"
        : cloudSyncState === "error"
          ? locale === "tr"
            ? "Sorun var"
            : "Issue"
          : isCloudSessionActive
            ? locale === "tr"
              ? "Bulut hazir"
              : "Cloud ready"
            : locale === "tr"
              ? "Yerel"
              : "Local";

  return (
    <div className="omni-app-bg">
      <div className="omni-app-frame">
        <div className="omni-app-canvas">
          {!isCaptureRoute ? (
            <header className={cn("omni-mobile-header", isHomeRoute ? "items-start" : "items-center")}>
              {isHomeRoute ? (
                <>
                  <BrandMark compact />
                  <div className="flex items-center gap-2">
                    <span className="omni-status-pill">{syncLabel}</span>
                    <div className="omni-avatar" aria-label={locale === "tr" ? "Hesap" : "Account"}>
                      <UserRound className="h-4 w-4" />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <h1 className="omni-screen-title">{screenTitle(pathname, locale)}</h1>
                  {isLibraryRoute ? (
                    <button
                      aria-label={locale === "tr" ? "Filtreler" : "Filters"}
                      className="omni-icon-button"
                      type="button"
                    >
                      <Filter className="h-4 w-4" />
                    </button>
                  ) : (
                    <span className="omni-icon-button opacity-0" aria-hidden="true" />
                  )}
                </>
              )}
            </header>
          ) : null}

          <main className={cn("omni-app-main", isCaptureRoute ? "pt-4" : "")}>
            {children}
          </main>

          <nav className="omni-tabbar" aria-label={locale === "tr" ? "Ana gezinme" : "Main navigation"}>
            {mobileNavigation.map((item) => {
              const Icon = NAV_ICONS[item.key] || Home;
              const href = localizeHref(locale, item.href);
              const isActive = isNavigationActive(item.key, href, pathname, locale);

              return (
                <Link
                  key={item.key}
                  aria-current={isActive ? "page" : undefined}
                  className={cn("omni-tabbar-item vault-press", isActive ? "is-active" : "")}
                  href={href}
                >
                  <Icon className="h-[19px] w-[19px]" />
                  <span>{t(`common.${item.key}`)}</span>
                  <i aria-hidden="true" />
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
