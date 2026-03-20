"use client";

import { useDeferredValue, useState } from "react";
import { Archive, Search, Star, X } from "lucide-react";
import Link from "next/link";
import { EmptyState, Input, Select } from "@/components/ui/primitives";
import { getProjects } from "@/lib/dataset";
import { formatRelative } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { defaultFilters, filterEntries } from "@/lib/vault-utils";
import { cn } from "@/lib/cn";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

export function LibraryView() {
  const { dataset } = useVault();
  const { locale, t } = useLocaleContext();
  const [filters, setFilters] = useState(defaultFilters);
  const deferredQuery = useDeferredValue(filters.query);
  const entries = filterEntries(dataset, { ...filters, query: deferredQuery });
  const projects = getProjects(dataset);

  const hasActiveFilters =
    filters.favoritesOnly ||
    filters.archivedOnly ||
    filters.categoryId !== "all" ||
    filters.projectId !== "all" ||
    filters.platform !== "all" ||
    filters.tags.length > 0 ||
    filters.query.trim().length > 0;

  return (
    <div className="flex flex-col gap-6 py-1">
      <section className="vault-card p-5 sm:p-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="vault-kicker">{locale === "tr" ? "Arama" : "Search"}</div>
              <h2 className="text-[24px] font-semibold tracking-[-0.05em] text-[var(--text-primary)]">
                {locale === "tr" ? "Library hizli ve okunur olmali." : "The library should feel fast and easy to scan."}
              </h2>
              <p className="max-w-[520px] text-[13px] leading-6 text-[var(--text-secondary)]">
                {locale === "tr"
                  ? "Aradigini bul, filtrele, sonra kayda gir. Burasi galeri degil; tekrar tekrar acilan bir calisma kutuphanesi."
                  : "Find the right entry, filter lightly, and jump back in. This is a working library, not a gallery of cards."}
              </p>
            </div>
            <div className="text-[12px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
              {entries.length} {locale === "tr" ? "sonuc" : "results"}
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <Input
              className="h-14 rounded-[22px] pl-11 pr-4"
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder={t("app.searchPlaceholder")}
              value={filters.query}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={!hasActiveFilters}
              icon={<Search className="h-3.5 w-3.5" />}
              onClick={() => setFilters(defaultFilters)}
            >
              {locale === "tr" ? "Tum kayitlar" : "All entries"}
            </FilterChip>
            <FilterChip
              active={filters.favoritesOnly}
              icon={<Star className="h-3.5 w-3.5" />}
              onClick={() => setFilters((current) => ({ ...current, favoritesOnly: !current.favoritesOnly }))}
            >
              {locale === "tr" ? "Favoriler" : "Favorites"}
            </FilterChip>
            <FilterChip
              active={filters.archivedOnly}
              icon={<Archive className="h-3.5 w-3.5" />}
              onClick={() => setFilters((current) => ({ ...current, archivedOnly: !current.archivedOnly }))}
            >
              {locale === "tr" ? "Arsiv" : "Archive"}
            </FilterChip>
            {hasActiveFilters ? (
              <button
                className="vault-chip vault-press text-[var(--accent-strong)]"
                onClick={() => setFilters(defaultFilters)}
                type="button"
              >
                <X className="h-3.5 w-3.5" />
                {locale === "tr" ? "Temizle" : "Clear"}
              </button>
            ) : null}
          </div>

          <div className="grid gap-2 md:grid-cols-3">
            <Select
              onChange={(event) => setFilters((current) => ({ ...current, categoryId: event.target.value }))}
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
                  collectionId: event.target.value,
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
              onChange={(event) => setFilters((current) => ({ ...current, platform: event.target.value }))}
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
        </div>
      </section>

      {dataset.tags.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {dataset.tags.map((tag) => {
            const active = filters.tags.includes(tag.id);
            return (
              <button
                key={tag.id}
                className="vault-chip vault-press"
                data-active={active}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    tags: active
                      ? current.tags.filter((item) => item !== tag.id)
                      : [...current.tags, tag.id],
                  }))
                }
                type="button"
              >
                #{tag.name}
              </button>
            );
          })}
        </div>
      ) : null}

      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((entry) => {
            const category = dataset.categories.find((category) => category.id === entry.categoryId);
            const project = projects.find((item) => item.id === (entry.projectId ?? entry.collectionId));

            return (
              <Link
                key={entry.id}
                className="vault-list-item vault-press group"
                href={localizeHref(locale, `/app/library/${entry.id}`)}
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-[rgba(255,255,255,0.04)] text-[var(--text-primary)]">
                  {entry.title.trim().charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-[15px] font-semibold text-[var(--text-primary)]">
                      {entry.title}
                    </div>
                    {entry.isFavorite ? (
                      <span className="inline-flex items-center rounded-full bg-[var(--accent-soft)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--accent-strong)]">
                        {locale === "tr" ? "Favori" : "Favorite"}
                      </span>
                    ) : null}
                    {project ? (
                      <span className="inline-flex items-center rounded-full bg-[rgba(255,255,255,0.04)] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
                        {project.name}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1 line-clamp-2 text-[13px] leading-6 text-[var(--text-secondary)]">
                    {entry.summary || entry.body}
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                    {formatRelative(entry.updatedAt, locale)}
                  </div>
                  <div className="mt-2 text-[11px] text-[var(--text-tertiary)]">
                    {category?.label[locale] ?? entry.type.replace(/_/g, " ")}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <EmptyState
          description={t("app.emptyStateDescription")}
          title={locale === "tr" ? "Eslesen sonuc yok" : "No matching entries"}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  icon,
  onClick,
  children,
}: {
  active: boolean;
  icon: React.ReactNode;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button className="vault-chip vault-press" data-active={active} onClick={onClick} type="button">
      {icon}
      <span className={cn(active ? "text-[var(--accent-strong)]" : "")}>{children}</span>
    </button>
  );
}
