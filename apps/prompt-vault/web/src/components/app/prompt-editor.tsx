"use client";

import { entryTypes, type PromptVariableDefinition } from "@prompt-vault/types";
import { ChevronDown, ChevronUp, Code2, ImageIcon, ListChecks, Paperclip, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PromptAIPanel } from "@/components/app/prompt-ai-panel";
import { Button, EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { cn } from "@/lib/cn";
import { getEntries, getProjects } from "@/lib/dataset";
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

function typeLabel(value: string, t: (path: string) => string) {
  if (value === "prompt") return t("common.prompt");
  if (value === "idea") return t("common.idea");
  if (value === "workflow") return t("common.workflow");
  if (value === "template") return t("common.template");
  if (value === "system_prompt") return t("app.typeSystemPrompt");
  if (value === "agent_instruction") return t("app.typeAgentInstruction");
  if (value === "text_block") return t("app.typeTextBlock");
  if (value === "note") return t("app.typeNote");
  return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function normalizeList(value: string) {
  return [...new Set(value.split(",").map((item) => item.trim()).filter(Boolean))];
}

function keyToLabel(key: string) {
  return key.replace(/[_-]+/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
}

function buildVariableDefinitions(
  input: string,
  seed: PromptVariableDefinition[]
): PromptVariableDefinition[] {
  const map = new Map(seed.map((v) => [v.key, v]));
  return normalizeList(input).map((key) => {
    const existing = map.get(key);
    if (existing) return existing;
    return { id: `var-${crypto.randomUUID()}`, key, label: keyToLabel(key) };
  });
}

function draftTagIdToLabel(tagId: string, knownTags: Array<{ id: string; name: string }>) {
  return knownTags.find((tag) => tag.id === tagId)?.name ?? tagId.replace(/^tag-/, "").replace(/-/g, " ");
}

function serializeDraftComparable(input: DraftComparable) {
  return JSON.stringify({
    ...input,
    platforms: [...input.platforms].sort(),
    tagIds: [...input.tagIds].sort(),
    variables: [...input.variables]
      .map((v) => ({ key: v.key, label: v.label, defaultValue: v.defaultValue ?? "", required: Boolean(v.required) }))
      .sort((a, b) => a.key.localeCompare(b.key)),
  });
}

export function PromptEditor({
  promptId,
  mode = "editor",
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
  const [advancedOpen, setAdvancedOpen] = useState(mode !== "capture");
  const [isSaving, setIsSaving] = useState(false);
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [draftBadge, setDraftBadge] = useState<DraftStateBadge | null>(null);

  const activeTypeOptions = useMemo(() => {
    const values = new Set<string>(PRIORITY_TYPES);
    if (existingEntry) values.add(existingEntry.type);
    return entryTypes.filter((item) => values.has(item));
  }, [existingEntry]);

  const activeDraftId = useMemo(() => {
    if (existingEntry) return `draft-entry-${existingEntry.id}`;
    return mode === "capture" ? "draft-capture" : "draft-entry-new";
  }, [existingEntry, mode]);

  const activeDraft = useMemo(
    () => dataset.drafts.find((d) => d.id === activeDraftId || (existingEntry && d.entryId === existingEntry.id)),
    [activeDraftId, dataset.drafts, existingEntry]
  );

  // ─── Hydrate from draft or entry ───
  useEffect(() => {
    if (!isReady) return;
    const nextHydratedKey = existingEntry?.id ?? "__new__";
    if (hydratedKey === nextHydratedKey) return;

    const shouldRestoreDraft = Boolean(
      activeDraft && (!existingEntry || new Date(activeDraft.updatedAt).getTime() >= new Date(existingEntry.updatedAt).getTime())
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
      setTagInput(activeDraft.tagIds.map((id) => draftTagIdToLabel(id, dataset.tags)).filter(Boolean).join(", "));
      setVariableSeed(activeDraft.variables);
      setVariableInput(activeDraft.variables.map((v) => v.key).join(", "));
      setPlatforms(activeDraft.platforms.length > 0 ? activeDraft.platforms : [defaultPlatform].filter(Boolean));
      setSourceLabel(activeDraft.sourceLabel ?? "");
      setSourceUrl(activeDraft.sourceUrl ?? "");
      setStatus(activeDraft.status ?? "draft");
      setRating(activeDraft.rating ? String(activeDraft.rating) : "");
      setAdvancedOpen(mode !== "capture" || Boolean(activeDraft.projectId || activeDraft.tagIds.length));
      setDraftBadge("restored");
    } else if (existingEntry) {
      setTitle(existingEntry.title);
      setBody(existingEntry.body);
      setSummary(existingEntry.summary ?? "");
      setNotes(existingEntry.notes ?? "");
      setResultNotes(existingEntry.resultNotes ?? "");
      setType(existingEntry.type);
      setCategoryId(existingEntry.categoryId);
      setProjectId(existingEntry.projectId ?? existingEntry.collectionId ?? "");
      setTagInput(existingEntry.tagIds.map((id) => dataset.tags.find((t) => t.id === id)?.name).filter(Boolean).join(", "));
      setVariableSeed(existingEntry.variables);
      setVariableInput(existingEntry.variables.map((v) => v.key).join(", "));
      setPlatforms(existingEntry.platforms.length > 0 ? existingEntry.platforms : [defaultPlatform].filter(Boolean));
      setSourceLabel(existingEntry.sourceLabel ?? "");
      setSourceUrl(existingEntry.sourceUrl ?? "");
      setStatus(existingEntry.status);
      setRating(existingEntry.rating ? String(existingEntry.rating) : "");
      setAdvancedOpen(true);
      setDraftBadge(null);
    } else {
      setTitle(""); setBody(""); setSummary(""); setNotes(""); setResultNotes("");
      setType("idea"); setCategoryId(defaultCategory); setProjectId("");
      setTagInput(""); setVariableSeed([]); setVariableInput("");
      setPlatforms(defaultPlatform ? [defaultPlatform] : []);
      setSourceLabel(""); setSourceUrl(""); setStatus("draft"); setRating("");
      setAdvancedOpen(mode !== "capture");
      setDraftBadge(null);
    }
    setHydratedKey(nextHydratedKey);
  }, [activeDraft, dataset.tags, defaultCategory, defaultPlatform, existingEntry, hydratedKey, isReady, mode]);

  const tagNames = normalizeList(tagInput);
  const draftVariables = buildVariableDefinitions(variableInput, variableSeed);
  const detailHref = existingEntry ? localizeHref(locale, `/app/library/${existingEntry.id}`) : localizeHref(locale, "/app");
  const wordCount = body.trim().length > 0 ? body.trim().split(/\s+/).length : 0;

  const sourceSnapshot = useMemo(() => serializeDraftComparable({
    title: existingEntry?.title ?? "", body: existingEntry?.body ?? "", summary: existingEntry?.summary ?? "",
    notes: existingEntry?.notes ?? "", resultNotes: existingEntry?.resultNotes ?? "",
    categoryId: existingEntry?.categoryId ?? defaultCategory, projectId: existingEntry?.projectId ?? existingEntry?.collectionId ?? "",
    type: existingEntry?.type ?? "idea", language: existingEntry?.language ?? locale,
    platforms: existingEntry?.platforms?.length ? existingEntry.platforms : [defaultPlatform].filter(Boolean),
    tagIds: existingEntry?.tagIds ?? [],
    variables: (existingEntry?.variables ?? []).map((v) => ({ key: v.key, label: v.label, defaultValue: v.defaultValue, required: v.required })),
    sourceLabel: existingEntry?.sourceLabel ?? "", sourceUrl: existingEntry?.sourceUrl ?? "",
    status: existingEntry?.status ?? "draft", rating: existingEntry?.rating ? String(existingEntry.rating) : "",
  }), [defaultCategory, defaultPlatform, existingEntry, locale]);

  const currentSnapshot = useMemo(() => serializeDraftComparable({
    title, body, summary, notes, resultNotes,
    categoryId: categoryId || defaultCategory, projectId, type, language: locale, platforms,
    tagIds: tagNames.map((n) => `tag-${n.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`),
    variables: draftVariables.map((v) => ({ key: v.key, label: v.label, defaultValue: v.defaultValue, required: v.required })),
    sourceLabel, sourceUrl, status, rating,
  }), [body, categoryId, defaultCategory, draftVariables, locale, notes, platforms, projectId, rating, resultNotes, sourceLabel, sourceUrl, status, summary, tagNames, title, type]);

  const activeDraftSnapshot = useMemo(() => activeDraft ? serializeDraftComparable({
    title: activeDraft.title, body: activeDraft.body, summary: activeDraft.summary ?? "",
    notes: activeDraft.notes ?? "", resultNotes: activeDraft.resultNotes ?? "",
    categoryId: activeDraft.categoryId, projectId: activeDraft.projectId ?? "",
    type: activeDraft.type, language: activeDraft.language, platforms: activeDraft.platforms,
    tagIds: activeDraft.tagIds,
    variables: activeDraft.variables.map((v) => ({ key: v.key, label: v.label, defaultValue: v.defaultValue, required: v.required })),
    sourceLabel: activeDraft.sourceLabel ?? "", sourceUrl: activeDraft.sourceUrl ?? "",
    status: activeDraft.status ?? "draft", rating: activeDraft.rating ? String(activeDraft.rating) : "",
  }) : null, [activeDraft]);

  // ─── Autosave draft ───
  useEffect(() => {
    if (!isReady) return;
    const currentHydratedKey = existingEntry?.id ?? "__new__";
    if (hydratedKey !== currentHydratedKey) return;

    const isPristine = currentSnapshot === sourceSnapshot;
    const hasMeaningfulContent = title.trim().length > 0 || body.trim().length > 0 || summary.trim().length > 0 || notes.trim().length > 0 || resultNotes.trim().length > 0 || projectId.trim().length > 0 || tagNames.length > 0 || draftVariables.length > 0 || sourceLabel.trim().length > 0 || sourceUrl.trim().length > 0;

    const timer = window.setTimeout(() => {
      if (!hasMeaningfulContent || isPristine) {
        discardDraft({ entryId: existingEntry?.id, draftId: activeDraftId });
        return;
      }
      if (activeDraftSnapshot === currentSnapshot) return;

      saveDraft({
        title, body, summary, notes, resultNotes, recommendedVariations: "",
        categoryId: categoryId || defaultCategory, projectId, collectionId: projectId,
        type, language: locale, platforms, tagNames,
        isFavorite: existingEntry?.isFavorite ?? false,
        isArchived: existingEntry?.isArchived ?? false,
        isPinned: existingEntry?.isPinned ?? false,
        status, rating: rating ? Number(rating) : undefined,
        sourceUrl, sourceLabel, variables: draftVariables,
      }, { entryId: existingEntry?.id, draftId: activeDraftId });
      setDraftBadge("autosaved");
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [activeDraftId, activeDraftSnapshot, body, categoryId, defaultCategory, discardDraft, draftVariables, existingEntry, hydratedKey, isReady, locale, notes, platforms, projectId, rating, resultNotes, saveDraft, sourceLabel, sourceSnapshot, sourceUrl, status, summary, tagNames, title, type, currentSnapshot]);

  if (promptId && isReady && !existingEntry) {
    return (
      <EmptyState
        action={<Link href={localizeHref(locale, "/app/library")}><Button>{t("common.library")}</Button></Link>}
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
      const savedId = upsertEntry({
        title, body, summary, notes, resultNotes, recommendedVariations: "",
        categoryId: categoryId || defaultCategory, projectId, collectionId: projectId,
        type, language: locale, platforms, tagNames,
        isFavorite: existingEntry?.isFavorite ?? false,
        isArchived: existingEntry?.isArchived ?? false,
        isPinned: existingEntry?.isPinned ?? false,
        status, rating: rating ? Number(rating) : undefined,
        sourceUrl, sourceLabel, variables: draftVariables,
      }, existingEntry?.id);
      discardDraft({ entryId: existingEntry?.id, draftId: activeDraftId });
      setDraftBadge(null);
      router.push(localizeHref(locale, `/app/library/${savedId}`));
    } catch (error) {
      notify(error instanceof Error ? error.message : t("common.somethingWentWrong"));
    } finally {
      setIsSaving(false);
    }
  }

  function togglePlatform(platformKey: string) {
    setPlatforms((current) => current.includes(platformKey) ? current.filter((k) => k !== platformKey) : [...current, platformKey]);
  }

  // ─── UI ───
  return (
    <>
      <div className="flex w-full flex-col gap-6 py-1">
        {/* Header */}
        <div className="omni-editor-topbar">
          <Link
            aria-label={locale === "tr" ? "Kapat" : "Close"}
            className="omni-icon-button vault-press"
            href={detailHref}
          >
            <X className="h-4 w-4" />
          </Link>
          <div className="min-w-0">
            <div className="omni-editor-title">
              {mode === "capture"
                ? locale === "tr" ? "Hizli Yakala" : "Quick Capture"
                : locale === "tr" ? "Duzenle" : "Edit Entry"}
            </div>
            {draftBadge ? (
              <div className="mt-1 text-center text-[11px] text-[var(--text-tertiary)]">
                {draftBadge === "restored"
                  ? locale === "tr" ? "Taslak geri yuklendi" : "Draft restored"
                  : locale === "tr" ? "Otomatik kaydedildi" : "Autosaved"}
              </div>
            ) : null}
          </div>
          <button
            className="omni-editor-save vault-press disabled:opacity-40"
            disabled={isSaving}
            onClick={handleSave}
            type="button"
          >
            {isSaving ? t("common.saving") : t("common.save")}
          </button>
        </div>

        {mode !== "capture" ? (
          <div className="flex gap-1.5 overflow-x-auto">
            {activeTypeOptions.map((item) => (
              <button
                key={item}
                className={cn(
                  "vault-press shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                  type === item
                    ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                    : "bg-[var(--surface)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                )}
                onClick={() => setType(item)}
                type="button"
              >
                {typeLabel(item, t)}
              </button>
            ))}
          </div>
        ) : null}

        {/* Title */}
        <div>
          <label className="omni-field-label">{t("app.titleField")}</label>
          <Input
            className="omni-line-input"
            onChange={(e) => setTitle(e.target.value)}
            placeholder={locale === "tr" ? "Aklindaki nedir?" : "What's on your mind?"}
            value={title}
          />
        </div>

        {/* Body */}
        <div className="space-y-2">
          <Textarea
            className="omni-capture-textarea"
            onChange={(e) => setBody(e.target.value)}
            placeholder={locale === "tr" ? "Dusunceyi oldugu gibi birak..." : "Let the thought land as it is..."}
            value={body}
          />
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-tertiary)]">
              {wordCount} {locale === "tr" ? "kelime" : "words"}
            </span>
            <button
              className="text-[11px] font-medium text-[var(--accent)] hover:text-[var(--accent-strong)]"
              onClick={() => setFocusComposerOpen(true)}
              type="button"
            >
              {locale === "tr" ? "Odak modu" : "Focus mode"}
            </button>
          </div>
        </div>

        {/* Advanced / metadata section */}
        <div className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-left"
            onClick={() => setAdvancedOpen((c) => !c)}
            type="button"
          >
            <span className="text-sm font-medium text-[var(--text-primary)]">
              {t("app.editorMetaTitle")}
            </span>
            {advancedOpen ? (
              <ChevronUp className="h-4 w-4 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[var(--text-tertiary)]" />
            )}
          </button>

          {advancedOpen ? (
            <div className="grid gap-4 border-t border-[var(--border)] px-4 py-4 sm:grid-cols-2">
              <Field label={t("app.project")}>
                <Select onChange={(e) => setProjectId(e.target.value)} value={projectId}>
                  <option value="">{t("app.noProject")}</option>
                  {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <Field label={t("app.category")}>
                <Select onChange={(e) => setCategoryId(e.target.value)} value={categoryId}>
                  {categoryOptions.map((c) => <option key={c.id} value={c.id}>{c.label[locale]}</option>)}
                </Select>
              </Field>
              <Field hint={t("app.tagsHint")} label={t("app.tags")}>
                <Input onChange={(e) => setTagInput(e.target.value)} placeholder={locale === "tr" ? "tasarım, fikir, proje" : "design, idea, project"} value={tagInput} />
              </Field>
              <Field hint={t("app.variablesHint")} label={t("app.variables")}>
                <Input onChange={(e) => setVariableInput(e.target.value)} placeholder="character, style, tone" value={variableInput} />
              </Field>
              <Field label={t("app.summary")}>
                <Textarea className="min-h-[100px]" onChange={(e) => setSummary(e.target.value)} placeholder={locale === "tr" ? "Kısa bağlam..." : "A short context..."} value={summary} />
              </Field>
              <Field label={t("app.notes")}>
                <Textarea className="min-h-[100px]" onChange={(e) => setNotes(e.target.value)} placeholder={locale === "tr" ? "Kisisel notlar..." : "Private notes..."} value={notes} />
              </Field>
              <Field label={t("app.resultNotes")}>
                <Textarea className="min-h-[80px] sm:col-span-2" onChange={(e) => setResultNotes(e.target.value)} placeholder={locale === "tr" ? "Neyin işe yaradığını not al..." : "Capture what worked..."} value={resultNotes} />
              </Field>
              <div className="space-y-2 sm:col-span-2">
                <span className="block text-sm font-medium text-[var(--text-primary)]">{t("app.platforms")}</span>
                <div className="flex flex-wrap gap-1.5">
                  {platformOptions.map((p) => {
                    const active = platforms.includes(p.key);
                    return (
                      <button key={p.id} className={cn("vault-press rounded-full px-3 py-1.5 text-xs font-medium transition-colors", active ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "bg-[var(--surface-muted)] text-[var(--text-secondary)]")} onClick={() => togglePlatform(p.key)} type="button">
                        {p.shortLabel[locale]}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Field label={t("app.sourceLabel")}>
                <Input onChange={(e) => setSourceLabel(e.target.value)} placeholder={locale === "tr" ? "Kaynak adı" : "Source name"} value={sourceLabel} />
              </Field>
              <Field label={t("app.sourceUrl")}>
                <Input onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://" value={sourceUrl} />
              </Field>
              <Field label={t("app.status")}>
                <Select onChange={(e) => setStatus(e.target.value as typeof status)} value={status}>
                  <option value="draft">{t("app.statusDraft")}</option>
                  <option value="active">{t("app.statusActive")}</option>
                  <option value="reviewed">{t("app.statusReviewed")}</option>
                  <option value="archived">{t("app.statusArchived")}</option>
                </Select>
              </Field>
              <Field label={t("app.rating")}>
                <Select onChange={(e) => setRating(e.target.value)} value={rating}>
                  <option value="">{t("app.noRating")}</option>
                  {[1, 2, 3, 4, 5].map((v) => <option key={v} value={String(v)}>{v}/5</option>)}
                </Select>
              </Field>
            </div>
          ) : null}
        </div>

        {mode === "capture" ? (
          <div className="omni-capture-tools" aria-label={locale === "tr" ? "Ekleme kisayollari" : "Attachment shortcuts"}>
            <button aria-label={locale === "tr" ? "Gorsel" : "Image"} type="button"><ImageIcon className="h-4 w-4" /></button>
            <button aria-label={locale === "tr" ? "Kod" : "Code"} type="button"><Code2 className="h-4 w-4" /></button>
            <button aria-label={locale === "tr" ? "Liste" : "List"} type="button"><ListChecks className="h-4 w-4" /></button>
            <button aria-label={locale === "tr" ? "Dosya" : "File"} type="button"><Paperclip className="h-4 w-4" /></button>
          </div>
        ) : (
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
              },
            }}
            prompt={{
              entryId: existingEntry?.id, promptId: existingEntry?.id,
              title, body, summary, notes, resultNotes,
              categoryId, projectId, collectionId: projectId,
              language: locale, type, platforms, tagNames,
              variables: draftVariables,
            }}
            promptId={existingEntry?.id}
          />
        )}

      </div>

      {/* Focus composer overlay */}
      {focusComposerOpen ? (
        <div className="backdrop-fade fixed inset-0 z-[140] flex items-end justify-center bg-black/70 px-3 py-3 sm:items-center sm:px-6 sm:py-6">
          <button aria-label={t("common.cancel")} className="absolute inset-0" onClick={() => setFocusComposerOpen(false)} type="button" />
          <div
            className="composer-rise relative w-full max-w-[640px] rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--background-elevated)] p-5"
            style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                {locale === "tr" ? "Odak modu" : "Focus mode"}
              </h2>
              <Button onClick={() => setFocusComposerOpen(false)} size="sm" variant="ghost">
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <Input
                className="h-12 border-0 bg-transparent px-0 text-lg font-semibold focus:ring-0"
                onChange={(e) => setTitle(e.target.value)}
                placeholder={locale === "tr" ? "Başlık" : "Title"}
                value={title}
              />
              <Textarea
                autoFocus
                className="min-h-[50vh] bg-[var(--surface)] px-4 py-4 text-[15px] leading-7 sm:min-h-[55vh]"
                onChange={(e) => setBody(e.target.value)}
                placeholder={locale === "tr" ? "Düşünceyi olduğu gibi bırak..." : "Let the thought land as it is..."}
                value={body}
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3">
              <span className="text-xs text-[var(--text-tertiary)]">
                {wordCount} {locale === "tr" ? "kelime" : "words"}
              </span>
              <div className="flex gap-2">
                <Button onClick={() => setFocusComposerOpen(false)} variant="secondary" size="sm">
                  {locale === "tr" ? "Bitti" : "Done"}
                </Button>
                <Button disabled={isSaving} onClick={handleSave} size="sm">
                  {isSaving ? t("common.saving") : t("common.save")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
