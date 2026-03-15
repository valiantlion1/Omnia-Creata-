import { Bell, Command, Search, ShieldCheck, Sparkles } from "lucide-react";
import type { Dictionary } from "@omnia-watch/i18n";
import type { Locale } from "@omnia-watch/types";
import { Badge, Button, Input } from "@omnia-watch/ui";
import { signOutAction } from "@/app/auth/actions";
import { LinkButton } from "@/components/link-button";
import { LanguageSwitcher } from "@/components/language-switcher";
import type { AppShellState } from "@/lib/server/app-data";
import { localizePath } from "@/lib/site";

export function AppShellHeader({
  devicePipelineMode,
  dictionary,
  locale,
  shell
}: {
  devicePipelineMode: "connected" | "demo";
  dictionary: Dictionary;
  locale: Locale;
  shell: AppShellState;
}) {
  const initials = shell.user.fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="border-b border-line/40 bg-[linear-gradient(180deg,rgba(17,25,40,0.96),rgba(10,15,27,0.9))] px-3 py-3 lg:px-5 lg:py-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] uppercase tracking-[0.24em] text-muted">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-danger/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/80" />
          </div>
          <span>{dictionary.common.productName}</span>
          <span className="hidden text-muted/60 lg:inline">/</span>
          <span className="hidden lg:inline">{dictionary.app.desktop.commandCenter}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={shell.mode === "connected" ? "positive" : "warning"}>
            {shell.mode === "connected"
              ? dictionary.app.meta.liveMode
              : dictionary.app.meta.demoMode}
          </Badge>
          <Badge tone={devicePipelineMode === "connected" ? "positive" : "warning"}>
            {dictionary.app.desktop.syncBridge}
          </Badge>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs uppercase tracking-[0.22em] text-accent">
            {dictionary.app.desktop.workspace}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-text lg:text-4xl">
              {dictionary.app.desktop.commandCenter}
            </h1>
            <Badge tone="neutral">{shell.plan.name}</Badge>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            {dictionary.app.desktop.overviewSubtitle}
          </p>
        </div>

        <div className="grid gap-3 xl:min-w-[580px] xl:grid-cols-[minmax(0,1fr)_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              aria-label={dictionary.app.desktop.searchAria}
              className="h-12 rounded-2xl border-line/50 bg-surface/70 pl-11"
              placeholder={dictionary.app.desktop.searchPlaceholder}
            />
            <div className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-1 rounded-full border border-line/60 bg-canvas/60 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted sm:flex">
              <Command className="h-3 w-3" />
              <span>K</span>
            </div>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <LinkButton href={localizePath(locale, "/app/devices")} size="sm" variant="primary">
              <Sparkles className="h-4 w-4" />
              {dictionary.app.desktop.pairCompanion}
            </LinkButton>
            <LinkButton
              href={localizePath(locale, "/app/recommendations")}
              size="sm"
              variant="outline"
            >
              <Bell className="h-4 w-4" />
              {dictionary.app.desktop.reviewAlerts}
            </LinkButton>
            <LanguageSwitcher
              currentLocale={locale}
              label={locale === "en" ? dictionary.languages.tr : dictionary.languages.en}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[24px] border border-line/40 bg-canvas/55 px-3 py-3">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/12 text-sm font-semibold text-accent">
            {initials || "OW"}
          </div>
          <div className="min-w-0">
            <p className="truncate font-medium text-text">{shell.user.fullName}</p>
            <p className="truncate text-sm text-muted">
              {shell.user.email || dictionary.app.meta.shellTitle}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted">
          <ShieldCheck className="h-4 w-4 text-success" />
          <span>{dictionary.app.desktop.watchApi}</span>
        </div>
        {shell.mode === "connected" ? (
          <form action={signOutAction.bind(null, locale)}>
            <Button size="sm" type="submit" variant="ghost">
              Sign out
            </Button>
          </form>
        ) : null}
      </div>
    </header>
  );
}
