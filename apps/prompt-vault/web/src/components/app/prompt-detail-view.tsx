"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronDown, Copy, Heart, Pencil, RotateCcw } from "lucide-react";
import { PromptAIPanel } from "@/components/app/prompt-ai-panel";
import { Badge, Button, EmptyState } from "@/components/ui/primitives";
import { getEntries, getProjects } from "@/lib/dataset";
import { formatDate } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { getPromptVersions } from "@/lib/vault-utils";
import { useLocaleContext } from "@/providers/locale-provider";
import { useToast } from "@/providers/toast-provider";
import { useVault } from "@/providers/vault-provider";

function Collapsible({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
      <button
        className="flex w-full items-center justify-between px-4 py-3 text-left"
        onClick={() => setOpen((c) => !c)}
        type="button"
      >
        <span className="text-sm font-medium text-[var(--text-primary)]">{title}</span>
        <ChevronDown className={`h-4 w-4 text-[var(--text-tertiary)] transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open ? <div className="border-t border-[var(--border)] px-4 py-4">{children}</div> : null}
    </div>
  );
}

function versionSourceLabel(source: string, locale: "en" | "tr") {
  if (source === "manual") return locale === "tr" ? "Manuel" : "Manual";
  if (source === "autosave") return locale === "tr" ? "Otomatik" : "Autosave";
  if (source === "restore") return locale === "tr" ? "Geri yükleme" : "Restore";
  if (source === "ai_refine") return locale === "tr" ? "AI düzenleme" : "AI refine";
  if (source === "duplicate") return locale === "tr" ? "Kopya" : "Duplicate";
  if (source === "merge") return locale === "tr" ? "Birleştirme" : "Merge";
  return source;
}

export function PromptDetailView({ promptId }: { promptId: string }) {
  const { dataset, toggleFavorite, duplicateEntry, restoreVersion, upsertEntry } = useVault();
  const { locale, t } = useLocaleContext();
  const { notify } = useToast();
  const entry = getEntries(dataset).find((item) => item.id === promptId);

  if (!entry) {
    return (
      <EmptyState
        action={<Link href={localizeHref(locale, "/app/library")}><Button>{t("common.library")}</Button></Link>}
        description={t("app.emptyStateDescription")}
        title={t("app.emptyStateTitle")}
      />
    );
  }

  const entryRecord = entry;
  const versions = getPromptVersions(dataset, entryRecord.id);
  const category = dataset.categories.find((c) => c.id === entryRecord.categoryId);
  const project = getProjects(dataset).find((p) => p.id === (entryRecord.projectId ?? entryRecord.collectionId));
  const tags = entryRecord.tagIds.map((id) => dataset.tags.find((t) => t.id === id)?.name).filter(Boolean) as string[];

  function createVersionFromAI(update: { title?: string; summary?: string; body?: string; categoryId?: string; tags?: string[]; platforms?: string[]; notes?: string }) {
    upsertEntry({
      id: entryRecord.id, title: update.title ?? entryRecord.title, body: update.body ?? entryRecord.body,
      summary: update.summary ?? entryRecord.summary ?? "", notes: update.notes ?? entryRecord.notes ?? "",
      resultNotes: entryRecord.resultNotes ?? "", recommendedVariations: entryRecord.recommendedVariations ?? "",
      categoryId: update.categoryId ?? entryRecord.categoryId,
      projectId: entryRecord.projectId ?? entryRecord.collectionId ?? "",
      collectionId: entryRecord.projectId ?? entryRecord.collectionId ?? "",
      type: entryRecord.type, language: entryRecord.language === "tr" ? "tr" : "en",
      platforms: update.platforms ?? entryRecord.platforms,
      tagNames: update.tags ?? tags,
      isFavorite: entryRecord.isFavorite, isArchived: entryRecord.isArchived, isPinned: entryRecord.isPinned,
      status: entryRecord.status, rating: entryRecord.rating,
      sourceUrl: entryRecord.sourceUrl ?? "", sourceLabel: entryRecord.sourceLabel ?? "",
      variables: entryRecord.variables,
    }, entryRecord.id, { source: "ai_refine", changeSummary: locale === "tr" ? "AI önerisi uygulandı." : "Applied AI refinement." });
    notify(t("app.aiVersionCreated"));
  }

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col gap-6 py-2">
      {/* Meta badges */}
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone="accent">{category?.label[locale] ?? entryRecord.type}</Badge>
        {project ? <Badge>{project.name}</Badge> : null}
        <Badge>{formatDate(entryRecord.updatedAt, locale)}</Badge>
      </div>

      {/* Title */}
      <h1 className="font-display text-[26px] font-bold leading-tight tracking-[-0.04em] text-[var(--text-primary)]">
        {entryRecord.title}
      </h1>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Link href={localizeHref(locale, `/app/editor/${entryRecord.id}`)}>
          <Button size="sm">
            <Pencil className="h-3.5 w-3.5" />
            {t("common.edit")}
          </Button>
        </Link>
        <Button
          onClick={async () => { await navigator.clipboard.writeText(entryRecord.body); notify(t("app.promptCopied")); }}
          size="sm" variant="secondary"
        >
          <Copy className="h-3.5 w-3.5" />
          {t("common.copy")}
        </Button>
        <Button
          onClick={() => toggleFavorite(entryRecord.id)}
          size="sm" variant={entryRecord.isFavorite ? "primary" : "secondary"}
        >
          <Heart className={`h-3.5 w-3.5 ${entryRecord.isFavorite ? "fill-current" : ""}`} />
        </Button>
        <Button onClick={() => duplicateEntry(entryRecord.id)} size="sm" variant="ghost">
          {t("common.duplicate")}
        </Button>
      </div>

      {/* Body — the hero */}
      <div className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5">
        <pre className="whitespace-pre-wrap font-sans text-[15px] leading-7 text-[var(--text-primary)]">
          {entryRecord.body}
        </pre>
      </div>

      {/* Summary */}
      {entryRecord.summary ? (
        <div className="space-y-1">
          <span className="text-xs font-medium uppercase tracking-[0.1em] text-[var(--text-tertiary)]">
            {t("app.summary")}
          </span>
          <p className="text-sm leading-relaxed text-[var(--text-secondary)]">{entryRecord.summary}</p>
        </div>
      ) : null}

      {/* Metadata */}
      <Collapsible defaultOpen title={locale === "tr" ? "Detaylar" : "Details"}>
        <div className="space-y-2">
          <MetaRow label={t("app.project")} value={project?.name ?? t("app.noProject")} />
          <MetaRow label={t("common.language")} value={entryRecord.language === "tr" ? t("settings.languageTurkish") : t("settings.languageEnglish")} />
          <MetaRow label={t("app.status")} value={entryRecord.status === "draft" ? t("app.statusDraft") : entryRecord.status === "active" ? t("app.statusActive") : entryRecord.status === "reviewed" ? t("app.statusReviewed") : t("app.statusArchived")} />
          {entryRecord.sourceLabel || entryRecord.sourceUrl ? (
            <MetaRow label={t("app.source")} value={entryRecord.sourceLabel || entryRecord.sourceUrl || ""} />
          ) : null}
          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tags.map((tag) => <Badge key={tag}>#{tag}</Badge>)}
            </div>
          ) : null}
        </div>
      </Collapsible>

      {/* Notes */}
      {(entryRecord.notes || entryRecord.resultNotes) ? (
        <Collapsible title={locale === "tr" ? "Notlar" : "Notes"}>
          <div className="space-y-3">
            {entryRecord.notes ? (
              <div>
                <span className="text-xs font-medium text-[var(--text-tertiary)]">{t("app.notes")}</span>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{entryRecord.notes}</p>
              </div>
            ) : null}
            {entryRecord.resultNotes ? (
              <div>
                <span className="text-xs font-medium text-[var(--text-tertiary)]">{t("app.resultNotes")}</span>
                <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">{entryRecord.resultNotes}</p>
              </div>
            ) : null}
          </div>
        </Collapsible>
      ) : null}

      {/* Version history */}
      <Collapsible title={`${t("app.versionHistory")} (${versions.length})`}>
        <div className="space-y-2">
          {versions.map((version) => (
            <div key={version.id} className="vault-row flex-col items-start gap-2 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[var(--text-primary)]">v{version.versionNumber}</span>
                  <Badge>{versionSourceLabel(version.source, locale)}</Badge>
                </div>
                <p className="mt-0.5 text-xs text-[var(--text-tertiary)]">
                  {version.changeSummary || version.summary || t("app.noSummarySupplied")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[var(--text-tertiary)]">{formatDate(version.createdAt, locale)}</span>
                {version.id !== entryRecord.latestVersionId ? (
                  <Button onClick={() => restoreVersion(entryRecord.id, version.id)} size="sm" variant="secondary">
                    <RotateCcw className="h-3 w-3" />
                    {locale === "tr" ? "Geri dön" : "Restore"}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </Collapsible>

      {/* Variables */}
      {entryRecord.variables.length > 0 ? (
        <Collapsible title={t("app.variables")}>
          <div className="space-y-2">
            {entryRecord.variables.map((v) => (
              <div key={v.id} className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface-strong)] p-3">
                <span className="font-mono text-xs text-[var(--accent)]">{`{${v.key}}`}</span>
                <div className="text-sm text-[var(--text-primary)]">{v.label}</div>
                {v.defaultValue ? <div className="text-xs text-[var(--text-tertiary)]">{t("app.defaultLabel")}: {v.defaultValue}</div> : null}
              </div>
            ))}
          </div>
        </Collapsible>
      ) : null}

      {/* AI Panel */}
      <PromptAIPanel
        collapsedByDefault
        handlers={{
          onApplyTitle: (title) => createVersionFromAI({ title }),
          onApplyCategory: (categoryId) => createVersionFromAI({ categoryId }),
          onApplyTags: (tagNames) => createVersionFromAI({ tags: tagNames }),
          onApplyPlatforms: (platforms) => createVersionFromAI({ platforms }),
          onApplySummary: (summary) => createVersionFromAI({ summary }),
          onApplyRewrite: (payload) => createVersionFromAI({ body: payload.body, summary: payload.summary, notes: payload.notes }),
        }}
        prompt={{
          promptId: entryRecord.id, title: entryRecord.title, body: entryRecord.body,
          summary: entryRecord.summary, notes: entryRecord.notes, resultNotes: entryRecord.resultNotes,
          categoryId: entryRecord.categoryId,
          projectId: entryRecord.projectId ?? entryRecord.collectionId,
          collectionId: entryRecord.projectId ?? entryRecord.collectionId,
          language: entryRecord.language === "tr" ? "tr" : "en",
          type: entryRecord.type, platforms: entryRecord.platforms,
          tagNames: tags, variables: entryRecord.variables,
        }}
        promptId={entryRecord.id}
      />
    </div>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs text-[var(--text-tertiary)]">{label}</span>
      <span className="text-sm font-medium text-[var(--text-primary)]">{value}</span>
    </div>
  );
}
