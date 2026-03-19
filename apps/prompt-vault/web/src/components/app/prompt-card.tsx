"use client";

import Link from "next/link";
import { Copy, Heart, Pencil, Repeat2, Vault } from "lucide-react";
import { Badge, Button, Surface } from "@/components/ui/primitives";
import { getEntries, getProjects } from "@/lib/dataset";
import { formatDate, formatRelative } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { cn } from "@/lib/cn";
import { useLocaleContext } from "@/providers/locale-provider";
import { useToast } from "@/providers/toast-provider";
import { useVault } from "@/providers/vault-provider";

export function PromptCard({
  promptId,
  compact = false
}: {
  promptId: string;
  compact?: boolean;
}) {
  const { dataset, toggleArchive, toggleFavorite, duplicateEntry } = useVault();
  const { notify } = useToast();
  const { locale, t } = useLocaleContext();
  const entry = getEntries(dataset).find((item) => item.id === promptId);

  if (!entry) {
    return null;
  }

  const entryRecord = entry;

  const category = dataset.categories.find((item) => item.id === entryRecord.categoryId);
  const project = getProjects(dataset).find(
    (item) => item.id === (entryRecord.projectId ?? entryRecord.collectionId)
  );
  const tags = entryRecord.tagIds
    .map((tagId) => dataset.tags.find((tag) => tag.id === tagId)?.name)
    .filter(Boolean) as string[];

  async function onCopy() {
    await navigator.clipboard.writeText(entryRecord.body);
    notify(t("app.promptCopied"));
  }

  if (compact) {
    return (
      <Link href={localizeHref(locale, `/app/library/${entryRecord.id}`)}>
        <Surface className="space-y-3 rounded-[18px] bg-[rgba(24,23,22,0.96)] p-4 transition duration-200 hover:border-[var(--border-strong)] hover:bg-[rgba(30,29,28,0.98)]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="truncate text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                {project?.name ?? category?.label[locale] ?? entryRecord.type}
              </div>
              <div className="mt-1 truncate text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                {entryRecord.title}
              </div>
            </div>
            <div className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
              {formatRelative(entryRecord.updatedAt, locale)}
            </div>
          </div>

          <p className="line-clamp-2 text-sm leading-6 text-[var(--text-secondary)]">
            {entryRecord.summary || entryRecord.body}
          </p>

          <div className="flex items-center gap-2">
            {entryRecord.isFavorite ? <Badge tone="accent">{t("common.favorite")}</Badge> : null}
            {tags[0] ? <Badge>#{tags[0]}</Badge> : null}
          </div>
        </Surface>
      </Link>
    );
  }

  return (
    <Surface className="space-y-5 rounded-[22px] bg-[rgba(28,27,27,0.96)] p-5 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {project ? <Badge>{project.name}</Badge> : null}
            <Badge tone="accent">{category?.label[locale] ?? entryRecord.type}</Badge>
            <Badge>{formatDate(entryRecord.updatedAt, locale)}</Badge>
          </div>
          <div className="space-y-2">
            <Link
              href={localizeHref(locale, `/app/library/${entryRecord.id}`)}
              className="font-display text-2xl font-extrabold tracking-[-0.05em] text-[var(--text-primary)]"
            >
              {entryRecord.title}
            </Link>
            <p className="text-sm leading-7 text-[var(--text-secondary)]">
              {entryRecord.summary || entryRecord.body}
            </p>
          </div>
        </div>

        <button
          aria-label={t("common.favorite")}
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition active:scale-95",
            entryRecord.isFavorite
              ? "border-[rgba(242,202,80,0.3)] bg-[rgba(242,202,80,0.14)] text-[var(--accent-strong)]"
              : "border-[var(--border)] bg-[var(--surface-strong)] text-[var(--text-secondary)]"
          )}
          onClick={() => toggleFavorite(entryRecord.id)}
          type="button"
        >
          <Heart className={cn("h-4 w-4", entryRecord.isFavorite && "fill-current")} />
        </button>
      </div>

      <div className="rounded-[18px] border border-[var(--border)] bg-[rgba(14,14,14,0.7)] px-4 py-4 text-sm leading-7 text-[var(--text-secondary)]">
        {entryRecord.body}
      </div>

      <div className="flex flex-wrap gap-2">
        {entryRecord.platforms.map((platform) => (
          <span
            key={platform}
            className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]"
          >
            {platform}
          </span>
        ))}
        {tags.slice(0, 4).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-[var(--surface-muted)] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]"
          >
            #{tag}
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-4">
        <Button className="min-h-10" onClick={onCopy} size="sm" variant="secondary">
          <Copy className="h-4 w-4" />
          {t("common.copy")}
        </Button>
        <Link href={localizeHref(locale, `/app/editor/${entryRecord.id}`)}>
          <Button className="min-h-10" size="sm" variant="ghost">
            <Pencil className="h-4 w-4" />
            {t("common.edit")}
          </Button>
        </Link>
        <Button className="min-h-10" onClick={() => duplicateEntry(entryRecord.id)} size="sm" variant="ghost">
          <Repeat2 className="h-4 w-4" />
          {t("common.duplicate")}
        </Button>
        <Button className="min-h-10" onClick={() => toggleArchive(entryRecord.id)} size="sm" variant="ghost">
          <Vault className="h-4 w-4" />
          {t("common.archive")}
        </Button>
      </div>
    </Surface>
  );
}
