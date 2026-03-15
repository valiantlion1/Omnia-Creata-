"use client";

import Link from "next/link";
import { Copy, Heart, Pencil, Repeat2, Vault } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatDate } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useToast } from "@/providers/toast-provider";
import { useVault } from "@/providers/vault-provider";
import { Badge, Button, Surface } from "@/components/ui/primitives";

export function PromptCard({
  promptId,
  compact = false
}: {
  promptId: string;
  compact?: boolean;
}) {
  const { dataset, toggleArchive, toggleFavorite, duplicatePrompt } = useVault();
  const { notify } = useToast();
  const { locale, t } = useLocaleContext();
  const prompt = dataset.prompts.find((item) => item.id === promptId);

  if (!prompt) {
    return null;
  }

  const promptRecord = prompt;
  const category = dataset.categories.find((item) => item.id === promptRecord.categoryId);
  const collection = dataset.collections.find((item) => item.id === promptRecord.collectionId);
  const tags = promptRecord.tagIds
    .map((tagId) => dataset.tags.find((tag) => tag.id === tagId)?.name)
    .filter(Boolean) as string[];

  async function onCopy() {
    await navigator.clipboard.writeText(promptRecord.body);
    notify(t("app.promptCopied"));
  }

  return (
    <Surface className="group relative overflow-hidden space-y-4 p-4 transition duration-200 before:absolute before:inset-x-6 before:top-0 before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(214,177,91,0.48),transparent)] hover:-translate-y-0.5 hover:border-[var(--border-strong)] hover:shadow-[var(--shadow-glow)] md:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge>{category?.label[locale] ?? promptRecord.type}</Badge>
            {promptRecord.platforms.slice(0, compact ? 1 : 2).map((platform) => (
              <Badge key={platform}>{platform}</Badge>
            ))}
          </div>
          <div className="space-y-1">
            <Link
              href={localizeHref(locale, `/app/library/${promptRecord.id}`)}
              className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)] transition group-hover:text-[var(--accent-strong)] md:text-xl"
            >
              {promptRecord.title}
            </Link>
            <p className={cn("text-sm leading-6 text-[var(--text-secondary)]", compact && "line-clamp-2")}>
              {promptRecord.summary}
            </p>
          </div>
        </div>

        <Button
          aria-label={t("common.favorite")}
          className="h-11 w-11 px-0"
          onClick={() => toggleFavorite(promptRecord.id)}
          size="sm"
          variant={promptRecord.isFavorite ? "primary" : "secondary"}
        >
          <Heart className={cn("h-4 w-4", promptRecord.isFavorite && "fill-current")} />
        </Button>
      </div>

      {!compact ? (
        <p className="line-clamp-4 text-sm leading-7 text-[var(--text-secondary)]">{promptRecord.body}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {collection ? <Badge>{collection.name}</Badge> : null}
        {tags.slice(0, compact ? 2 : 4).map((tag) => (
          <Badge key={tag}>#{tag}</Badge>
        ))}
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--border)] pt-4 md:flex-row md:items-center md:justify-between">
        <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
          v{promptRecord.latestVersionNumber} / {formatDate(promptRecord.updatedAt, locale)}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button className="min-h-10" onClick={onCopy} size="sm" variant="secondary">
            <Copy className="h-4 w-4" />
            {t("common.copy")}
          </Button>
          <Link href={localizeHref(locale, `/app/editor/${promptRecord.id}`)}>
            <Button className="min-h-10" size="sm" variant="ghost">
              <Pencil className="h-4 w-4" />
              {t("common.edit")}
            </Button>
          </Link>
          <Button className="min-h-10" onClick={() => duplicatePrompt(promptRecord.id)} size="sm" variant="ghost">
            <Repeat2 className="h-4 w-4" />
            {t("common.duplicate")}
          </Button>
          <Button className="min-h-10" onClick={() => toggleArchive(promptRecord.id)} size="sm" variant="ghost">
            <Vault className="h-4 w-4" />
            {t("common.archive")}
          </Button>
        </div>
      </div>
    </Surface>
  );
}
