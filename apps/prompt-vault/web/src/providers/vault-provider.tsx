"use client";

import { createDemoDataset } from "@/lib/demo-data";
import { downloadFile, exportAsJson, exportAsMarkdown, exportAsText } from "@/lib/exports";
import { getAuthMode } from "@/lib/env";
import { loadPreviewDataset, savePreviewDataset } from "@/lib/storage";
import { createDashboardSnapshot } from "@/lib/vault-utils";
import { useToast } from "@/providers/toast-provider";
import { promptInputSchema, type CollectionInput, type PromptInput } from "@prompt-vault/validation";
import type {
  AIAssistResponse,
  AISuggestionRecord,
  AuthMode,
  DashboardSnapshot,
  PromptRecord,
  PromptVaultDataset,
  UserPreferenceRecord
} from "@prompt-vault/types";
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useState,
  type ReactNode
} from "react";

interface PromptEditorInput extends Omit<PromptInput, "tagIds" | "platforms"> {
  tagNames: string[];
  platforms: string[];
}

interface VaultContextValue {
  dataset: PromptVaultDataset;
  authMode: AuthMode;
  dashboard: DashboardSnapshot;
  isReady: boolean;
  upsertPrompt: (input: PromptEditorInput, existingId?: string) => string;
  toggleFavorite: (promptId: string) => void;
  toggleArchive: (promptId: string) => void;
  duplicatePrompt: (promptId: string) => string | null;
  createCollection: (input: CollectionInput) => string;
  updatePreferences: (input: Partial<UserPreferenceRecord>) => void;
  recordAISuggestion: (
    response: AIAssistResponse,
    options?: { promptId?: string; latencyMs?: number }
  ) => string;
  setAISuggestionStatus: (
    suggestionId: string,
    status: AISuggestionRecord["status"]
  ) => void;
  exportVault: (format: "json" | "markdown" | "txt") => void;
  resetPreview: () => void;
}

const VaultContext = createContext<VaultContextValue | null>(null);

