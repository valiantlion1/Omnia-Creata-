"use client";

import { FolderOpen } from "lucide-react";
import { Badge, Surface } from "@/components/ui/primitives";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

export function CollectionCard({ collectionId }: { collectionId: string }) {
  const { dataset } = useVault();
  const { t } = useLocaleContext();
  const collection = dataset.collections.find((item) => item.id === collectionId);

  if (!collection) {
    return null;
  }

  const count = dataset.prompts.filter((prompt) => prompt.collectionId === collection.id).length;

  return (
    <Surface className="space-y-4 p-5 transition duration-200 hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-glow)]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:rgba(212,167,91,0.18)] bg-[var(--accent-soft)] text-[var(--accent-strong)] shadow-[var(--shadow-glow)]">
            <FolderOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
              {collection.name}
            </div>
            <div className="text-sm text-[var(--text-secondary)]">{collection.description}</div>
          </div>
        </div>
        <Badge tone="accent">
          {count} {t("app.itemsLabel")}
        </Badge>
      </div>
    </Surface>
  );
}
