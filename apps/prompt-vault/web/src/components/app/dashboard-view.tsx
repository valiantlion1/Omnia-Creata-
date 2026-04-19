"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, FolderOpen, PenSquare, Sparkles } from "lucide-react";
import type { CSSProperties } from "react";
import { Badge, Button } from "@/components/ui/primitives";
import { getEntries, getProjects } from "@/lib/dataset";
import { formatRelative } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

export function DashboardView() {
  const { dataset, dashboard } = useVault();
  const { locale } = useLocaleContext();
  const entries = getEntries(dataset);
  const projects = getProjects(dataset);
  const recentEntries = [...entries]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 5);
  const pinnedEntries = entries.filter((entry) => entry.isFavorite || entry.isPinned).slice(0, 3);
  const activeProjects = projects.slice(0, 4);

  return (
    <div className="flex flex-col gap-6 py-1">
      <section className="vault-card stagger-rise p-5 sm:p-6" style={{ "--stagger-delay": "0ms" } as CSSProperties}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-[520px] space-y-3">
            <div className="flex items-center gap-2">
              <Badge tone="info">{locale === "tr" ? "Baslangic" : "Start here"}</Badge>
              <Badge tone="accent">{entries.length} {locale === "tr" ? "entry" : "entries"}</Badge>
            </div>
            <div className="space-y-2">
              <h2 className="font-display text-[28px] font-extrabold tracking-[-0.06em] text-[var(--text-primary)] sm:text-[34px]">
                {locale === "tr"
                  ? "OmniaVault dusunceleri hizla yakalamak ve sonra duzenlemek icin burada."
                  : "OmniaVault is here to catch the thought fast and organize it later."}
              </h2>
              <p className="max-w-[480px] text-[14px] leading-7 text-[var(--text-secondary)]">
                {locale === "tr"
                  ? "Notion kadar agir degil, not uygulamasi kadar daginik da degil. Ilk adim: bir sey yaz ve devam et."
                  : "Lighter than a workspace suite, more structured than a notes app. First step: write something and keep moving."}
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-2 sm:w-auto">
            <Link href={localizeHref(locale, "/app/capture")}>
              <Button className="w-full rounded-[20px] sm:w-[210px]" size="lg">
                <PenSquare className="h-4 w-4" />
                {locale === "tr" ? "Yeni capture" : "New capture"}
              </Button>
            </Link>
            <Link href={localizeHref(locale, "/app/library")}>
              <Button className="w-full rounded-[20px] sm:w-[210px]" size="lg" variant="secondary">
                <BookOpen className="h-4 w-4" />
                {locale === "tr" ? "Library ac" : "Open library"}
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <QuickPathCard
            href={localizeHref(locale, "/app/capture")}
            icon={<Sparkles className="h-4 w-4" />}
            kicker={locale === "tr" ? "Aninda" : "Fastest path"}
            title={locale === "tr" ? "Bir fikir yaz" : "Write the idea down"}
            description={locale === "tr" ? "Detaylari sonra acarsin. Once dusunceyi tut." : "You can add details later. Catch the thought first."}
          />
          <QuickPathCard
            href={recentEntries[0] ? localizeHref(locale, `/app/library/${recentEntries[0].id}`) : localizeHref(locale, "/app/library")}
            icon={<BookOpen className="h-4 w-4" />}
            kicker={locale === "tr" ? "Devam et" : "Resume"}
            title={locale === "tr" ? "Son kayda geri don" : "Return to your last entry"}
            description={recentEntries[0]?.title ?? (locale === "tr" ? "Kayitli entry burada acilir." : "Your saved entry opens here.")}
          />
          <QuickPathCard
            href={localizeHref(locale, "/app/projects")}
            icon={<FolderOpen className="h-4 w-4" />}
            kicker={locale === "tr" ? "Baglam" : "Structure"}
            title={locale === "tr" ? "Projeleri duzenle" : "Keep related work in projects"}
            description={locale === "tr" ? "Baska ekranlara bogulmadan her seyi gruplandir." : "Group work without turning the product into admin software."}
          />
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-3">
        <MetricCard label={locale === "tr" ? "Toplam entry" : "Total entries"} value={String(dashboard.totalEntries).padStart(2, "0")} />
        <MetricCard label={locale === "tr" ? "Projeler" : "Projects"} value={String(projects.length).padStart(2, "0")} />
        <MetricCard label={locale === "tr" ? "Favoriler" : "Favorites"} value={String(entries.filter((entry) => entry.isFavorite).length).padStart(2, "0")} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-3">
          <SectionHeader
            title={locale === "tr" ? "Devam et" : "Continue where you left off"}
            href={localizeHref(locale, "/app/library")}
            hrefLabel={locale === "tr" ? "Tum library" : "Open library"}
          />
          <div className="space-y-2">
            {recentEntries.map((entry, index) => (
              <Link
                key={entry.id}
                className="vault-list-item vault-press stagger-rise"
                href={localizeHref(locale, `/app/library/${entry.id}`)}
                style={{ "--stagger-delay": `${120 + index * 40}ms` } as CSSProperties}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
                  {entry.title.trim().charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="truncate text-[15px] font-semibold text-[var(--text-primary)]">{entry.title}</div>
                    {entry.isFavorite ? <Badge tone="accent">{locale === "tr" ? "Favori" : "Favorite"}</Badge> : null}
                  </div>
                  <div className="mt-1 line-clamp-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                    {entry.summary || entry.body}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                    {formatRelative(entry.updatedAt, locale)}
                  </div>
                  <div className="mt-2 text-[11px] text-[var(--text-tertiary)]">{entry.type.replace(/_/g, " ")}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="vault-card p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="vault-kicker">{locale === "tr" ? "Projeler" : "Projects"}</div>
                <h3 className="mt-2 text-[20px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
                  {locale === "tr" ? "Aktif alanlar" : "Active spaces"}
                </h3>
              </div>
              <Link href={localizeHref(locale, "/app/projects")}>
                <Button size="sm" variant="ghost">
                  {locale === "tr" ? "Tumunu ac" : "See all"}
                </Button>
              </Link>
            </div>
            <div className="mt-4 space-y-2">
              {activeProjects.length > 0 ? activeProjects.map((project) => {
                const count = entries.filter((entry) => entry.projectId === project.id || entry.collectionId === project.id).length;
                return (
                  <Link key={project.id} className="vault-list-item vault-press" href={localizeHref(locale, "/app/projects")}>
                    <div className="min-w-0 flex-1">
                      <div className="text-[14px] font-semibold text-[var(--text-primary)]">{project.name}</div>
                      <div className="mt-1 line-clamp-2 text-[12px] leading-5 text-[var(--text-secondary)]">
                        {project.description || (locale === "tr" ? "Bu proje icindeki entryleri ac." : "Open the entries grouped inside this project.")}
                      </div>
                    </div>
                    <Badge tone="accent">{count}</Badge>
                  </Link>
                );
              }) : (
                <div className="rounded-[22px] border border-[var(--border)] bg-[rgba(255,255,255,0.02)] p-4 text-[13px] text-[var(--text-secondary)]">
                  {locale === "tr" ? "Ilk projeni olusturunca burada gorunur." : "Your first project will show up here."}
                </div>
              )}
            </div>
          </div>

          <div className="vault-card p-5">
            <div className="vault-kicker">{locale === "tr" ? "Sabitler" : "Pinned"}</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {pinnedEntries.length > 0 ? pinnedEntries.map((entry) => (
                <Link key={entry.id} href={localizeHref(locale, `/app/library/${entry.id}`)}>
                  <span className="vault-chip vault-press">{entry.title}</span>
                </Link>
              )) : (
                <div className="text-[13px] text-[var(--text-secondary)]">
                  {locale === "tr" ? "Favori veya pinledigin entryler burada gorunecek." : "Favorite or pinned entries will appear here."}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function QuickPathCard({
  href,
  icon,
  kicker,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  kicker: string;
  title: string;
  description: string;
}) {
  return (
    <Link className="vault-card-soft vault-press block p-4" href={href}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[var(--accent-soft)] text-[var(--accent-strong)]">
          {icon}
        </div>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-[var(--text-tertiary)]" />
      </div>
      <div className="mt-4">
        <div className="vault-kicker">{kicker}</div>
        <div className="mt-2 text-[16px] font-semibold tracking-[-0.03em] text-[var(--text-primary)]">{title}</div>
        <p className="mt-1 text-[13px] leading-6 text-[var(--text-secondary)]">{description}</p>
      </div>
    </Link>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="vault-metric">
      <div className="vault-kicker">{label}</div>
      <div className="mt-3 vault-metric-value">{value}</div>
    </div>
  );
}

function SectionHeader({
  title,
  href,
  hrefLabel,
}: {
  title: string;
  href: string;
  hrefLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="text-[20px] font-semibold tracking-[-0.04em] text-[var(--text-primary)]">{title}</h2>
      <Link className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--accent)]" href={href}>
        {hrefLabel}
      </Link>
    </div>
  );
}