function createTagId(name: string) {
  return `tag-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
}

function normalizeTags(dataset: PromptVaultDataset, tagNames: string[]) {
  const normalizedNames = tagNames.map((name) => name.trim().toLowerCase()).filter(Boolean);
  const missingTags = normalizedNames.filter(
    (name) => !dataset.tags.some((tag) => tag.name.toLowerCase() === name)
  );
  const newTags = missingTags.map((name) => ({
    id: createTagId(name),
    userId: "demo-user",
    name,
    color: "teal",
    createdAt: new Date().toISOString()
  }));

  const tagIds = normalizedNames.map((name) => {
    const existing = dataset.tags.find((tag) => tag.name.toLowerCase() === name);
    return existing?.id ?? createTagId(name);
  });

  return { tagIds, newTags };
}

function buildVersionId(versionChainId: string, versionNumber: number) {
  return `${versionChainId}-v${versionNumber}`;
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<PromptVaultDataset>(createDemoDataset());
  const [isReady, setIsReady] = useState(false);
  const { notify } = useToast();
  const authMode = getAuthMode();

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = loadPreviewDataset();
      setDataset(stored ?? createDemoDataset());
      setIsReady(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    savePreviewDataset(dataset);
  }, [dataset, isReady]);

  function updateDataset(updater: (current: PromptVaultDataset) => PromptVaultDataset) {
    startTransition(() => {
      setDataset((current) => updater(current));
    });
  }

  function upsertPrompt(input: PromptEditorInput, existingId?: string) {
    const now = new Date().toISOString();
    const promptId = existingId ?? `prompt-${crypto.randomUUID()}`;
    let nextPromptId = promptId;

    updateDataset((current) => {
      const { tagIds, newTags } = normalizeTags(current, input.tagNames);
      const basePayload = promptInputSchema.parse({
        ...input,
        collectionId: input.collectionId || "",
        tagIds,
        sourceUrl: input.sourceUrl || "",
        sourceLabel: input.sourceLabel || ""
      });
      const existingPrompt = current.prompts.find((prompt) => prompt.id === promptId);
      const versionChainId = existingPrompt?.versionChainId ?? `chain-${crypto.randomUUID()}`;
      const nextVersionNumber = existingPrompt ? existingPrompt.latestVersionNumber + 1 : 1;
      const versionId = buildVersionId(versionChainId, nextVersionNumber);

      const nextPrompt: PromptRecord = {
        ...existingPrompt,
        ...basePayload,
        id: promptId,
        userId: existingPrompt?.userId ?? "demo-user",
        collectionId: basePayload.collectionId || undefined,
        latestVersionId: versionId,
        latestVersionNumber: nextVersionNumber,
        versionChainId,
        createdAt: existingPrompt?.createdAt ?? now,
        updatedAt: now
      };

      nextPromptId = nextPrompt.id;

      return {
        ...current,
        tags: [...current.tags, ...newTags.filter((tag) => !current.tags.some((item) => item.id === tag.id))],
        prompts: existingPrompt
          ? current.prompts.map((prompt) => (prompt.id === promptId ? nextPrompt : prompt))
          : [nextPrompt, ...current.prompts],
        versions: [
          ...current.versions,
          {
            id: versionId,
            versionNumber: nextVersionNumber,
            body: nextPrompt.body,
            summary: nextPrompt.summary,
            resultNotes: nextPrompt.resultNotes,
            createdAt: now,
            createdBy: "demo-user"
          }
        ],
        activities: [
          {
            id: `activity-${crypto.randomUUID()}`,
            userId: "demo-user",
            type: existingPrompt ? "version_created" : "created",
            promptId: nextPrompt.id,
            promptTitle: nextPrompt.title,
            createdAt: now,
            description: existingPrompt
              ? `Saved version ${nextVersionNumber} for ${nextPrompt.title}.`
              : `Created ${nextPrompt.title}.`
          },
          ...current.activities
        ]
      };
    });

    notify(existingId ? "Saved as a new version in your preview vault." : "Prompt added to your vault.");

    return nextPromptId;
  }

  function toggleFavorite(promptId: string) {
    updateDataset((current) => ({
      ...current,
      prompts: current.prompts.map((prompt) =>
        prompt.id === promptId
          ? { ...prompt, isFavorite: !prompt.isFavorite, updatedAt: new Date().toISOString() }
          : prompt
      )
    }));
  }

  function toggleArchive(promptId: string) {
    updateDataset((current) => ({
      ...current,
      prompts: current.prompts.map((prompt) =>
        prompt.id === promptId
          ? { ...prompt, isArchived: !prompt.isArchived, updatedAt: new Date().toISOString() }
          : prompt
      )
    }));
  }

  function duplicatePrompt(promptId: string) {
    const source = dataset.prompts.find((prompt) => prompt.id === promptId);
    if (!source) {
      return null;
    }

    const duplicatedId = upsertPrompt(
      {
        ...source,
        title: `${source.title} Copy`,
        collectionId: source.collectionId || "",
        language: source.language === "tr" ? "tr" : "en",
        tagNames: source.tagIds.map(
          (tagId) => dataset.tags.find((tag) => tag.id === tagId)?.name ?? tagId
        )
      },
      undefined
    );
    notify("Created a duplicate with its own version chain.");

    return duplicatedId;
  }

  function createCollection(input: CollectionInput) {
    const parsed = input.name.trim();
    const collectionId = input.id || `collection-${crypto.randomUUID()}`;
    updateDataset((current) => ({
      ...current,
      collections: [
        {
          id: collectionId,
          userId: "demo-user",
          name: parsed,
          description: input.description || undefined,
          color: input.color,
          icon: input.icon,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ...current.collections
      ]
    }));
    notify("Collection created.");

    return collectionId;
  }

  function updatePreferences(input: Partial<UserPreferenceRecord>) {
    updateDataset((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        ...input
      }
    }));
    notify("Preferences updated.");
  }

  function exportVault(format: "json" | "markdown" | "txt") {
    const filenameBase = `prompt-vault-export-${new Date().toISOString().slice(0, 10)}`;
    if (format === "json") {
      downloadFile(`${filenameBase}.json`, exportAsJson(dataset), "application/json");
    } else if (format === "markdown") {
      downloadFile(`${filenameBase}.md`, exportAsMarkdown(dataset), "text/markdown");
    } else {
      downloadFile(`${filenameBase}.txt`, exportAsText(dataset), "text/plain");
    }

    notify("Export prepared from your current vault data.");
  }

  function recordAISuggestion(
    response: AIAssistResponse,
    options?: { promptId?: string; latencyMs?: number }
  ) {
    const now = new Date().toISOString();
    const suggestionId = `ai-suggestion-${crypto.randomUUID()}`;

    updateDataset((current) => ({
      ...current,
      aiSuggestions: [
        {
          id: suggestionId,
          promptId: options?.promptId ?? undefined,
          action: response.action,
          provider: response.provider,
          model: response.model,
          status: "pending",
          payload: response.payload,
          createdAt: now,
          updatedAt: now
        },
        ...current.aiSuggestions
      ],
      aiUsage: [
        {
          id: `ai-usage-${crypto.randomUUID()}`,
          actorId: "preview-user",
          action: response.action,
          provider: response.provider,
          model: response.model,
          status: "success",
          promptId: options?.promptId ?? undefined,
          createdAt: now,
          latencyMs: options?.latencyMs ?? 0
        },
        ...current.aiUsage
      ]
    }));

    notify("AI suggestion is ready for review.");

    return suggestionId;
  }

  function setAISuggestionStatus(
    suggestionId: string,
    status: AISuggestionRecord["status"]
  ) {
    updateDataset((current) => ({
      ...current,
      aiSuggestions: current.aiSuggestions.map((suggestion) =>
        suggestion.id === suggestionId
          ? {
              ...suggestion,
              status,
              updatedAt: new Date().toISOString()
            }
          : suggestion
      )
    }));
  }

  function resetPreview() {
    const seed = createDemoDataset();
    setDataset(seed);
    notify("Preview vault reset to the seeded dataset.");
  }

  return (
    <VaultContext.Provider
      value={{
        dataset,
        authMode,
        dashboard: createDashboardSnapshot(dataset),
        isReady,
        upsertPrompt,
        toggleFavorite,
        toggleArchive,
        duplicatePrompt,
        createCollection,
        updatePreferences,
        recordAISuggestion,
        setAISuggestionStatus,
        exportVault,
        resetPreview
      }}
    >
      {children}
    </VaultContext.Provider>
  );
}

export function useVault() {
  const context = useContext(VaultContext);
  if (!context) {
    throw new Error("useVault must be used within VaultProvider.");
  }

  return context;
}
