"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BellRing,
  Boxes,
  CreditCard,
  LayoutDashboard,
  MonitorCog,
  Settings2
} from "lucide-react";
import type { Dictionary } from "@omnia-watch/i18n";
import type { Locale } from "@omnia-watch/types";
import { Badge } from "@omnia-watch/ui";
import { cn } from "@omnia-watch/utils";
import type { AppShellState } from "@/lib/server/app-data";
import { localizePath } from "@/lib/site";

const appLinks = [
  ["overview", "/app", LayoutDashboard],
  ["devices", "/app/devices", MonitorCog],
  ["applications", "/app/applications", Boxes],
  ["recommendations", "/app/recommendations", BellRing],
  ["history", "/app/history", Activity],
  ["settings", "/app/settings", Settings2],
  ["account", "/app/account", CreditCard]
] as const;

export function AppSidebar({
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
  const currentPath = usePathname();

  return (
    <aside className="border-b border-line/40 bg-[linear-gradient(180deg,rgba(11,16,29,0.98),rgba(8,12,24,0.9))] lg:border-b-0 lg:border-r">
      <div className="border-b border-line/40 px-4 py-5 lg:px-5">
        <p className="text-xs uppercase tracking-[0.22em] text-muted">
          {dictionary.common.brandName}
        </p>
        <p className="mt-3 font-display text-2xl font-semibold text-text">
          {dictionary.common.productName}
        </p>
        <p className="mt-2 text-sm leading-6 text-muted">{dictionary.app.meta.shellTitle}</p>
        <div className="mt-4 flex flex-wrap gap-2">
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

      <div className="px-3 py-3 lg:px-4 lg:py-4">
        <nav className="flex gap-2 overflow-x-auto pb-2 lg:block lg:space-y-1 lg:pb-0">
          {appLinks.map(([key, path, Icon]) => {
            const href = localizePath(locale, path);
            const active = currentPath === href;

            return (
              <Link
                key={path}
                href={href}
                className={cn(
                  "group flex min-w-max items-center gap-3 rounded-2xl border px-3 py-3 text-sm font-medium transition lg:w-full",
                  active
                    ? "border-accent/40 bg-accent/12 text-text shadow-[inset_0_0_0_1px_rgba(73,214,185,0.14)]"
                    : "border-transparent bg-transparent text-muted hover:border-line/40 hover:bg-surface/45 hover:text-text"
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl border transition",
                    active
                      ? "border-accent/30 bg-accent/12 text-accent"
                      : "border-line/40 bg-canvas/60 text-muted group-hover:text-text"
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="hidden min-w-0 flex-1 items-center justify-between lg:flex">
                  <span>{dictionary.nav.app[key]}</span>
                </div>
                <span className="pr-1 lg:hidden">{dictionary.nav.app[key]}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="hidden px-4 pb-4 pt-2 lg:block">
        <div className="rounded-[26px] border border-line/40 bg-canvas/55 p-4">
          <p className="text-xs uppercase tracking-[0.22em] text-muted">
            {dictionary.app.desktop.workspace}
          </p>
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-2xl border border-line/40 bg-surface/55 px-3 py-3 text-sm">
              <span className="text-muted">{dictionary.app.desktop.watchApi}</span>
              <Badge tone={shell.mode === "connected" ? "positive" : "warning"}>
                {shell.mode === "connected"
                  ? dictionary.app.status.healthy
                  : dictionary.app.status.attention}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-line/40 bg-surface/55 px-3 py-3 text-sm">
              <span className="text-muted">{dictionary.app.desktop.syncBridge}</span>
              <Badge tone={devicePipelineMode === "connected" ? "positive" : "warning"}>
                {devicePipelineMode === "connected"
                  ? dictionary.app.status.healthy
                  : dictionary.app.status.attention}
              </Badge>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-line/40 bg-surface/55 px-3 py-3 text-sm">
              <span className="text-muted">{dictionary.app.desktop.queue}</span>
              <Badge tone="neutral">{dictionary.app.status.manual}</Badge>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
