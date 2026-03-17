"use client";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { PromptCard } from "@/components/app/prompt-card";
import { Button, EmptyState, Input, Select, Surface, Badge, SectionHeading } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { localizeHref } from "@/lib/locale";
import { defaultFilters, filterPrompts } from "@/lib/vault-utils";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

export function LibraryView() {
  const { dataset } = useVault();
  const { locale, t } = useLocaleContext();
  const [filters, setFilters] = useState(defaultFilters);
  const [viewMode, setViewMode] = useState<"list" | "grid">(dataset.preferences.defaultView);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const deferredQuery = useDeferredValue(filters.query);
  const prompts = filterPrompts(dataset, { ...filters, query: deferredQuery });
  const activeCollection = dataset.collections.find((collection) => collection.id === filters.collectionId);
  const activeCategory = dataset.categories.find((category) => category.id === filters.categoryId);
  const activePlatform = dataset.platforms.find((platform) => platform.key === filters.platform);
  const activeFilterCount =
    (filters.query ? 1 : 0) +
    (filters.categoryId !== "all" ? 1 : 0) +
    (filters.collectionId !== "all" ? 1 : 0) +
    (filters.platform !== "all" ? 1 : 0) +
    (filters.favoritesOnly ? 1 : 0) +
    (filters.archivedOnly ? 1 : 0) +
    filters.tags.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.libraryTitle")}
        subtitle={t("app.librarySubtitle")}
        actions={
          <>
            <Button className="md:hidden" onClick={() => setMobileFiltersOpen(true)} variant="secondary">
              <SlidersHorizontal className="h-4 w-4" />
              {t("app.filters")}
            </Button>
            <Button onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")} variant="secondary">
              {viewMode === "grid" ? t("app.listView") : t("app.gridView")}
            </Button>
            <Link href={localizeHref(locale, "/app/editor/new")}>
              <Button>{t("app.createPrompt")}</Button>
            </Link>
          </>
        }
      />
      <Surface className="hidden space-y-4 p-4 md:block md:p-5">
        <SectionHeading
          title={t("app.filterSurfaceTitle")}
          description={t("app.filterSurfaceDescription")}
        />
        <div className="grid gap-4 xl:grid-cols-[2fr_1fr_1fr_1fr]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
            <Input
              className="pl-10"
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder={t("app.searchPlaceholder")}
              value={filters.query}
            />
          </div>
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
            onChange={(event) => setFilters((current) => ({ ...current, collectionId: event.target.value }))}
            value={filters.collectionId}
          >
            <option value="all">{t("app.allCollections")}</option>
            {dataset.collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
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
        <div className="flex flex-wrap items-center gap-2">
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
          <Button onClick={() => setFilters(defaultFilters)} size="sm" variant="ghost">
            {t("app.clearFilters")}
          </Button>
          <Badge className="ml-auto">
            {prompts.length} {t("app.resultsLabel")}
          </Badge>
        </div>
        {activeFilterCount > 0 ? (
          <div className="flex flex-wrap gap-2">
            {filters.query ? <Badge tone="accent">{filters.query}</Badge> : null}
            {activeCategory ? <Badge>{activeCategory.label[locale]}</Badge> : null}
            {activeCollection ? <Badge>{activeCollection.name}</Badge> : null}
            {activePlatform ? <Badge>{activePlatform.label[locale]}</Badge> : null}
            {filters.favoritesOnly ? <Badge>{t("common.favorite")}</Badge> : null}
            {filters.archivedOnly ? <Badge>{t("common.archive")}</Badge> : null}
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {dataset.tags.map((tag) => {
            const active = filters.tags.includes(tag.id);
            return (
              <button
                key={tag.id}
                className={`min-h-11 rounded-full border px-3.5 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border border-[color:rgba(212,175,55,0.3)] bg-gradient-to-br from-[rgba(212,175,55,0.15)] to-[rgba(212,175,55,0.05)] text-[var(--accent-strong)] shadow-[var(--shadow-glow)]"
                    : "border-transparent bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:border-[var(--border)] hover:text-[var(--text-primary)]"
                }`}
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
      </Surface>
      <div
        className={cn(
          "fixed inset-0 z-40 flex items-end md:hidden",
          mobileFiltersOpen ? "pointer-events-auto" : "pointer-events-none"
        )}
      >
        <button
          aria-label={t("common.cancel")}
          className={cn(
            "absolute inset-0 bg-black/45 transition",
            mobileFiltersOpen ? "opacity-100" : "opacity-0"
          )}
          onClick={() => setMobileFiltersOpen(false)}
          type="button"
        />
        <Surface
          className={cn(
            "relative w-full rounded-b-none p-4 shadow-[var(--shadow-soft)] transition duration-200",
            mobileFiltersOpen ? "translate-y-0" : "translate-y-full"
          )}
          style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="text-sm font-semibold text-[var(--text-primary)]">{t("app.filters")}</div>
            <Button onClick={() => setMobileFiltersOpen(false)} size="sm" variant="ghost">
              <X className="h-4 w-4" />
              {t("common.cancel")}
            </Button>
          </div>
          <div className="space-y-3">
            <Input
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder={t("app.searchPlaceholder")}
              value={filters.query}
            />
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
              onChange={(event) => setFilters((current) => ({ ...current, collectionId: event.target.value }))}
              value={filters.collectionId}
            >
              <option value="all">{t("app.allCollections")}</option>
              {dataset.collections.map((collection) => (
                <option key={collection.id} value={collection.id}>
                  {collection.name}
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
            <div className="flex flex-wrap gap-2 pt-1">
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
              <Button onClick={() => setFilters(defaultFilters)} size="sm" variant="ghost">
                {t("app.clearFilters")}
              </Button>
            </div>
          </div>
        </Surface>
      </div>
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-[var(--text-primary)]">{t("app.resultsHeading")}</div>
            <div className="text-sm text-[var(--text-secondary)]">
              {prompts.length} {t("app.resultsLabel")}
            </div>
          </div>
          {activeFilterCount > 0 ? <Badge tone="accent">{activeFilterCount}</Badge> : null}
        </div>
      </div>
      {prompts.length === 0 ? (
        <EmptyState
          action={
            <Link href={localizeHref(locale, "/app/editor/new")}>
              <Button>{t("app.createPrompt")}</Button>
            </Link>
          }
          description={t("app.emptyStateDescription")}
          title={t("app.emptyStateTitle")}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_290px]">
          <div className={viewMode === "grid" ? "grid gap-4 xl:grid-cols-2" : "space-y-4"}>
            {prompts.map((prompt) => (
              <PromptCard key={prompt.id} promptId={prompt.id} compact={viewMode === "grid"} />
            ))}
          </div>
          <div className="hidden space-y-4 xl:block">
            <Surface className="space-y-3 p-5">
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {t("app.topPlatforms")}
              </div>
              <div className="flex flex-wrap gap-2">
                {dataset.platforms.map((platform) => (
                  <Badge key={platform.id}>{platform.label[locale]}</Badge>
                ))}
              </div>
            </Surface>
            <Surface className="space-y-3 p-5">
              <div className="text-sm font-semibold text-[var(--text-primary)]">
                {t("app.quickActions")}
              </div>
              <div className="grid gap-2">
                <Link href={localizeHref(locale, "/app/editor/new")}>
                  <Button className="w-full justify-start" variant="secondary">
                    {t("app.createPrompt")}
                  </Button>
                </Link>
                <Link href={localizeHref(locale, "/app/collections")}>
                  <Button className="w-full justify-start" variant="ghost">
                    {t("app.createCollection")}
                  </Button>
                </Link>
              </div>
            </Surface>
          </div>
        </div>
      )}
      <Surface className="space-y-3 p-5 xl:hidden">
        <div className="text-sm font-semibold text-[var(--text-primary)]">{t("app.topPlatforms")}</div>
        <div className="flex flex-wrap gap-2">
          {dataset.platforms.map((platform) => (
            <Badge key={platform.id}>{platform.label[locale]}</Badge>
          ))}
        </div>
      </Surface>
    </div>
  );
}
