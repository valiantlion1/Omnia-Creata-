"use client";

import Link from "next/link";
import { Clock3, FolderPlus, Library, Search, Sparkles, Star } from "lucide-react";
import type { ReactNode } from "react";
import { Badge, Button, Surface } from "@/components/ui/primitives";
import { TiltCard } from "@/components/ui/tilt-card";
import { getEntries, getProjects } from "@/lib/dataset";
import { formatRelative } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

export function DashboardView() {
  const { dataset, runtime, syncQueueCount } = useVault();
  const { locale, t } = useLocaleContext();
  const entries = getEntries(dataset);
  const projects = getProjects(dataset);
  const recentEntries = [...entries]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 5);
  const favoriteEntries = entries.filter((entry) => entry.isFavorite).slice(0, 4);
  const featuredProjects = projects.slice(0, 3);
  const recentDrafts = [...dataset.drafts]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 2);

  const hour = new Date().getHours();
  const greeting =
    locale === "tr"
      ? hour < 12
        ? "Tekrar hos geldin"
        : hour < 18
          ? "Bugun neye donuyorsun?"
          : "Aksam oturumu hazir"
      : hour < 12
        ? "Welcome back"
        : hour < 18
          ? "What are you returning to?"
          : "Ready for another session?";

  return (
    <div className="mx-auto flex w-full max-w-[1080px] flex-col gap-5 lg:gap-6">
      <header
        className="stagger-rise flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        style={{ ["--stagger-delay" as string]: "40ms" }}
      >
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Badge tone="info">{locale === "tr" ? "Ana ekran" : "Home"}</Badge>
            <Badge tone="accent">{runtime.betaMode ? t("app.betaLabel") : t("common.app")}</Badge>
          </div>
          <div className="space-y-1">
            <h1 className="font-display text-[2rem] font-extrabold tracking-[-0.05em] text-[var(--text-primary)]">
              {greeting}
            </h1>
            <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)] md:text-[15px]">
              {locale === "tr"
                ? "Yeni bir sey baslat, kaldigin yerden devam et veya projelerine geri don."
                : "Start something new, pick up where you left off, or jump back into your projects."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={localizeHref(locale, "/app/capture")}>
            <Button>
              <Sparkles className="h-4 w-4" />
              {t("app.quickCapture")}
            </Button>
          </Link>
          <Link href={localizeHref(locale, "/app/library")}>
            <Button variant="secondary">
              <Search className="h-4 w-4" />
              {locale === "tr" ? "Ara" : "Search"}
            </Button>
          </Link>
        </div>
      </header>

      <Surface
        className="stagger-rise rounded-[28px] bg-[rgba(18,18,18,0.92)] p-4 md:p-5"
        style={{ ["--stagger-delay" as string]: "110ms" }}
      >
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_320px]">
          <TiltCard depth="medium">
            <Link
              className="group block rounded-[24px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-4 py-4 transition hover:border-[rgba(242,202,80,0.28)] hover:bg-[rgba(255,255,255,0.04)]"
              href={localizeHref(locale, "/app/capture")}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                    {locale === "tr" ? "Simdi basla" : "Start here"}
                  </div>
                  <div className="font-display text-2xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
                    {locale === "tr" ? "Hizli yakala" : "Quick capture"}
                  </div>
                  <p className="max-w-xl text-sm leading-7 text-[var(--text-secondary)]">
                    {locale === "tr"
                      ? "Aklina gelen notu, fikri veya promptu once kaydet. Sonra editor icinde duzenlersin."
                      : "Save the idea, note, or prompt first. You can shape it properly inside the editor later."}
                  </p>
                </div>
                <div className="rounded-[16px] bg-[rgba(242,202,80,0.12)] p-3 text-[var(--accent-strong)] transition group-hover:scale-105">
                  <Sparkles className="h-5 w-5" />
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <InlineStat label={locale === "tr" ? "Kayit" : "Entries"} value={String(entries.length)} />
                <InlineStat label={locale === "tr" ? "Proje" : "Projects"} value={String(projects.length)} />
                <InlineStat label={locale === "tr" ? "Bekleyen" : "Pending"} value={String(syncQueueCount)} />
              </div>
            </Link>
          </TiltCard>

          <div className="grid gap-3">
            <ActionTile
              description={
                locale === "tr"
                  ? "Tum kayitlarini arayip filtrele."
                  : "Search and filter everything you have saved."
              }
              href={localizeHref(locale, "/app/library")}
              icon={<Library className="h-4 w-4" />}
              title={locale === "tr" ? "Kutuphane" : "Library"}
            />
            <ActionTile
              description={
                locale === "tr"
                  ? "Benzer kayitlari tek proje altinda topla."
                  : "Group related entries under one project."
              }
              href={localizeHref(locale, "/app/projects")}
              icon={<FolderPlus className="h-4 w-4" />}
              title={locale === "tr" ? "Yeni proje" : "New project"}
            />
            <ActionTile
              description={
                runtime.enableAI
                  ? locale === "tr"
                    ? "AI yardimlarini ac ve duzenlemeye basla."
                    : "Open AI tools and refine your work."
                  : locale === "tr"
                    ? "AI yardimlari V1 ile acilacak."
                    : "AI tools arrive with V1."
              }
              href={localizeHref(locale, "/app/settings")}
              icon={<Star className="h-4 w-4" />}
              title={runtime.enableAI ? (locale === "tr" ? "AI yardimlari" : "AI tools") : "AI in V1"}
            />
          </div>
        </div>
      </Surface>

      <div
        className="stagger-rise grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_340px]"
        style={{ ["--stagger-delay" as string]: "180ms" }}
      >
        <Surface className="rounded-[28px] bg-[rgba(18,18,18,0.92)] p-4 md:p-5">
          <div className="space-y-4">
            <SectionHeader
              actionHref={localizeHref(locale, "/app/library")}
              actionLabel={locale === "tr" ? "Kutuphane" : "Open library"}
              title={locale === "tr" ? "Devam et" : "Continue where you left off"}
            />

            <div className="space-y-2.5">
              {recentDrafts.map((draft) => (
                <ResumeRow
                  key={draft.id}
                  href={
                    draft.entryId
                      ? localizeHref(locale, `/app/editor/${draft.entryId}`)
                      : localizeHref(locale, "/app/capture")
                  }
                  meta={locale === "tr" ? "Taslak" : "Draft"}
                  summary={
                    draft.summary ||
                    draft.body ||
                    (locale === "tr" ? "Kaydedilmeyi bekleyen duzenleme." : "Unpublished changes waiting to be saved.")
                  }
                  title={
                    draft.title ||
                    (locale === "tr" ? "Adsiz taslak" : "Untitled draft")
                  }
                />
              ))}
              {recentEntries.map((entry) => (
                <ResumeRow
                  key={entry.id}
                  href={localizeHref(locale, `/app/library/${entry.id}`)}
                  meta={formatRelative(entry.updatedAt, locale)}
                  summary={entry.summary || entry.body}
                  title={entry.title}
                />
              ))}
            </div>
          </div>
        </Surface>

        <Surface className="rounded-[28px] bg-[rgba(18,18,18,0.92)] p-4 md:p-5">
          <div className="space-y-4">
            <SectionHeader
              actionHref={localizeHref(locale, "/app/projects")}
              actionLabel={locale === "tr" ? "Tum projeler" : "All projects"}
              title={locale === "tr" ? "Projeler" : "Projects"}
            />

            <div className="space-y-2.5">
              {featuredProjects.length > 0 ? (
                featuredProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    count={
                      entries.filter(
                        (entry) => entry.projectId === project.id || entry.collectionId === project.id
                      ).length
                    }
                    description={project.description}
                    href={localizeHref(locale, "/app/projects")}
                    title={project.name}
                  />
                ))
              ) : (
                <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 text-sm leading-6 text-[var(--text-secondary)]">
                  {locale === "tr"
                    ? "Ilk projeni olusturunca kayitlarini burada toplarsin."
                    : "Your projects will show up here once you create the first one."}
                </div>
              )}
            </div>
          </div>
        </Surface>
      </div>

      {favoriteEntries.length > 0 ? (
        <Surface
          className="stagger-rise rounded-[24px] bg-[rgba(18,18,18,0.88)] p-4"
          style={{ ["--stagger-delay" as string]: "240ms" }}
        >
          <div className="space-y-3">
            <SectionHeader
              actionHref={localizeHref(locale, "/app/library")}
              actionLabel={locale === "tr" ? "Tum favoriler" : "All favorites"}
              title={locale === "tr" ? "Favoriler" : "Favorites"}
            />
            <div className="flex flex-wrap gap-2">
              {favoriteEntries.map((entry) => (
                <FavoritePill
                  key={entry.id}
                  href={localizeHref(locale, `/app/library/${entry.id}`)}
                  title={entry.title}
                />
              ))}
            </div>
          </div>
        </Surface>
      ) : null}
    </div>
  );
}

