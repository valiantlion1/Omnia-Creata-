"use client";

import { useDeferredValue, useState } from "react";
import { Search } from "lucide-react";
import { AdSlot } from "@/components/app/ad-slot";
import { PromptCard } from "@/components/app/prompt-card";
import { Badge, Button, Input, Select, Surface } from "@/components/ui/primitives";
import { getProjects } from "@/lib/dataset";
import { defaultFilters, filterEntries } from "@/lib/vault-utils";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

export function LibraryView() {
  const { dataset } = useVault();
  const { locale, t } = useLocaleContext();
  const [filters, setFilters] = useState(defaultFilters);
  const deferredQuery = useDeferredValue(filters.query);
  const entries = filterEntries(dataset, { ...filters, query: deferredQuery });
  const projects = getProjects(dataset);

  return (
    <div className="space-y-6 lg:space-y-7">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_300px]">
        <Surface className="rounded-[28px] bg-[linear-gradient(135deg,rgba(111,151,141,0.08),rgba(20,20,20,0.92)_48%,rgba(242,202,80,0.06))] p-5 md:p-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Badge tone="info">{locale === "tr" ? "Kutuphane" : "Library"}</Badge>
                <Badge tone="accent">
                  {entries.length} {t("app.resultsLabel")}
                </Badge>
              </div>
              <h1 className="font-display text-3xl font-extrabold tracking-[-0.05em] text-[var(--text-primary)] md:text-[2rem]">
                {t("app.libraryTitle")}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)] md:text-base md:leading-8">
                {t("app.librarySubtitle")}
              </p>
            </div>

            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--accent-secondary-strong)]" />
              <Input
                className="h-14 rounded-[20px] bg-[rgba(12,12,12,0.9)] pl-12 text-[var(--text-primary)]"
                onChange={(event) =>
                  setFilters((current) => ({ ...current, query: event.target.value }))
                }
                placeholder={t("app.searchPlaceholder")}
                value={filters.query}
              />
            </div>
          </div>
        </Surface>

        <Surface className="rounded-[28px] bg-[rgba(20,20,20,0.9)] p-5 md:p-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                {locale === "tr" ? "Filtre durumu" : "Filter state"}
              </div>
              <div className="font-display text-xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
                {locale === "tr" ? "Aramayi daralt" : "Refine the library"}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone="accent">{filters.categoryId === "all" ? t("app.allCategories") : locale === "tr" ? "Kategori secili" : "Category active"}</Badge>
              <Badge tone="info">{filters.projectId === "all" ? t("app.allProjects") : locale === "tr" ? "Proje secili" : "Project active"}</Badge>
              <Badge>{filters.platform === "all" ? t("app.allPlatforms") : locale === "tr" ? "Platform secili" : "Platform active"}</Badge>
            </div>
          </div>
        </Surface>
      </section>

      <section className="space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          <Button
            onClick={() => setFilters(defaultFilters)}
            size="sm"
            variant={
              !filters.favoritesOnly &&
              !filters.archivedOnly &&
              filters.categoryId === "all" &&
              filters.projectId === "all" &&
              filters.platform === "all"
                ? "primary"
                : "secondary"
            }
          >
            {t("common.all")}
          </Button>
          <Button
            onClick={() =>
              setFilters((current) => ({ ...current, favoritesOnly: !current.favoritesOnly }))
            }
            size="sm"
            variant={filters.favoritesOnly ? "primary" : "secondary"}
          >
            {t("common.favorite")}
          </Button>
          <Button
            onClick={() =>
              setFilters((current) => ({ ...current, archivedOnly: !current.archivedOnly }))
            }
            size="sm"
            variant={filters.archivedOnly ? "primary" : "secondary"}
          >
            {t("common.archive")}
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Select
            onChange={(event) =>
              setFilters((current) => ({ ...current, categoryId: event.target.value }))
            }
            value={filters.categoryId}
          >
            <option value="all">{t("app.allCategories")}</option>
            {dataset.categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label[locale]}
              </option>
            ))}
          </Select>
          <Select
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                projectId: event.target.value,
                collectionId: event.target.value
              }))
            }
            value={filters.projectId}
          >
            <option value="all">{t("app.allProjects")}</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </Select>
          <Select
            onChange={(event) =>
              setFilters((current) => ({ ...current, platform: event.target.value }))
            }
            value={filters.platform}
          >
            <option value="all">{t("app.allPlatforms")}</option>
            {dataset.platforms.map((platform) => (
              <option key={platform.id} value={platform.key}>
                {platform.label[locale]}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          {dataset.tags.map((tag) => {
            const active = filters.tags.includes(tag.id);
            return (
              <button
                key={tag.id}
                className={
                  active
                    ? "rounded-full border border-[color:rgba(111,151,141,0.28)] bg-[var(--accent-secondary-soft)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--accent-secondary-strong)]"
                    : "rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]"
                }
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    tags: active
                      ? current.tags.filter((item) => item !== tag.id)
                      : [...current.tags, tag.id]
                  }))
                }
                type="button"
              >
                #{tag.name}
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="font-display text-xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
            {t("app.resultsHeading")}
          </div>
          <Badge tone="info">
            {entries.length} {t("app.resultsLabel")}
          </Badge>
        </div>

        {entries.length > 0 ? (
          <div className="space-y-4">
            {entries.map((entry) => (
              <PromptCard key={entry.id} compact promptId={entry.id} />
            ))}
          </div>
        ) : (
          <Surface className="rounded-[22px] bg-[rgba(28,27,27,0.96)] p-6">
            <p className="text-sm leading-7 text-[var(--text-secondary)]">{t("app.emptyStateDescription")}</p>
          </Surface>
        )}
      </section>

      <AdSlot compact />
    </div>
  );
}
