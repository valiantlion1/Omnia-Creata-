"use client";

import { entryTypes, type PromptVariableDefinition } from "@prompt-vault/types";
import { ChevronDown, ChevronUp, Layers3, Sparkles, Wand2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PromptAIPanel } from "@/components/app/prompt-ai-panel";
import { Badge, Button, EmptyState, Field, Input, Select, Surface, Textarea } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { getEntries, getProjects } from "@/lib/dataset";
import { formatDate } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useToast } from "@/providers/toast-provider";
import { useVault } from "@/providers/vault-provider";

type EditorMode = "capture" | "editor";
type DraftStateBadge = "restored" | "autosaved";
type DraftComparable = {
  title: string;
  body: string;
  summary: string;
  notes: string;
  resultNotes: string;
  categoryId: string;
  projectId: string;
  type: string;
  language: string;
  platforms: string[];
  tagIds: string[];
  variables: Array<Pick<PromptVariableDefinition, "key" | "label" | "defaultValue" | "required">>;
  sourceLabel: string;
  sourceUrl: string;
  status: string;
  rating: string;
};

const PRIORITY_TYPES = ["idea", "prompt", "note", "workflow"] as const;

function typeLabel(value: string, t: (path: string) => string, locale: "en" | "tr") {
  if (value === "prompt") return t("common.prompt");
  if (value === "idea") return t("common.idea");
  if (value === "workflow") return t("common.workflow");
  if (value === "template") return t("common.template");
  if (value === "system_prompt") return t("app.typeSystemPrompt");
  if (value === "agent_instruction") return t("app.typeAgentInstruction");
  if (value === "text_block") return t("app.typeTextBlock");
  if (value === "note") return t("app.typeNote");

  return locale === "tr"
    ? value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())
    : value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function normalizeList(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function keyToLabel(key: string) {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function buildVariableDefinitions(
  input: string,
  seed: PromptVariableDefinition[]
): PromptVariableDefinition[] {
  const map = new Map(seed.map((variable) => [variable.key, variable]));

  return normalizeList(input).map((key) => {
    const existing = map.get(key);
    if (existing) {
      return existing;
    }

    return {
      id: `var-${crypto.randomUUID()}`,
      key,
      label: keyToLabel(key)
    };
  });
}

function draftTagIdToLabel(tagId: string, knownTags: Array<{ id: string; name: string }>) {
  return (
    knownTags.find((tag) => tag.id === tagId)?.name ??
    tagId.replace(/^tag-/, "").replace(/-/g, " ")
  );
}

function serializeDraftComparable(input: DraftComparable) {
  return JSON.stringify({
    ...input,
    platforms: [...input.platforms].sort(),
    tagIds: [...input.tagIds].sort(),
    variables: [...input.variables]
      .map((variable) => ({
        key: variable.key,
        label: variable.label,
        defaultValue: variable.defaultValue ?? "",
        required: Boolean(variable.required)
      }))
      .sort((left, right) => left.key.localeCompare(right.key))
  });
}

export function PromptEditor({
  promptId,
  mode = "editor"
}: {
  promptId?: string;
  mode?: EditorMode;
}) {
  const router = useRouter();
  const { dataset, discardDraft, isReady, saveDraft, upsertEntry } = useVault();
  const { locale, t } = useLocaleContext();
  const { notify } = useToast();

  const entries = getEntries(dataset);
  const projects = getProjects(dataset);
  const existingEntry = promptId ? entries.find((item) => item.id === promptId) : undefined;
  const categoryOptions = dataset.categories;
  const platformOptions = dataset.platforms;
  const defaultCategory = categoryOptions.find((item) => item.key === "other")?.id ?? categoryOptions[0]?.id ?? "";
  const defaultPlatform = platformOptions.find((item) => item.key === "generic")?.key ?? platformOptions[0]?.key ?? "";

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [summary, setSummary] = useState("");
  const [notes, setNotes] = useState("");
  const [resultNotes, setResultNotes] = useState("");
  const [type, setType] = useState<(typeof entryTypes)[number]>("idea");
  const [categoryId, setCategoryId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [variableInput, setVariableInput] = useState("");
  const [variableSeed, setVariableSeed] = useState<PromptVariableDefinition[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [sourceLabel, setSourceLabel] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [status, setStatus] = useState<"draft" | "active" | "reviewed" | "archived">("draft");
  const [rating, setRating] = useState("");
  const [focusComposerOpen, setFocusComposerOpen] = useState(false);
  const [advancedSectionOpen, setAdvancedSectionOpen] = useState(mode !== "capture");
  const [isSaving, setIsSaving] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [draftBadge, setDraftBadge] = useState<DraftStateBadge | null>(null);
  const [draftBadgeAt, setDraftBadgeAt] = useState<string | null>(null);

  const activeTypeOptions = useMemo(() => {
    const values = new Set<string>(PRIORITY_TYPES);
    if (existingEntry) {
      values.add(existingEntry.type);
    }

    return entryTypes.filter((item) => values.has(item));
  }, [existingEntry]);

  const activeDraftId = useMemo(() => {
    if (existingEntry) {
      return `draft-entry-${existingEntry.id}`;
    }

    return mode === "capture" ? "draft-capture" : "draft-entry-new";
  }, [existingEntry, mode]);

  const activeDraft = useMemo(
    () =>
      dataset.drafts.find(
        (draft) => draft.id === activeDraftId || (existingEntry && draft.entryId === existingEntry.id)
      ),
    [activeDraftId, dataset.drafts, existingEntry]
  );

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const nextHydratedKey = existingEntry?.id ?? "__new__";
    if (hydratedKey === nextHydratedKey) {
      return;
    }

    const shouldRestoreDraft = Boolean(
      activeDraft &&
        (!existingEntry ||
          new Date(activeDraft.updatedAt).getTime() >= new Date(existingEntry.updatedAt).getTime())
    );

    if (shouldRestoreDraft && activeDraft) {
      setTitle(activeDraft.title);
      setBody(activeDraft.body);
      setSummary(activeDraft.summary ?? "");
      setNotes(activeDraft.notes ?? "");
      setResultNotes(activeDraft.resultNotes ?? "");
      setType(activeDraft.type);
      setCategoryId(activeDraft.categoryId || defaultCategory);
      setProjectId(activeDraft.projectId ?? "");
      setTagInput(
        activeDraft.tagIds
          .map((tagId) => draftTagIdToLabel(tagId, dataset.tags))
          .filter(Boolean)
          .join(", ")
      );
      setVariableSeed(activeDraft.variables);
      setVariableInput(activeDraft.variables.map((variable) => variable.key).join(", "));
      setPlatforms(activeDraft.platforms.length > 0 ? activeDraft.platforms : [defaultPlatform].filter(Boolean));
      setSourceLabel(activeDraft.sourceLabel ?? "");
      setSourceUrl(activeDraft.sourceUrl ?? "");
      setStatus(activeDraft.status ?? "draft");
      setRating(activeDraft.rating ? String(activeDraft.rating) : "");
      setAdvancedSectionOpen(mode !== "capture" || Boolean(activeDraft.projectId || activeDraft.tagIds.length));
      setDraftBadge("restored");
      setDraftBadgeAt(activeDraft.updatedAt);
    } else if (existingEntry) {
      setTitle(existingEntry.title);
      setBody(existingEntry.body);
      setSummary(existingEntry.summary ?? "");
      setNotes(existingEntry.notes ?? "");
      setResultNotes(existingEntry.resultNotes ?? "");
      setType(existingEntry.type);
      setCategoryId(existingEntry.categoryId);
      setProjectId(existingEntry.projectId ?? existingEntry.collectionId ?? "");
      setTagInput(
        existingEntry.tagIds
          .map((tagId) => dataset.tags.find((tag) => tag.id === tagId)?.name)
          .filter(Boolean)
          .join(", ")
      );
      setVariableSeed(existingEntry.variables);
      setVariableInput(existingEntry.variables.map((variable) => variable.key).join(", "));
      setPlatforms(existingEntry.platforms.length > 0 ? existingEntry.platforms : [defaultPlatform].filter(Boolean));
      setSourceLabel(existingEntry.sourceLabel ?? "");
      setSourceUrl(existingEntry.sourceUrl ?? "");
      setStatus(existingEntry.status);
      setRating(existingEntry.rating ? String(existingEntry.rating) : "");
      setAdvancedSectionOpen(true);
      setDraftBadge(null);
      setDraftBadgeAt(null);
    } else {
      setTitle("");
      setBody("");
      setSummary("");
      setNotes("");
      setResultNotes("");
      setType("idea");
      setCategoryId(defaultCategory);
      setProjectId("");
      setTagInput("");
      setVariableSeed([]);
      setVariableInput("");
      setPlatforms(defaultPlatform ? [defaultPlatform] : []);
      setSourceLabel("");
      setSourceUrl("");
      setStatus("draft");
      setRating("");
      setAdvancedSectionOpen(mode !== "capture");
      setDraftBadge(null);
      setDraftBadgeAt(null);
    }

    setHydratedKey(nextHydratedKey);
  }, [
    activeDraft,
    dataset.tags,
    defaultCategory,
    defaultPlatform,
    existingEntry,
    hydratedKey,
    isReady,
    mode
  ]);

  const tagNames = normalizeList(tagInput);
  const draftVariables = buildVariableDefinitions(variableInput, variableSeed);
  const detailHref =
    existingEntry ? localizeHref(locale, `/app/library/${existingEntry.id}`) : localizeHref(locale, "/app");
  const bodyPreview = body.trim().length > 0 ? body : locale === "tr" ? "Yazmaya basla..." : "Start writing...";
  const editorEyebrow =
    mode === "capture"
      ? locale === "tr"
        ? "Hizli giris"
        : "Quick capture"
      : locale === "tr"
        ? "Calisma alani"
        : "Writing workspace";
  const headline =
    mode === "capture"
      ? locale === "tr"
        ? "Kacmadan yakala, sonra derinlestir."
        : "Capture now, refine when you are ready."
      : locale === "tr"
        ? "Kaydi sakin ve okunabilir bir yuzeyde gelistir."
        : "Keep refining the entry in a calmer, more focused surface.";
  const helperText =
    mode === "capture"
      ? t("app.captureSubtitle")
        : existingEntry
          ? `${t("app.versionHint")} ${formatDate(existingEntry.updatedAt, locale)}`
          : t("app.editorSubtitle");
  const wordCount = body.trim().length > 0 ? body.trim().split(/\s+/).length : 0;
  const sourceSnapshot = useMemo(
    () =>
      serializeDraftComparable({
        title: existingEntry?.title ?? "",
        body: existingEntry?.body ?? "",
        summary: existingEntry?.summary ?? "",
        notes: existingEntry?.notes ?? "",
        resultNotes: existingEntry?.resultNotes ?? "",
        categoryId: existingEntry?.categoryId ?? defaultCategory,
        projectId: existingEntry?.projectId ?? existingEntry?.collectionId ?? "",
        type: existingEntry?.type ?? "idea",
        language: existingEntry?.language ?? locale,
        platforms:
          existingEntry?.platforms?.length && existingEntry.platforms.length > 0
            ? existingEntry.platforms
            : [defaultPlatform].filter(Boolean),
        tagIds: existingEntry?.tagIds ?? [],
        variables: (existingEntry?.variables ?? []).map((variable) => ({
          key: variable.key,
          label: variable.label,
          defaultValue: variable.defaultValue,
          required: variable.required
        })),
        sourceLabel: existingEntry?.sourceLabel ?? "",
        sourceUrl: existingEntry?.sourceUrl ?? "",
        status: existingEntry?.status ?? "draft",
        rating: existingEntry?.rating ? String(existingEntry.rating) : ""
      }),
    [defaultCategory, defaultPlatform, existingEntry, locale]
  );
  const currentSnapshot = useMemo(
    () =>
      serializeDraftComparable({
        title,
        body,
        summary,
        notes,
        resultNotes,
        categoryId: categoryId || defaultCategory,
        projectId,
        type,
        language: locale,
        platforms,
        tagIds: tagNames.map((tagName) => `tag-${tagName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`),
        variables: draftVariables.map((variable) => ({
          key: variable.key,
          label: variable.label,
          defaultValue: variable.defaultValue,
          required: variable.required
        })),
        sourceLabel,
        sourceUrl,
        status,
        rating
      }),
    [
      body,
      categoryId,
      defaultCategory,
      draftVariables,
      locale,
      notes,
      platforms,
      projectId,
      rating,
      resultNotes,
      sourceLabel,
      sourceUrl,
      status,
      summary,
      tagNames,
      title,
      type
    ]
  );
  const activeDraftSnapshot = useMemo(
    () =>
      activeDraft
        ? serializeDraftComparable({
            title: activeDraft.title,
            body: activeDraft.body,
            summary: activeDraft.summary ?? "",
            notes: activeDraft.notes ?? "",
            resultNotes: activeDraft.resultNotes ?? "",
            categoryId: activeDraft.categoryId,
            projectId: activeDraft.projectId ?? "",
            type: activeDraft.type,
            language: activeDraft.language,
            platforms: activeDraft.platforms,
            tagIds: activeDraft.tagIds,
            variables: activeDraft.variables.map((variable) => ({
              key: variable.key,
              label: variable.label,
              defaultValue: variable.defaultValue,
              required: variable.required
            })),
            sourceLabel: activeDraft.sourceLabel ?? "",
            sourceUrl: activeDraft.sourceUrl ?? "",
            status: activeDraft.status ?? "draft",
            rating: activeDraft.rating ? String(activeDraft.rating) : ""
          })
        : null,
    [activeDraft]
  );

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const currentHydratedKey = existingEntry?.id ?? "__new__";
    if (hydratedKey !== currentHydratedKey) {
      return;
    }

    const isPristine = currentSnapshot === sourceSnapshot;
    const hasMeaningfulContent =
      title.trim().length > 0 ||
      body.trim().length > 0 ||
      summary.trim().length > 0 ||
      notes.trim().length > 0 ||
      resultNotes.trim().length > 0 ||
      projectId.trim().length > 0 ||
      tagNames.length > 0 ||
      draftVariables.length > 0 ||
      sourceLabel.trim().length > 0 ||
      sourceUrl.trim().length > 0;

    const timer = window.setTimeout(() => {
      if (!hasMeaningfulContent || isPristine) {
        discardDraft({ entryId: existingEntry?.id, draftId: activeDraftId });
        return;
      }

      if (activeDraftSnapshot === currentSnapshot) {
        return;
      }

      saveDraft(
        {
          title,
          body,
          summary,
          notes,
          resultNotes,
          recommendedVariations: "",
          categoryId: categoryId || defaultCategory,
          projectId,
          collectionId: projectId,
          type,
          language: locale,
          platforms,
          tagNames,
          isFavorite: existingEntry?.isFavorite ?? false,
          isArchived: existingEntry?.isArchived ?? false,
          isPinned: existingEntry?.isPinned ?? false,
          status,
          rating: rating ? Number(rating) : undefined,
          sourceUrl,
          sourceLabel,
          variables: draftVariables
        },
        {
          entryId: existingEntry?.id,
          draftId: activeDraftId
        }
      );
      setDraftBadge("autosaved");
      setDraftBadgeAt(new Date().toISOString());
    }, 1000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [
    activeDraftId,
    activeDraftSnapshot,
    body,
    categoryId,
    defaultCategory,
    discardDraft,
    draftVariables,
    existingEntry,
    hydratedKey,
    isReady,
    locale,
    notes,
    platforms,
    projectId,
    rating,
    resultNotes,
    saveDraft,
    sourceLabel,
    sourceSnapshot,
    sourceUrl,
    status,
    summary,
    tagNames,
    title,
    type,
    currentSnapshot
  ]);

  if (promptId && isReady && !existingEntry) {
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

  async function handleSave() {
    if (title.trim().length < 2) {
      notify(locale === "tr" ? "Kayit icin kisa bir baslik ekle." : "Add a short title before saving.");
      return;
    }

    if (body.trim().length < 10) {
      notify(locale === "tr" ? "Govdeyi biraz daha doldur." : "Add a little more detail to the body first.");
      return;
    }

    setIsSaving(true);

    try {
      const savedId = upsertEntry(
        {
          title,
          body,
          summary,
          notes,
          resultNotes,
          recommendedVariations: "",
          categoryId: categoryId || defaultCategory,
          projectId,
          collectionId: projectId,
          type,
          language: locale,
          platforms,
          tagNames,
          isFavorite: existingEntry?.isFavorite ?? false,
          isArchived: existingEntry?.isArchived ?? false,
          isPinned: existingEntry?.isPinned ?? false,
          status,
          rating: rating ? Number(rating) : undefined,
          sourceUrl,
          sourceLabel,
          variables: draftVariables
        },
        existingEntry?.id
      );
      discardDraft({ entryId: existingEntry?.id, draftId: activeDraftId });
      setDraftBadge(null);
      setDraftBadgeAt(null);

      router.push(localizeHref(locale, `/app/library/${savedId}`));
    } catch (error) {
      notify(error instanceof Error ? error.message : t("common.somethingWentWrong"));
    } finally {
      setIsSaving(false);
    }
  }

  function togglePlatform(platformKey: string) {
    setPlatforms((current) =>
      current.includes(platformKey)
        ? current.filter((item) => item !== platformKey)
        : [...current, platformKey]
    );
  }

  return (
    <>
      <div className="space-y-6 lg:space-y-8">
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="info">{editorEyebrow}</Badge>
            {existingEntry ? <Badge>{formatDate(existingEntry.updatedAt, locale)}</Badge> : null}
            <Badge tone="accent">{t(`common.${mode === "capture" ? "capture" : "edit"}`)}</Badge>
            {draftBadge ? (
              <Badge tone={draftBadge === "restored" ? "warning" : "success"}>
                {draftBadge === "restored"
                  ? locale === "tr"
                    ? "Taslak geri yuklendi"
                    : "Draft restored"
                  : locale === "tr"
                    ? "Otomatik kaydedildi"
                    : "Autosaved"}
              </Badge>
            ) : null}
          </div>

          <div className="space-y-3">
            <h1 className="max-w-3xl font-display text-4xl font-extrabold tracking-[-0.06em] text-[var(--text-primary)] md:text-5xl">
              {headline}
            </h1>
            <p className="max-w-3xl text-base leading-8 text-[var(--text-secondary)]">{helperText}</p>
            {draftBadgeAt ? (
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                {locale === "tr" ? "Taslak guncellendi" : "Draft updated"} {formatDate(draftBadgeAt, locale)}
              </p>
            ) : null}
          </div>
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-5">
            <Surface className="rounded-[30px] bg-[linear-gradient(180deg,rgba(20,20,20,0.92),rgba(20,20,20,0.86)),radial-gradient(circle_at_top_right,rgba(111,151,141,0.08),transparent_32%)] p-5 md:p-6">
              <div className="space-y-5">
                <div className="flex flex-wrap gap-2">
                  {activeTypeOptions.map((item) => {
                    const active = type === item;

                    return (
                      <button
                        key={item}
                        className={cn(
                          "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
                          active
                            ? "border-[color:rgba(111,151,141,0.28)] bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-strong)] shadow-[0_0_0_1px_rgba(111,151,141,0.1),0_14px_28px_rgba(111,151,141,0.12)]"
                            : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        )}
                        onClick={() => setType(item)}
                        type="button"
                      >
                        {typeLabel(item, t, locale)}
                      </button>
                    );
                  })}
                </div>

                <Field label={t("app.titleField")}>
                  <Input
                    className="h-14 rounded-[20px] bg-[rgba(12,12,12,0.88)] text-base"
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder={locale === "tr" ? "Bu giris ne hakkinda?" : "What is this entry about?"}
                    value={title}
                  />
                </Field>

                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium tracking-[-0.01em] text-[var(--text-primary)]">
                      {t("app.body")}
                    </span>
                    <Button onClick={() => setFocusComposerOpen(true)} size="sm" variant="ghost">
                      <Wand2 className="h-4 w-4" />
                      {locale === "tr" ? "Odak modunda ac" : "Focus mode"}
                    </Button>
                  </div>

                  <button
                    className="group flex min-h-[220px] w-full flex-col justify-between rounded-[28px] border border-[var(--border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01)),radial-gradient(circle_at_top_right,rgba(242,202,80,0.06),transparent_24%)] p-5 text-left shadow-[var(--shadow-panel)]"
                    onClick={() => setFocusComposerOpen(true)}
                    type="button"
                  >
                    <div className="space-y-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-tertiary)]">
                        {locale === "tr" ? "Yazma yuzeyi" : "Writing surface"}
                      </div>
                      <p
                        className={cn(
                          "max-h-64 overflow-hidden whitespace-pre-wrap text-base leading-8",
                          body.trim().length > 0 ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"
                        )}
                      >
                        {bodyPreview}
                      </p>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-3">
                      <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                        {wordCount} {locale === "tr" ? "kelime" : "words"}
                      </div>
                        <div className="rounded-full border border-[color:rgba(111,151,141,0.24)] bg-[var(--accent-secondary-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--accent-secondary-strong)] transition group-hover:bg-[rgba(111,151,141,0.2)]">
                          {locale === "tr" ? "Yazmaya devam et" : "Continue writing"}
                        </div>
                    </div>
                  </button>
                </div>
              </div>
            </Surface>

            <Surface className="rounded-[28px] bg-[rgba(20,20,20,0.88)] p-0">
              <button
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                onClick={() => setAdvancedSectionOpen((current) => !current)}
                type="button"
              >
                <div className="space-y-1">
                  <div className="font-display text-xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
                    {t("app.editorMetaTitle")}
                  </div>
                  <div className="text-sm leading-6 text-[var(--text-secondary)]">
                    {t("app.editorMetaDescription")}
                  </div>
                </div>
                {advancedSectionOpen ? (
                  <ChevronUp className="h-5 w-5 shrink-0 text-[var(--text-tertiary)]" />
                ) : (
                  <ChevronDown className="h-5 w-5 shrink-0 text-[var(--text-tertiary)]" />
                )}
              </button>

              {advancedSectionOpen ? (
                <div className="grid gap-4 border-t border-[var(--border)] px-5 py-5 md:grid-cols-2">
                  <Field label={t("app.project")}>
                    <Select onChange={(event) => setProjectId(event.target.value)} value={projectId}>
                      <option value="">{t("app.noProject")}</option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field label={t("app.category")}>
                    <Select onChange={(event) => setCategoryId(event.target.value)} value={categoryId}>
                      {categoryOptions.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.label[locale]}
                        </option>
                      ))}
                    </Select>
                  </Field>

                  <Field hint={t("app.tagsHint")} label={t("app.tags")}>
                    <Input
                      onChange={(event) => setTagInput(event.target.value)}
                      placeholder={locale === "tr" ? "tasarim, fikir, proje" : "design, idea, project"}
                      value={tagInput}
                    />
                  </Field>

                  <Field hint={t("app.variablesHint")} label={t("app.variables")}>
                    <Input
                      onChange={(event) => setVariableInput(event.target.value)}
                      placeholder={locale === "tr" ? "character, style, tone" : "character, style, tone"}
                      value={variableInput}
                    />
                  </Field>

                  <Field label={t("app.summary")}>
                    <Textarea
                      className="min-h-[132px]"
                      onChange={(event) => setSummary(event.target.value)}
                      placeholder={locale === "tr" ? "Kisa baglam ve amac..." : "A short context and intention..."}
                      value={summary}
                    />
                  </Field>

                  <Field label={t("app.notes")}>
                    <Textarea
                      className="min-h-[132px]"
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder={locale === "tr" ? "Icindeki dusunceler veya dahili notlar..." : "Internal notes or working context..."}
                      value={notes}
                    />
                  </Field>

                  <Field label={t("app.resultNotes")}>
                    <Textarea
                      className="min-h-[120px] md:col-span-2"
                      onChange={(event) => setResultNotes(event.target.value)}
                      placeholder={locale === "tr" ? "Neyin ise yaradigini not al..." : "Capture what worked after using it..."}
                      value={resultNotes}
                    />
                  </Field>

                  <div className="space-y-2.5 md:col-span-2">
                    <span className="block text-sm font-medium tracking-[-0.01em] text-[var(--text-primary)]">
                      {t("app.platforms")}
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {platformOptions.map((platform) => {
                        const active = platforms.includes(platform.key);

                        return (
                          <button
                            key={platform.id}
                            className={cn(
                              "rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition",
                              active
                                ? "border-[color:rgba(242,202,80,0.34)] bg-[rgba(242,202,80,0.12)] text-[var(--accent-strong)]"
                                : "border-[var(--border)] bg-[var(--surface-muted)] text-[var(--text-secondary)]"
                            )}
                            onClick={() => togglePlatform(platform.key)}
                            type="button"
                          >
                            {platform.shortLabel[locale]}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <Field label={t("app.sourceLabel")}>
                    <Input
                      onChange={(event) => setSourceLabel(event.target.value)}
                      placeholder={locale === "tr" ? "Kaynak adi" : "Source name"}
                      value={sourceLabel}
                    />
                  </Field>

                  <Field label={t("app.sourceUrl")}>
                    <Input
                      onChange={(event) => setSourceUrl(event.target.value)}
                      placeholder="https://"
                      value={sourceUrl}
                    />
                  </Field>

                  <Field label={t("app.status")}>
                    <Select
                      onChange={(event) =>
                        setStatus(event.target.value as "draft" | "active" | "reviewed" | "archived")
                      }
                      value={status}
                    >
                      <option value="draft">{t("app.statusDraft")}</option>
                      <option value="active">{t("app.statusActive")}</option>
                      <option value="reviewed">{t("app.statusReviewed")}</option>
                      <option value="archived">{t("app.statusArchived")}</option>
                    </Select>
                  </Field>

                  <Field label={t("app.rating")}>
                    <Select onChange={(event) => setRating(event.target.value)} value={rating}>
                      <option value="">{t("app.noRating")}</option>
                      {[1, 2, 3, 4, 5].map((value) => (
                        <option key={value} value={String(value)}>
                          {value}/5
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              ) : null}
            </Surface>
          </div>

          <div className="space-y-4">
            <Surface className="rounded-[30px] bg-[linear-gradient(180deg,rgba(242,202,80,0.08),rgba(20,20,20,0.92)_58%,rgba(111,151,141,0.05))] p-5 md:p-6">
              <div className="space-y-5">
                <div className="space-y-3">
                  <Badge tone="accent">{mode === "capture" ? t("app.quickCapture") : t("app.editorTitle")}</Badge>
                  <div className="font-display text-2xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
                    {locale === "tr" ? "Kaydi temiz ve hizli tut." : "Keep the entry clean and fast."}
                  </div>
                  <p className="text-sm leading-7 text-[var(--text-secondary)]">
                    {locale === "tr"
                      ? "Yazma alani once gelir. Daha detayli yapilandirma yalnizca ihtiyac duydugunda acilir."
                      : "The writing surface comes first. Advanced structure stays nearby, but only when you need it."}
                  </p>
                </div>

                <div className="grid gap-3">
                  <Metric label={t("app.tags")} value={tagNames.length} />
                  <Metric label={t("app.platforms")} value={platforms.length} />
                  <Metric label={t("app.variables")} value={draftVariables.length} />
                </div>

                <div className="flex flex-col gap-2">
                  <Button
                    className="w-full"
                    disabled={isSaving}
                    onClick={handleSave}
                    size="lg"
                  >
                    <Sparkles className="h-4 w-4" />
                    {isSaving ? t("common.saving") : t("common.save")}
                  </Button>
                  <Link href={detailHref}>
                    <Button className="w-full" size="lg" variant="secondary">
                      {t("common.cancel")}
                    </Button>
                  </Link>
                </div>
              </div>
            </Surface>

            <Surface className="rounded-[28px] bg-[linear-gradient(180deg,rgba(20,20,20,0.9),rgba(20,20,20,0.84))] p-5">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[color:rgba(111,151,141,0.22)] bg-[var(--accent-secondary-soft)] text-[var(--accent-secondary-strong)] shadow-[0_0_0_1px_rgba(111,151,141,0.08),0_12px_28px_rgba(111,151,141,0.14)]">
                    <Layers3 className="h-5 w-5" />
                  </div>
                  <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                    {t("app.editorWorkspaceTitle")}
                  </div>
                </div>
                <p className="text-sm leading-7 text-[var(--text-secondary)]">
                  {t("app.editorWorkspaceDescription")}
                </p>
              </div>
            </Surface>

            <PromptAIPanel
              collapsedByDefault
              handlers={{
                onApplyTitle: setTitle,
                onApplyCategory: setCategoryId,
                onApplyTags: (tags) => setTagInput(tags.join(", ")),
                onApplyPlatforms: setPlatforms,
                onApplySummary: setSummary,
                onApplyRewrite: (payload) => {
                  setBody(payload.body);
                  setSummary(payload.summary ?? summary);
                  setNotes(payload.notes ?? notes);
                }
              }}
              prompt={{
                entryId: existingEntry?.id,
                promptId: existingEntry?.id,
                title,
                body,
                summary,
                notes,
                resultNotes,
                categoryId,
                projectId,
                collectionId: projectId,
                language: locale,
                type,
                platforms,
                tagNames,
                variables: draftVariables
              }}
              promptId={existingEntry?.id}
            />
          </div>
        </div>
      </div>

      {focusComposerOpen ? (
        <div className="focus-composer-backdrop fixed inset-0 z-[140] flex items-end justify-center px-3 py-3 sm:px-6 sm:py-6">
          <button
            aria-label={t("common.cancel")}
            className="absolute inset-0"
            onClick={() => setFocusComposerOpen(false)}
            type="button"
          />
          <Surface
            className="focus-composer-panel relative w-full max-w-4xl rounded-[32px] bg-[rgba(15,14,13,0.94)] p-5 md:p-6"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="space-y-2">
                <Badge tone="accent">{mode === "capture" ? t("app.quickCapture") : t("app.editorTitle")}</Badge>
                <div className="font-display text-3xl font-extrabold tracking-[-0.05em] text-[var(--text-primary)]">
                  {locale === "tr" ? "Odak yazma alani" : "Focus composer"}
                </div>
                <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
                  {locale === "tr"
                    ? "Sadece kaydi sekillendir. Kalan detaylar asagida seni bekliyor."
                    : "Shape the entry first. The rest of the structure can wait below."}
                </p>
              </div>
              <Button onClick={() => setFocusComposerOpen(false)} size="sm" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4">
              <Field label={t("app.titleField")}>
                <Input
                  className="h-14 rounded-[20px] bg-[rgba(12,12,12,0.88)] text-base"
                  onChange={(event) => setTitle(event.target.value)}
                  value={title}
                />
              </Field>

              <Field label={t("app.body")}>
                <Textarea
                  autoFocus
                  className="min-h-[52vh] rounded-[28px] bg-[rgba(12,12,12,0.9)] px-5 py-4 text-[15px] leading-8 md:min-h-[56vh]"
                  onChange={(event) => setBody(event.target.value)}
                  placeholder={locale === "tr" ? "Dusunceyi oldugu gibi birak..." : "Let the thought land as it is..."}
                  value={body}
                />
              </Field>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs uppercase tracking-[0.14em] text-[var(--text-tertiary)]">
                {wordCount} {locale === "tr" ? "kelime" : "words"}
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setFocusComposerOpen(false)} variant="secondary">
                  {locale === "tr" ? "Yaziyi kapat" : "Done writing"}
                </Button>
                <Button disabled={isSaving} onClick={handleSave}>
                  {isSaving ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </div>
          </Surface>
        </div>
      ) : null}
    </>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[20px] border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
        {value}
      </div>
    </div>
  );
}
