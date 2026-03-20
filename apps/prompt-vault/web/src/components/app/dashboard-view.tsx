"use client";

import Link from "next/link";
import { ChevronRight, PenSquare, Sparkles } from "lucide-react";
import { Button, Badge } from "@/components/ui/primitives";
import { getEntries, getProjects } from "@/lib/dataset";
import { formatRelative } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

export function DashboardView() {
  const { dataset } = useVault();
  const { locale, t } = useLocaleContext();
  const entries = getEntries(dataset);
  const projects = getProjects(dataset);
  const recentEntries = [...entries]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 4);
  const featuredProjects = projects.slice(0, 4);

  const hour = new Date().getHours();
  const greeting =
    locale === "tr"
      ? hour < 12
        ? "Günaydın"
        : hour < 18
          ? "Devam edelim"
          : "İyi akşamlar"
      : hour < 12
        ? "Good morning"
        : hour < 18
          ? "Welcome back"
          : "Good evening";

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col gap-8 py-2">
      {/* Greeting */}
      <div className="stagger-rise space-y-1" style={{ "--stagger-delay": "0ms" } as React.CSSProperties}>
        <h1 className="font-display text-[26px] font-bold tracking-[-0.04em] text-[var(--text-primary)]">
          {greeting}
        </h1>
        <p className="text-sm text-[var(--text-secondary)]">
          {locale === "tr"
            ? "Bugün ne yakalamak istersin?"
            : "What would you like to capture today?"}
        </p>
      </div>

      {/* Primary Capture CTA */}
      <div className="stagger-rise" style={{ "--stagger-delay": "60ms" } as React.CSSProperties}>
        <Link href={localizeHref(locale, "/app/capture")}>
          <button className="vault-press group flex w-full items-center gap-4 rounded-[var(--radius-lg)] border border-[rgba(200,162,72,0.2)] bg-[rgba(200,162,72,0.06)] p-4 text-left transition-colors hover:bg-[rgba(200,162,72,0.1)]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-b from-[var(--accent-strong)] to-[var(--accent)] shadow-[var(--shadow-glow)]">
              <PenSquare className="h-5 w-5 text-[var(--accent-foreground)]" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-[var(--text-primary)]">
                {locale === "tr" ? "Hızlı yakala" : "Quick capture"}
              </div>
              <div className="mt-0.5 text-xs text-[var(--text-secondary)]">
                {locale === "tr"
                  ? "Fikir, not, prompt — ne olursa hemen kaydet"
                  : "Idea, note, prompt — save it before it fades"}
              </div>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-tertiary)] transition-transform group-hover:translate-x-0.5" />
          </button>
        </Link>
      </div>

      {/* Recent entries */}
      {recentEntries.length > 0 ? (
        <section className="stagger-rise space-y-3" style={{ "--stagger-delay": "120ms" } as React.CSSProperties}>
          <SectionHeader
            title={locale === "tr" ? "Devam et" : "Continue"}
            actionLabel={locale === "tr" ? "Tümü" : "All"}
            actionHref={localizeHref(locale, "/app/library")}
          />
          <div className="space-y-1.5">
            {recentEntries.map((entry) => (
              <Link
                key={entry.id}
                href={localizeHref(locale, `/app/library/${entry.id}`)}
                className="vault-row vault-press group"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[14px] font-medium text-[var(--text-primary)]">
                    {entry.title}
                  </div>
                  <div className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
                    {entry.summary || entry.body}
                  </div>
                </div>
                <div className="shrink-0 text-[10px] font-medium text-[var(--text-tertiary)]">
                  {formatRelative(entry.updatedAt, locale)}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Projects */}
      <section className="stagger-rise space-y-3" style={{ "--stagger-delay": "180ms" } as React.CSSProperties}>
        <SectionHeader
          title={locale === "tr" ? "Projeler" : "Projects"}
          actionLabel={locale === "tr" ? "Tümü" : "All"}
          actionHref={localizeHref(locale, "/app/projects")}
        />
        {featuredProjects.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {featuredProjects.map((project) => {
              const count = entries.filter(
                (e) => e.projectId === project.id || e.collectionId === project.id
              ).length;
              return (
                <Link
                  key={project.id}
                  href={localizeHref(locale, "/app/projects")}
                  className="vault-press inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-sm transition-colors hover:bg-[var(--surface-muted)]"
                >
                  <span className="font-medium text-[var(--text-primary)]">{project.name}</span>
                  <Badge tone="accent">{count}</Badge>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-secondary)]">
            {locale === "tr"
              ? "İlk projenizi oluşturunca burada görünür."
              : "Your projects will appear here once you create one."}
          </div>
        )}
      </section>

      {/* Quick AI hint */}
      <div className="stagger-rise" style={{ "--stagger-delay": "240ms" } as React.CSSProperties}>
        <div className="flex items-center gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <Sparkles className="h-4 w-4 shrink-0 text-[var(--accent-secondary-strong)]" />
          <p className="text-xs text-[var(--text-secondary)]">
            {locale === "tr"
              ? "AI destekli düzenleme V1 ile gelecek."
              : "AI-assisted editing arrives with V1."}
          </p>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  actionHref,
  actionLabel,
}: {
  title: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h2>
      <Link
        className="text-[11px] font-medium uppercase tracking-[0.1em] text-[var(--accent)] transition-colors hover:text-[var(--accent-strong)]"
        href={actionHref}
      >
        {actionLabel}
      </Link>
    </div>
  );
}
