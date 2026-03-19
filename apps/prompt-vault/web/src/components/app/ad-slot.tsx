"use client";

import { Badge, Surface } from "@/components/ui/primitives";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

export function AdSlot({
  title,
  compact = false
}: {
  title?: string;
  compact?: boolean;
}) {
  const { runtime } = useVault();
  const { t } = useLocaleContext();

  if (!runtime.enableAds) {
    return null;
  }

  return (
    <Surface className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[var(--text-primary)]">
          {title ?? t("app.betaSupportTitle")}
        </div>
        <Badge>{t("app.betaLabel")}</Badge>
      </div>
      <div className="rounded-[22px] border border-dashed border-[var(--border-strong)] bg-[linear-gradient(180deg,rgba(212,175,55,0.08),rgba(255,255,255,0.02))] px-4 py-5 text-sm leading-7 text-[var(--text-secondary)]">
        {compact ? t("app.adSlotCompact") : t("app.adSlotDescription")}
      </div>
    </Surface>
  );
}