function SectionHeader({
  title,
  actionHref,
  actionLabel
}: {
  title: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 className="font-display text-xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">{title}</h2>
      <Link
        className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--accent-strong)]"
        href={actionHref}
      >
        {actionLabel}
      </Link>
    </div>
  );
}

function InlineStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-[var(--border)] bg-[rgba(255,255,255,0.03)] px-3 py-2 text-xs text-[var(--text-secondary)]">
      <span className="font-semibold text-[var(--text-primary)]">{value}</span> {label}
    </div>
  );
}

function ActionTile({
  title,
  description,
  href,
  icon
}: {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
}) {
  return (
    <TiltCard className="h-full">
      <Link
        className="flex h-full items-start gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 transition hover:border-[rgba(242,202,80,0.24)] hover:bg-[rgba(255,255,255,0.04)]"
        href={href}
      >
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-[14px] bg-[rgba(242,202,80,0.08)] text-[var(--accent-strong)]">
          {icon}
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-[var(--text-primary)]">{title}</div>
          <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">{description}</div>
        </div>
      </Link>
    </TiltCard>
  );
}

function ResumeRow({
  title,
  summary,
  meta,
  href
}: {
  title: string;
  summary: string;
  meta: string;
  href: string;
}) {
  return (
    <TiltCard>
      <Link
        className="flex items-start gap-3 rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 transition hover:border-[rgba(242,202,80,0.2)] hover:bg-[rgba(255,255,255,0.03)]"
        href={href}
      >
        <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-[14px] bg-[rgba(242,202,80,0.08)] text-[var(--accent-strong)]">
          <Clock3 className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="truncate text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
              {title}
            </div>
            <div className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              {meta}
            </div>
          </div>
          <div className="mt-1 line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">{summary}</div>
        </div>
      </Link>
    </TiltCard>
  );
}

function ProjectRow({
  title,
  description,
  count,
  href
}: {
  title: string;
  description?: string;
  count: number;
  href: string;
}) {
  return (
    <TiltCard>
      <Link
        className="block rounded-[22px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-4 transition hover:border-[rgba(242,202,80,0.2)] hover:bg-[rgba(255,255,255,0.03)]"
        href={href}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-base font-semibold tracking-[-0.02em] text-[var(--text-primary)]">{title}</div>
            <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {description || ""}
            </div>
          </div>
          <Badge tone="accent">{count}</Badge>
        </div>
      </Link>
    </TiltCard>
  );
}

function FavoritePill({ title, href }: { title: string; href: string }) {
  return (
    <TiltCard depth="soft">
      <Link
        className="block rounded-full border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2.5 text-sm font-medium text-[var(--text-primary)] transition hover:border-[rgba(242,202,80,0.2)] hover:bg-[rgba(255,255,255,0.03)]"
        href={href}
      >
        {title}
      </Link>
    </TiltCard>
  );
}
