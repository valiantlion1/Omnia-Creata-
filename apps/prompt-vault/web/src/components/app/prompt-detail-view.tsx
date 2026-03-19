"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { ChevronDown, Copy, Heart, Pencil, Repeat2, RotateCcw } from "lucide-react";
import { PromptAIPanel } from "@/components/app/prompt-ai-panel";
import { Badge, Button, EmptyState, Surface } from "@/components/ui/primitives";
import { getEntries, getProjects } from "@/lib/dataset";
import { formatDate } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { getPromptVersions } from "@/lib/vault-utils";
import { useLocaleContext } from "@/providers/locale-provider";
import { useToast } from "@/providers/toast-provider";
import { useVault } from "@/providers/vault-provider";

function Section({
  title,
  description,
  defaultOpen = false,
  children
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Surface className="rounded-[24px] bg-[rgba(20,20,20,0.9)] p-0">
      <button
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <div className="space-y-1">
          <div className="font-display text-xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
            {title}
          </div>
          {description ? (
            <div className="text-sm leading-6 text-[var(--text-secondary)]">{description}</div>
          ) : null}
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-[var(--text-tertiary)] transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? <div className="border-t border-[var(--border)] px-5 py-5">{children}</div> : null}
    </Surface>
  );
}

function versionSourceLabel(source: string, locale: "en" | "tr") {
  if (source === "manual") return locale === "tr" ? "Manuel" : "Manual";
  if (source === "autosave") return locale === "tr" ? "Otomatik" : "Autosave";
  if (source === "restore") return locale === "tr" ? "Geri yukleme" : "Restore";
  if (source === "ai_refine") return locale === "tr" ? "AI duzenleme" : "AI refine";
  if (source === "duplicate") return locale === "tr" ? "Kopya" : "Duplicate";
  if (source === "merge") return locale === "tr" ? "Birlestirme" : "Merge";
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
        action={
          <Link href={localizeHref(locale, "/app/library")}>
            <Button>{t("common.library")}</Button>
          </Link>
        }
        description={t("app.emptyStateDescription")}
        title={t("app.emptyStateTitle")}
      />
    );
  }

  const entryRecord = entry;
  const versions = getPromptVersions(dataset, entryRecord.id);
  const category = dataset.categories.find((item) => item.id === entryRecord.categoryId);
  const project = getProjects(dataset).find(
    (item) => item.id === (entryRecord.projectId ?? entryRecord.collectionId)
  );
  const tags = entryRecord.tagIds
    .map((tagId) => dataset.tags.find((tag) => tag.id === tagId)?.name)
    .filter(Boolean) as string[];

  function createVersionFromAI(update: {
    title?: string;
    summary?: string;
    body?: string;
    categoryId?: string;
    tags?: string[];
    platforms?: string[];
    notes?: string;
  }) {
    upsertEntry(
      {
        id: entryRecord.id,
        title: update.title ?? entryRecord.title,
        body: update.body ?? entryRecord.body,
        summary: update.summary ?? entryRecord.summary ?? "",
        notes: update.notes ?? entryRecord.notes ?? "",
        resultNotes: entryRecord.resultNotes ?? "",
        recommendedVariations: entryRecord.recommendedVariations ?? "",
        categoryId: update.categoryId ?? entryRecord.categoryId,
        projectId: entryRecord.projectId ?? entryRecord.collectionId ?? "",
        collectionId: entryRecord.projectId ?? entryRecord.collectionId ?? "",
        type: entryRecord.type,
        language: entryRecord.language === "tr" ? "tr" : "en",
        platforms: update.platforms ?? entryRecord.platforms,
        tagNames: update.tags ?? tags,
        isFavorite: entryRecord.isFavorite,
        isArchived: entryRecord.isArchived,
        isPinned: entryRecord.isPinned,
        status: entryRecord.status,
        rating: entryRecord.rating,
        sourceUrl: entryRecord.sourceUrl ?? "",
        sourceLabel: entryRecord.sourceLabel ?? "",
        variables: entryRecord.variables
      },
      entryRecord.id,
      {
        source: "ai_refine",
        changeSummary: locale === "tr" ? "AI onerisi uygulandi." : "Applied AI refinement."
      }
    );
    notify(t("app.aiVersionCreated"));
  }

  return (
    <div className="space-y-8">
      <section className="space-y-5">
        <div className="flex flex-wrap gap-2">
          <Badge tone="accent">{category?.label[locale] ?? entryRecord.type}</Badge>
          {project ? <Badge>{project.name}</Badge> : null}
          <Badge>{formatDate(entryRecord.updatedAt, locale)}</Badge>
        </div>

        <div className="space-y-3">
          <h1 className="font-display text-4xl font-extrabold tracking-[-0.06em] text-[var(--text-primary)]">
            {entryRecord.title}
          </h1>
          <p className="max-w-3xl text-base leading-8 text-[var(--text-secondary)]">
            {entryRecord.summary ?? entryRecord.body.slice(0, 180)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            onClick={async () => {
              await navigator.clipboard.writeText(entryRecord.body);
              notify(t("app.promptCopied"));
            }}
            variant="secondary"
          >
            <Copy className="h-4 w-4" />
            {t("common.copy")}
          </Button>
          <Button
            onClick={() => toggleFavorite(entryRecord.id)}
            variant={entryRecord.isFavorite ? "primary" : "secondary"}
          >
            <Heart className="h-4 w-4" />
            {t("common.favorite")}
          </Button>
          <Button onClick={() => duplicateEntry(entryRecord.id)} variant="secondary">
            <Repeat2 className="h-4 w-4" />
            {t("common.duplicate")}
          </Button>
          <Link href={localizeHref(locale, `/app/editor/${entryRecord.id}`)}>
            <Button>
              <Pencil className="h-4 w-4" />
              {t("common.edit")}
            </Button>
          </Link>
        </div>
      </section>

      <Surface className="rounded-[28px] bg-[rgba(20,20,20,0.94)] p-6 md:p-7">
        <pre className="whitespace-pre-wrap font-body text-[15px] leading-8 text-[var(--text-primary)]">
          {entryRecord.body}
        </pre>
      </Surface>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_360px]">
        <div className="space-y-4">
          <Section
            defaultOpen
            description={t("app.notesWorkspaceDescription")}
            title={t("app.notesWorkspaceTitle")}
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                <div className="mb-2 text-sm font-semibold text-[var(--text-primary)]">{t("app.notes")}</div>
                <p className="text-sm leading-7 text-[var(--text-secondary)]">
                  {entryRecord.notes || t("app.noInternalNotesYet")}
                </p>
              </div>
              <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] p-4">
                <div className="mb-2 text-sm font-semibold text-[var(--text-primary)]">{t("app.resultNotes")}</div>
                <p className="text-sm leading-7 text-[var(--text-secondary)]">
                  {entryRecord.resultNotes || t("app.noResultNotesYet")}
                </p>
              </div>
            </div>
          </Section>

          <Section
            description={t("app.versionHistoryDescription")}
            title={t("app.versionHistory")}
          >
            <div className="space-y-3">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="font-semibold text-[var(--text-primary)]">v{version.versionNumber}</div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{versionSourceLabel(version.source, locale)}</Badge>
                        {version.changeSummary ? <Badge tone="info">{version.changeSummary}</Badge> : null}
                      </div>
                    </div>
                    <div className="space-y-2 text-right">
                      <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                        {formatDate(version.createdAt, locale)}
                      </div>
                      {version.id !== entryRecord.latestVersionId ? (
                        <Button
                          onClick={() => restoreVersion(entryRecord.id, version.id)}
                          size="sm"
                          variant="secondary"
                        >
                          <RotateCcw className="h-4 w-4" />
                          {locale === "tr" ? "Geri don" : "Restore"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {version.summary || t("app.noSummarySupplied")}
                  </p>
                </div>
              ))}
            </div>
          </Section>

          <Section description={t("app.variablesDescription")} title={t("app.variables")}>
            {entryRecord.variables.length > 0 ? (
              <div className="space-y-3">
                {entryRecord.variables.map((variable) => (
                  <div
                    key={variable.id}
                    className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] p-4"
                  >
                    <div className="font-mono text-sm text-[var(--accent)]">{`{${variable.key}}`}</div>
                    <div className="mt-1 text-sm text-[var(--text-primary)]">{variable.label}</div>
                    {variable.defaultValue ? (
                      <div className="mt-1 text-xs text-[var(--text-tertiary)]">
                        {t("app.defaultLabel")}: {variable.defaultValue}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-7 text-[var(--text-secondary)]">{t("app.noVariablesDefinedYet")}</p>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          <Section defaultOpen title={t("app.detailOverviewTitle")}>
            <div className="space-y-3">
              <MetadataRow label={t("app.project")} value={project?.name ?? t("app.noProject")} />
              <MetadataRow
                label={t("common.language")}
                value={
                  entryRecord.language === "tr"
                    ? t("settings.languageTurkish")
                    : t("settings.languageEnglish")
                }
              />
              <MetadataRow
                label={t("app.status")}
                value={
                  entryRecord.status === "draft"
                    ? t("app.statusDraft")
                    : entryRecord.status === "active"
                      ? t("app.statusActive")
                      : entryRecord.status === "reviewed"
                        ? t("app.statusReviewed")
                        : t("app.statusArchived")
                }
              />
              {entryRecord.sourceLabel || entryRecord.sourceUrl ? (
                <MetadataRow
                  label={t("app.source")}
                  value={entryRecord.sourceLabel || entryRecord.sourceUrl || ""}
                />
              ) : null}
            </div>
          </Section>

          <Section description={t("app.tagsDescription")} title={t("app.tags")}>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag}>#{tag}</Badge>
              ))}
            </div>
          </Section>

          <PromptAIPanel
            collapsedByDefault
            handlers={{
              onApplyTitle: (title) => createVersionFromAI({ title }),
              onApplyCategory: (categoryId) => createVersionFromAI({ categoryId }),
              onApplyTags: (tagNames) => createVersionFromAI({ tags: tagNames }),
              onApplyPlatforms: (platforms) => createVersionFromAI({ platforms }),
              onApplySummary: (summary) => createVersionFromAI({ summary }),
              onApplyRewrite: (payload) =>
                createVersionFromAI({
                  body: payload.body,
                  summary: payload.summary,
                  notes: payload.notes
                })
            }}
            prompt={{
              promptId: entryRecord.id,
              title: entryRecord.title,
              body: entryRecord.body,
              summary: entryRecord.summary,
              notes: entryRecord.notes,
              resultNotes: entryRecord.resultNotes,
              categoryId: entryRecord.categoryId,
              projectId: entryRecord.projectId ?? entryRecord.collectionId,
              collectionId: entryRecord.projectId ?? entryRecord.collectionId,
              language: entryRecord.language === "tr" ? "tr" : "en",
              type: entryRecord.type,
              platforms: entryRecord.platforms,
              tagNames: tags,
              variables: entryRecord.variables
            }}
            promptId={entryRecord.id}
          />
        </div>
      </div>
    </div>
  );
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3">
      <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">{label}</div>
      <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">{value}</div>
    </div>
  );
}
