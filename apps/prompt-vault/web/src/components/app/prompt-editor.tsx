"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { platformCatalog } from "@prompt-vault/config";
import { PromptAIPanel } from "@/components/app/prompt-ai-panel";
import { PageHeader } from "@/components/app/page-header";
import {
  Badge,
  Button,
  Field,
  Input,
  SectionHeading,
  Select,
  Surface,
  Textarea
} from "@/components/ui/primitives";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

interface EditorState {
  title: string;
  summary: string;
  body: string;
  notes: string;
  resultNotes: string;
  recommendedVariations: string;
  categoryId: string;
  collectionId: string;
  type:
    | "prompt"
    | "idea"
    | "workflow"
    | "template"
    | "system_prompt"
    | "agent_instruction"
    | "text_block"
    | "note";
  language: "en" | "tr";
  status: "draft" | "active" | "reviewed" | "archived";
  sourceUrl: string;
  sourceLabel: string;
  rating: string;
  tagInput: string;
  variableInput: string;
  platforms: string[];
  isFavorite: boolean;
  isArchived: boolean;
  isPinned: boolean;
}

function emptyState(): EditorState {
  return {
    title: "",
    summary: "",
    body: "",
    notes: "",
    resultNotes: "",
    recommendedVariations: "",
    categoryId: "cat-chat",
    collectionId: "",
    type: "prompt",
    language: "en",
    status: "draft",
    sourceUrl: "",
    sourceLabel: "",
    rating: "",
    tagInput: "",
    variableInput: "",
    platforms: ["generic"],
    isFavorite: false,
    isArchived: false,
    isPinned: false
  };
}

