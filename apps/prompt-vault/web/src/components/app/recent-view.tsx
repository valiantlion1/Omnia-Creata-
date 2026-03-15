"use client";

import { PageHeader } from "@/components/app/page-header";
import { PromptCard } from "@/components/app/prompt-card";
import { Badge, SectionHeading, Surface } from "@/components/ui/primitives";
import { formatRelative } from "@/lib/format";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

export function RecentView() {
  const { dataset } = useVault();
  const { locale, t } = useLocaleContext();

  return (
    <div className="space-y-6">
      <PageHeader title={t("app.recentTitle")} subtitle={t("app.recentSubtitle")} />
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface className="space-y-4 p-5">
          <SectionHeading title={t("app.recentTitle")} description={t("app.recentSubtitle")} />
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">
              {dataset.prompts.slice(0, 4).length} {t("app.itemsLabel")}
            </Badge>
            <Badge>
              {dataset.activities.length} {t("app.activityTitle")}
            </Badge>
          </div>
          <div className="space-y-4">
            {dataset.prompts.slice(0, 4).map((prompt) => (
              <PromptCard key={prompt.id} compact promptId={prompt.id} />
            ))}
          </div>
        </Surface>
        <Surface className="space-y-4 p-5">
          <SectionHeading
            title={t("app.recentActivityTitle")}
            description={t("app.recentActivityDescription")}
          />
          <div className="space-y-4">
            {dataset.activities.map((activity) => (
              <div
                key={activity.id}
                className="rounded-3xl border border-[var(--border)] bg-[color:rgba(255,255,255,0.02)] p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="text-sm font-semibold text-[var(--text-primary)]">
                    {activity.promptTitle}
                  </div>
                  <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                    {formatRelative(activity.createdAt, locale)}
                  </div>
                </div>
                <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                  {activity.description}
                </p>
              </div>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}
