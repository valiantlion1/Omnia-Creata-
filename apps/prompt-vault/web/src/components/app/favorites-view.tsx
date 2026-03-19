"use client";

import Link from "next/link";
import { PageHeader } from "@/components/app/page-header";
import { PromptCard } from "@/components/app/prompt-card";
import { Button, EmptyState } from "@/components/ui/primitives";
import { getEntries } from "@/lib/dataset";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

export function FavoritesView() {
  const { dataset } = useVault();
  const { locale, t } = useLocaleContext();
  const favorites = getEntries(dataset).filter((entry) => entry.isFavorite && !entry.isArchived);

  return (
    <div className="space-y-6">
      <PageHeader title={t("app.favoritesTitle")} subtitle={t("app.favoritesSubtitle")} />
      {favorites.length === 0 ? (
        <EmptyState
          action={
            <Link href={localizeHref(locale, "/app/library")}>
              <Button>{t("common.library")}</Button>
            </Link>
          }
          description={t("app.emptyStateDescription")}
          title={t("app.emptyStateTitle")}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {favorites.map((prompt) => (
            <PromptCard key={prompt.id} promptId={prompt.id} />
          ))}
        </div>
      )}
    </div>
  );
}