export function PromptEditor({ promptId }: { promptId?: string }) {
  const { dataset, upsertPrompt } = useVault();
  const { locale, t } = useLocaleContext();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const existing = promptId ? dataset.prompts.find((prompt) => prompt.id === promptId) : undefined;
  const [form, setForm] = useState<EditorState>(emptyState());

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!existing) {
        setForm(emptyState());
        return;
      }

      const tags = existing.tagIds
        .map((tagId) => dataset.tags.find((tag) => tag.id === tagId)?.name)
        .filter(Boolean)
        .join(", ");
      const variables = existing.variables.map((variable) => variable.key).join(", ");

      setForm({
        title: existing.title,
        summary: existing.summary ?? "",
        body: existing.body,
        notes: existing.notes ?? "",
        resultNotes: existing.resultNotes ?? "",
        recommendedVariations: existing.recommendedVariations ?? "",
        categoryId: existing.categoryId,
        collectionId: existing.collectionId ?? "",
        type: existing.type,
        language: existing.language as "en" | "tr",
        status: existing.status,
        sourceUrl: existing.sourceUrl ?? "",
        sourceLabel: existing.sourceLabel ?? "",
        rating: existing.rating ? String(existing.rating) : "",
        tagInput: tags,
        variableInput: variables,
        platforms: existing.platforms,
        isFavorite: existing.isFavorite,
        isArchived: existing.isArchived,
        isPinned: existing.isPinned
      });
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [dataset.tags, existing]);

  function save() {
    startTransition(() => {
      const savedId = upsertPrompt(
        {
          ...form,
          rating: form.rating ? Number(form.rating) : undefined,
          tagNames: form.tagInput
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          variables: form.variableInput
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean)
            .map((key) => ({
              id: `var-${key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
              key,
              label: key.replace(/_/g, " ")
            }))
        },
        existing?.id
      );

      router.push(localizeHref(locale, `/app/library/${savedId}`));
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("app.editorTitle")}
        subtitle={t("app.editorSubtitle")}
        actions={
          <>
            <Link href={localizeHref(locale, "/app/library")}>
              <Button variant="ghost">{t("common.cancel")}</Button>
            </Link>
            <Button disabled={pending} onClick={save}>
              {pending ? t("common.saving") : t("common.save")}
            </Button>
          </>
        }
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_360px]">
        <div className="space-y-6">
          <Surface className="space-y-5 p-6">
            <SectionHeading
              eyebrow={t("app.editorTitle")}
              title={t("app.editorWorkspaceTitle")}
              description={t("app.editorWorkspaceDescription")}
            />
            <div className="flex flex-wrap gap-2">
              <Badge tone="accent">
                {form.type === "prompt"
                  ? t("common.prompt")
                  : form.type === "idea"
                    ? t("common.idea")
                    : form.type === "workflow"
                      ? t("common.workflow")
                      : form.type === "template"
                        ? t("common.template")
                        : form.type === "system_prompt"
                          ? t("app.typeSystemPrompt")
                          : form.type === "agent_instruction"
                            ? t("app.typeAgentInstruction")
                            : form.type === "text_block"
                              ? t("app.typeTextBlock")
                              : t("app.typeNote")}
              </Badge>
              <Badge>{form.language === "tr" ? t("settings.languageTurkish") : t("settings.languageEnglish")}</Badge>
              <Badge>{form.status === "draft" ? t("app.statusDraft") : form.status === "active" ? t("app.statusActive") : form.status === "reviewed" ? t("app.statusReviewed") : t("app.statusArchived")}</Badge>
            </div>
            <Field label={t("app.titleField")}>
              <Input onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} value={form.title} />
            </Field>
            <Field label={t("app.summary")}>
              <Input onChange={(event) => setForm((current) => ({ ...current, summary: event.target.value }))} value={form.summary} />
            </Field>
            <Field label={t("app.body")} hint={t("app.versionHint")}>
              <Textarea
                className="min-h-[420px] font-mono text-[13px] leading-7"
                onChange={(event) => setForm((current) => ({ ...current, body: event.target.value }))}
                value={form.body}
              />
            </Field>
          </Surface>
          <Surface className="space-y-4 p-6">
            <SectionHeading
              title={t("app.notesWorkspaceTitle")}
              description={t("app.notesWorkspaceDescription")}
            />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={t("app.notes")}>
                <Textarea
                  className="min-h-[180px]"
                  onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
                  value={form.notes}
                />
              </Field>
              <Field label={t("app.resultNotes")}>
                <Textarea
                  className="min-h-[180px]"
                  onChange={(event) => setForm((current) => ({ ...current, resultNotes: event.target.value }))}
                  value={form.resultNotes}
                />
              </Field>
            </div>
          </Surface>
        </div>
        <div className="space-y-6 xl:sticky xl:top-4 xl:self-start">
          <PromptAIPanel
            handlers={{
              onApplyTitle: (title) => setForm((current) => ({ ...current, title })),
              onApplyCategory: (categoryId) => setForm((current) => ({ ...current, categoryId })),
              onApplyTags: (tags) =>
                setForm((current) => ({
                  ...current,
                  tagInput: tags.join(", ")
                })),
              onApplyPlatforms: (platforms) =>
                setForm((current) => ({
                  ...current,
                  platforms
                })),
              onApplySummary: (summary) => setForm((current) => ({ ...current, summary })),
              onApplyRewrite: (payload) =>
                setForm((current) => ({
                  ...current,
                  body: payload.body,
                  summary: payload.summary ?? current.summary,
                  notes: payload.notes ?? current.notes
                }))
            }}
            prompt={{
              promptId,
              title: form.title,
              body: form.body,
              summary: form.summary,
              notes: form.notes,
              resultNotes: form.resultNotes,
              categoryId: form.categoryId,
              collectionId: form.collectionId,
              language: form.language,
              type: form.type,
              platforms: form.platforms,
              tagNames: form.tagInput
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean),
              variables: form.variableInput
                .split(",")
                .map((item) => item.trim())
                .filter(Boolean)
                .map((key) => ({
                  id: `var-${key.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
                  key,
                  label: key.replace(/_/g, " ")
                }))
            }}
          />
          <Surface className="space-y-4 p-5">
            <SectionHeading
              title={t("app.editorMetaTitle")}
              description={t("app.editorMetaDescription")}
            />
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
              <Field label={t("app.category")}>
                <Select
                  onChange={(event) => setForm((current) => ({ ...current, categoryId: event.target.value }))}
                  value={form.categoryId}
                >
                  {dataset.categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.label[locale]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("app.collection")}>
                <Select
                  onChange={(event) => setForm((current) => ({ ...current, collectionId: event.target.value }))}
                  value={form.collectionId}
                >
                  <option value="">{t("app.noCollection")}</option>
                  {dataset.collections.map((collection) => (
                    <option key={collection.id} value={collection.id}>
                      {collection.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label={t("app.type")}>
                <Select
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      type: event.target.value as EditorState["type"]
                    }))
                  }
                  value={form.type}
                >
                  <option value="prompt">{t("common.prompt")}</option>
                  <option value="idea">{t("common.idea")}</option>
                  <option value="workflow">{t("common.workflow")}</option>
                  <option value="template">{t("common.template")}</option>
                  <option value="system_prompt">{t("app.typeSystemPrompt")}</option>
                  <option value="agent_instruction">{t("app.typeAgentInstruction")}</option>
                  <option value="text_block">{t("app.typeTextBlock")}</option>
                  <option value="note">{t("app.typeNote")}</option>
                </Select>
              </Field>
              <Field label={t("app.status")}>
                <Select
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      status: event.target.value as EditorState["status"]
                    }))
                  }
                  value={form.status}
                >
                  <option value="draft">{t("app.statusDraft")}</option>
                  <option value="active">{t("app.statusActive")}</option>
                  <option value="reviewed">{t("app.statusReviewed")}</option>
                  <option value="archived">{t("app.statusArchived")}</option>
                </Select>
              </Field>
              <Field label={t("common.language")}>
                <Select
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      language: event.target.value as "en" | "tr"
                    }))
                  }
                  value={form.language}
                >
                  <option value="en">{t("settings.languageEnglish")}</option>
                  <option value="tr">{t("settings.languageTurkish")}</option>
                </Select>
              </Field>
              <Field label={t("app.rating")}>
                <Select onChange={(event) => setForm((current) => ({ ...current, rating: event.target.value }))} value={form.rating}>
                  <option value="">{t("app.noRating")}</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4</option>
                  <option value="5">5</option>
                </Select>
              </Field>
            </div>
          </Surface>
          <Surface className="space-y-4 p-5">
            <SectionHeading
              title={t("app.promptSystemTitle")}
              description={t("app.promptSystemDescription")}
            />
            <Field label={t("app.tags")} hint={t("app.tagsHint")}>
              <Input onChange={(event) => setForm((current) => ({ ...current, tagInput: event.target.value }))} value={form.tagInput} />
            </Field>
            <Field label={t("app.variables")} hint={t("app.variablesHint")}>
              <Input onChange={(event) => setForm((current) => ({ ...current, variableInput: event.target.value }))} value={form.variableInput} />
            </Field>
            <Field label={t("app.platforms")}>
              <div className="flex flex-wrap gap-2">
                {platformCatalog.map((platform) => {
                  const active = form.platforms.includes(platform.key);
                  return (
                    <button
                      key={platform.id}
                      className={`min-h-11 rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                        active
                          ? "border-[color:rgba(214,177,91,0.55)] bg-[var(--accent)] text-[var(--accent-foreground)] shadow-[var(--shadow-soft)]"
                          : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:border-[var(--border-strong)] hover:text-[var(--text-primary)]"
                      }`}
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          platforms: active
                            ? current.platforms.filter((item) => item !== platform.key)
                            : [...current.platforms, platform.key]
                        }))
                      }
                      type="button"
                    >
                      {platform.label[locale]}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label={t("app.sourceLabel")}>
              <Input onChange={(event) => setForm((current) => ({ ...current, sourceLabel: event.target.value }))} value={form.sourceLabel} />
            </Field>
            <Field label={t("app.sourceUrl")}>
              <Input onChange={(event) => setForm((current) => ({ ...current, sourceUrl: event.target.value }))} value={form.sourceUrl} />
            </Field>
          </Surface>
        </div>
      </div>
    </div>
  );
}
