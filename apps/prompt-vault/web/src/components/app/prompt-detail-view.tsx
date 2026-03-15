"use client";

import Link from "next/link";
import { Copy, Heart, Pencil, Repeat2 } from "lucide-react";
import { PromptAIPanel } from "@/components/app/prompt-ai-panel";
import { PageHeader } from "@/components/app/page-header";
import { Badge, Button, EmptyState, SectionHeading, Surface } from "@/components/ui/primitives";
import { formatDate } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { getPromptVersions } from "@/lib/vault-utils";
import { useLocaleContext } from "@/providers/locale-provider";
import { useToast } from "@/providers/toast-provider";
import { useVault } from "@/providers/vault-provider";

export function PromptDetailView({ promptId }: { promptId: string }) {
  const { dataset, toggleFavorite, duplicatePrompt, upsertPrompt } = useVault();
  const { locale, t } = useLocaleContext();
  const { notify } = useToast();
  const prompt = dataset.prompts.find((item) => item.id === promptId);

  if (!prompt) {
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

  const promptRecord = prompt;
  const versions = getPromptVersions(dataset, prompt.id);
  const category = dataset.categories.find((item) => item.id === prompt.categoryId);
  const collection = dataset.collections.find((item) => item.id === prompt.collectionId);
  const tags = prompt.tagIds
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
    upsertPrompt(
      {
        id: promptRecord.id,
        title: update.title ?? promptRecord.title,
        body: update.body ?? promptRecord.body,
        summary: update.summary ?? promptRecord.summary ?? "",
        notes: update.notes ?? promptRecord.notes ?? "",
        resultNotes: promptRecord.resultNotes ?? "",
        recommendedVariations: promptRecord.recommendedVariations ?? "",
        categoryId: update.categoryId ?? promptRecord.categoryId,
        collectionId: promptRecord.collectionId ?? "",
        type: promptRecord.type,
        language: promptRecord.language === "tr" ? "tr" : "en",
        platforms: update.platforms ?? promptRecord.platforms,
        tagNames: update.tags ?? tags,
        isFavorite: promptRecord.isFavorite,
        isArchived: promptRecord.isArchived,
        isPinned: promptRecord.isPinned,
        status: promptRecord.status,
        rating: promptRecord.rating,
        sourceUrl: promptRecord.sourceUrl ?? "",
        sourceLabel: promptRecord.sourceLabel ?? "",
        variables: promptRecord.variables
      },
      promptRecord.id
    );
    notify(t("app.aiVersionCreated"));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={promptRecord.title}
        subtitle={promptRecord.summary ?? promptRecord.body.slice(0, 140)}
        actions={
          <>
            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(promptRecord.body);
                notify(t("app.promptCopied"));
              }}
              variant="secondary"
            >
              <Copy className="h-4 w-4" />
              {t("common.copy")}
            </Button>
            <Button onClick={() => toggleFavorite(promptRecord.id)} variant={promptRecord.isFavorite ? "primary" : "secondary"}>
              <Heart className="h-4 w-4" />
              {t("common.favorite")}
            </Button>
            <Button onClick={() => duplicatePrompt(promptRecord.id)} variant="secondary">
              <Repeat2 className="h-4 w-4" />
              {t("common.duplicate")}
            </Button>
            <Link href={localizeHref(locale, `/app/editor/${promptRecord.id}`)}>
              <Button>
                <Pencil className="h-4 w-4" />
                {t("common.edit")}
              </Button>
            </Link>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <Surface className="space-y-5 p-6">
          <SectionHeading
            eyebrow={category?.label[locale] ?? promptRecord.type}
            title={t("app.detailOverviewTitle")}
            description={t("app.detailOverviewDescription")}
          />
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent">{category?.label[locale] ?? promptRecord.type}</Badge>
            {collection ? <Badge>{collection.name}</Badge> : null}
            {promptRecord.platforms.map((platform) => (
              <Badge key={platform}>{platform}</Badge>
            ))}
          </div>
          <div className="rounded-[28px] border border-[var(--border)] bg-[var(--background-elevated)] p-5">
            <pre className="whitespace-pre-wrap font-mono text-sm leading-7 text-[var(--text-primary)]">
              {promptRecord.body}
            </pre>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Surface className="space-y-3 p-4">
              <div className="text-sm font-semibold text-[var(--text-primary)]">{t("app.notes")}</div>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                {promptRecord.notes || t("app.noInternalNotesYet")}
              </p>
            </Surface>
            <Surface className="space-y-3 p-4">
              <div className="text-sm font-semibold text-[var(--text-primary)]">{t("app.resultNotes")}</div>
              <p className="text-sm leading-7 text-[var(--text-secondary)]">
                {promptRecord.resultNotes || t("app.noResultNotesYet")}
              </p>
            </Surface>
          </div>
        </Surface>
        <div className="space-y-6">
          <Surface className="space-y-4 p-5">
            <SectionHeading
              eyebrow={t("common.prompt")}
              title={t("app.detailOverviewTitle")}
              description={t("app.detailOverviewDescription")}
            />
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2.5">
                <span className="text-sm text-[var(--text-secondary)]">{t("app.collection")}</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {collection?.name ?? t("app.noCollection")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2.5">
                <span className="text-sm text-[var(--text-secondary)]">{t("common.language")}</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {promptRecord.language === "tr" ? t("settings.languageTurkish") : t("settings.languageEnglish")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2.5">
                <span className="text-sm text-[var(--text-secondary)]">{t("app.status")}</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {promptRecord.status === "draft"
                    ? t("app.statusDraft")
                    : promptRecord.status === "active"
                      ? t("app.statusActive")
                      : promptRecord.status === "reviewed"
                        ? t("app.statusReviewed")
                        : t("app.statusArchived")}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[var(--border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-2.5">
                <span className="text-sm text-[var(--text-secondary)]">{t("app.updatedAt")}</span>
                <span className="text-sm font-medium text-[var(--text-primary)]">
                  {formatDate(promptRecord.updatedAt, locale)}
                </span>
              </div>
              {promptRecord.sourceLabel || promptRecord.sourceUrl ? (
                <div className="rounded-[18px] border border-[var(--border)] bg-[color:rgba(255,255,255,0.02)] px-3 py-3">
                  <div className="text-sm text-[var(--text-secondary)]">{t("app.source")}</div>
                  <div className="mt-1 text-sm font-medium text-[var(--text-primary)]">
                    {promptRecord.sourceLabel || promptRecord.sourceUrl}
                  </div>
                </div>
              ) : null}
            </div>
          </Surface>
          <PromptAIPanel
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
              promptId: promptRecord.id,
              title: promptRecord.title,
              body: promptRecord.body,
              summary: promptRecord.summary,
              notes: promptRecord.notes,
              resultNotes: promptRecord.resultNotes,
              categoryId: promptRecord.categoryId,
              collectionId: promptRecord.collectionId,
              language: promptRecord.language === "tr" ? "tr" : "en",
              type: promptRecord.type,
              platforms: promptRecord.platforms,
              tagNames: tags,
              variables: promptRecord.variables
            }}
            promptId={promptRecord.id}
          />
          <Surface className="space-y-4 p-5">
            <SectionHeading
              title={t("app.versionHistory")}
              description={t("app.versionHistoryDescription")}
            />
            <div className="space-y-3">
              {versions.map((version) => (
                <div key={version.id} className="rounded-3xl border border-[var(--border)] p-4">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-[var(--text-primary)]">v{version.versionNumber}</div>
                    <div className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                      {formatDate(version.createdAt, locale)}
                    </div>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">
                    {version.summary || t("app.noSummarySupplied")}
                  </p>
                </div>
              ))}
            </div>
          </Surface>
          <Surface className="space-y-4 p-5">
            <SectionHeading
              title={t("app.variables")}
              description={t("app.variablesDescription")}
            />
            {promptRecord.variables.length > 0 ? (
              <div className="space-y-3">
                {promptRecord.variables.map((variable) => (
                  <div key={variable.id} className="rounded-3xl border border-[var(--border)] p-4">
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
              <p className="text-sm text-[var(--text-secondary)]">{t("app.noVariablesDefinedYet")}</p>
            )}
          </Surface>
          <Surface className="space-y-4 p-5">
            <SectionHeading title={t("app.tags")} description={t("app.tagsDescription")} />
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge key={tag}>#{tag}</Badge>
              ))}
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
