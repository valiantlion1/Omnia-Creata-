"use client";

import Link from "next/link";
import { ArrowUpRight, Download, Search, Star } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { PromptCard } from "@/components/app/prompt-card";
import { formatRelative } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";
import { Badge, Button, MetricCard, SectionHeading, Surface } from "@/components/ui/primitives";

export function DashboardView() {
  const { dashboard, dataset } = useVault();
  const { locale, t } = useLocaleContext();

  const quickActions = [
    {
      href: localizeHref(locale, "/app/library"),
      icon: Search,
      title: t("common.search"),
      description: t("app.dashboardSearchActionDescription")
    },
    {
      href: localizeHref(locale, "/app/favorites"),
      icon: Star,
      title: t("common.favorite"),
      description: t("app.dashboardFavoriteActionDescription")
    },
    {
      href: localizeHref(locale, "/app/settings"),
      icon: Download,
      title: t("common.export"),
      description: t("app.dashboardExportActionDescription")
    }
  ];

  return (
    <div className="space-y-5 md:space-y-6">
      <PageHeader
        title={t("app.dashboardTitle")}
        subtitle={t("app.dashboardSubtitle")}
        actions={
          <>
            <Link href={localizeHref(locale, "/app/editor/new")}>
              <Button>{t("app.createPrompt")}</Button>
            </Link>
            <Link href={localizeHref(locale, "/app/collections")}>
              <Button variant="secondary">{t("app.createCollection")}</Button>
            </Link>
          </>
        }
      />

      <Surface className="grid gap-5 p-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <SectionHeading
            eyebrow={t("common.productName")}
            title={t("app.commandCenterTitle")}
            description={t("app.commandCenterDescription")}
          />
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{dashboard.totalEntries} {t("app.totalEntries").toLowerCase()}</Badge>
            <Badge>{dashboard.totalCollections} {t("app.totalCollections").toLowerCase()}</Badge>
            <Badge>{dashboard.favoriteCount} {t("app.favoritesCount").toLowerCase()}</Badge>
          </div>
        </div>
        <div className="space-y-3 rounded-[20px] border border-[var(--border)] bg-[var(--surface-muted)] p-4 ring-1 ring-inset ring-white/5">
          <div className="space-y-1">
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {t("app.recentActivityTitle")}
            </div>
            <div className="text-sm leading-6 text-[var(--text-secondary)]">
              {t("app.recentActivityDescription")}
            </div>
          </div>
          <div className="space-y-2">
            {dataset.activities.slice(0, 3).map((activity) => (
              <div
                key={activity.id}
                className="rounded-[16px] border border-[var(--border)] bg-black/40 px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-[var(--text-primary)]">
                    {activity.promptTitle}
                  </div>
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                    {formatRelative(activity.createdAt, locale)}
                  </div>
                </div>
                <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                  {activity.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Surface>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          className="sm:col-span-2"
          detail={dashboard.recentlyUpdated[0]?.title}
          label={t("app.totalEntries")}
          value={dashboard.totalEntries}
        />
        <MetricCard
          detail={dataset.collections[0]?.name}
          label={t("app.totalCollections")}
          value={dashboard.totalCollections}
        />
        <MetricCard
          detail={dashboard.favoriteCount > 0 ? dataset.prompts.find((prompt) => prompt.isFavorite)?.title : undefined}
          label={t("app.favoritesCount")}
          value={dashboard.favoriteCount}
        />
        <MetricCard
          detail={dashboard.archivedCount > 0 ? String(dashboard.archivedCount) : undefined}
          label={t("app.archivedCount")}
          value={dashboard.archivedCount}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-4">
          <SectionHeading title={t("app.recentlyUpdated")} />
          <div className="grid gap-4 xl:grid-cols-2">
            {dashboard.recentlyUpdated.slice(0, 4).map((prompt) => (
              <PromptCard key={prompt.id} compact promptId={prompt.id} />
            ))}
          </div>
        </div>

        <Surface className="space-y-4 p-4 md:p-5">
          <SectionHeading title={t("app.quickActions")} />
          <div className="grid gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;

              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className="group rounded-[20px] border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-panel)] transition duration-200 hover:-translate-y-0.5 hover:border-[color:rgba(212,175,55,0.3)] hover:shadow-[var(--shadow-glow)]"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-[14px] border border-[color:rgba(212,175,55,0.3)] bg-gradient-to-br from-[rgba(212,175,55,0.2)] to-[rgba(212,175,55,0.05)] text-[var(--accent-strong)]">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-[var(--text-primary)]">
                          {action.title}
                        </div>
                        <div className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
                          {action.description}
                        </div>
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-[var(--text-tertiary)] transition group-hover:text-[var(--accent-strong)]" />
                  </div>
                </Link>
              );
            })}
          </div>
        </Surface>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Surface className="space-y-4 p-4 md:p-5 xl:col-span-2">
          <SectionHeading title={t("app.topCategories")} />
          <div className="space-y-4">
            {dashboard.promptsByCategory.map((item) => {
              const category = dataset.categories.find((entry) => entry.id === item.categoryId);
              const width = `${Math.max(14, (item.count / Math.max(dashboard.totalEntries, 1)) * 100)}%`;

              return (
                <div
                  key={item.categoryId}
                  className="space-y-3 rounded-[16px] border border-[var(--border)] bg-[var(--surface-muted)] p-3.5 md:p-4"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-[var(--text-primary)]">
                      {category?.label[locale]}
                    </span>
                    <span className="text-[var(--text-secondary)]">{item.count}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-[var(--surface-muted)]">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-strong)] shadow-[0_0_12px_rgba(212,175,55,0.5)]"
                      style={{ width }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Surface>

        <Surface className="space-y-4 p-4 md:p-5">
          <SectionHeading title={t("app.topTags")} />
          <div className="flex flex-wrap gap-2">
            {dashboard.topTags.map((item) => {
              const tag = dataset.tags.find((entry) => entry.id === item.tagId);

              return (
                <Badge key={item.tagId}>
                  #{tag?.name} / {item.count}
                </Badge>
              );
            })}
          </div>

          <div className="space-y-3 pt-2">
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              {t("app.topPlatforms")}
            </div>
            {dashboard.promptsByPlatform.map((item) => (
              <div
                key={item.platform}
                className="flex min-h-11 items-center justify-between rounded-[16px] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--text-secondary)]"
              >
                <span className="font-medium text-[var(--text-primary)]">{item.platform}</span>
                <Badge>{item.count}</Badge>
              </div>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}
