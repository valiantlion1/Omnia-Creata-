"use client";

import { useDeferredValue, useState } from "react";
import { Search, Star, Archive, X } from "lucide-react";
import Link from "next/link";
import { Badge, EmptyState, Input, Select } from "@/components/ui/primitives";
import { getProjects } from "@/lib/dataset";
import { defaultFilters, filterEntries } from "@/lib/vault-utils";
import { formatRelative } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";
import { cn } from "@/lib/cn";

export function LibraryView() {
  const { dataset } = useVault();
  const { locale, t } = useLocaleContext();
  const [filters, setFilters] = useState(defaultFilters);
  const deferredQuery = useDeferredValue(filters.query);
  const entries = filterEntries(dataset, { ...filters, query: deferredQuery });
  const projects = getProjects(dataset);

  const isDefault =
    !filters.favoritesOnly &&
    !filters.archivedOnly &&
    filters.categoryId === "all" &&
    filters.projectId === "all" &&
    filters.platform === "all" &&
    filters.tags.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col gap-5 py-2">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <Input
          className="h-12 rounded-full bg-[var(--surface)] pl-10 pr-4"
          onChange={(e) => setFilters((c) => ({ ...c, query: e.target.value }))}
          placeholder={t("app.searchPlaceholder")}
          value={filters.query}
        />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        <FilterChip
          active={isDefault}
          onClick={() => setFilters(defaultFilters)}
        >
          {t("common.all")}
        </FilterChip>
        <FilterChip
          active={filters.favoritesOnly}
          onClick={() => setFilters((c) => ({ ...c, favoritesOnly: !c.favoritesOnly }))}
          icon={<Star className="h-3 w-3" />}
        >
          {t("common.favorite")}
        </FilterChip>
        <FilterChip
          active={filters.archivedOnly}
          onClick={() => setFilters((c) => ({ ...c, archivedOnly: !c.archivedOnly }))}
          icon={<Archive className="h-3 w-3" />}
        >
          {t("common.archive")}
        </FilterChip>
      </div>

      {/* Dropdowns row */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Select
          onChange={(e) => setFilters((c) => ({ ...c, categoryId: e.target.value }))}
          value={filters.categoryId}
        >
          <option value="all">{t("app.allCategories")}</option>
          {dataset.categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.label[locale]}</option>
          ))}
        </Select>
        <Select
          onChange={(e) => setFilters((c) => ({ ...c, projectId: e.target.value, collectionId: e.target.value }))}
          value={filters.projectId}
        >
          <option value="all">{t("app.allProjects")}</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
        <Select
          className="col-span-2 sm:col-span-1"
          onChange={(e) => setFilters((c) => ({ ...c, platform: e.target.value }))}
          value={filters.platform}
        >
          <option value="all">{t("app.allPlatforms")}</option>
          {dataset.platforms.map((p) => (
            <option key={p.id} value={p.key}>{p.label[locale]}</option>
          ))}
        </Select>
      </div>

      {/* Tag chips */}
      {dataset.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {dataset.tags.map((tag) => {
            const active = filters.tags.includes(tag.id);
            return (
              <button
                key={tag.id}
                className={cn(
                  "vault-press rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors",
                  active
                    ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "bg-[var(--surface)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                )}
                onClick={() =>
                  setFilters((c) => ({
                    ...c,
                    tags: active
                      ? c.tags.filter((t) => t !== tag.id)
                      : [...c.tags, tag.id],
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

      {/* Result count */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--text-tertiary)]">
          {entries.length} {t("app.resultsLabel")}
        </span>
        {!isDefault ? (
          <button
            className="vault-press flex items-center gap-1 text-xs text-[var(--accent)] hover:text-[var(--accent-strong)]"
            onClick={() => setFilters(defaultFilters)}
            type="button"
          >
            <X className="h-3 w-3" />
            {locale === "tr" ? "Temizle" : "Clear"}
          </button>
        ) : null}
      </div>

      {/* Entry list */}
      {entries.length > 0 ? (
        <div className="space-y-1">
          {entries.map((entry) => (
            <Link
              key={entry.id}
              href={localizeHref(locale, `/app/library/${entry.id}`)}
              className="vault-row vault-press group"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-medium text-[var(--text-primary)]">
                    {entry.title}
                  </span>
                  {entry.isFavorite ? (
                    <Star className="h-3 w-3 shrink-0 fill-[var(--accent)] text-[var(--accent)]" />
                  ) : null}
                </div>
                <div className="mt-0.5 line-clamp-1 text-xs text-[var(--text-tertiary)]">
                  {entry.summary || entry.body}
                </div>
              </div>
              <span className="shrink-0 text-[10px] font-medium text-[var(--text-tertiary)]">
                {formatRelative(entry.updatedAt, locale)}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title={locale === "tr" ? "Sonuç yok" : "No results"}
          description={t("app.emptyStateDescription")}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      className={cn(
        "vault-press inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
          : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      )}
      onClick={onClick}
      type="button"
    >
      {icon}
      {children}
    </button>
  );
}
