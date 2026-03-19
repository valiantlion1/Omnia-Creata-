"use client";

import { createDemoDataset } from "@/lib/demo-data";
import { getEntries, getProjects, withDatasetAliases } from "@/lib/dataset";
import { getAuthMode, getProductRuntime } from "@/lib/env";
import { downloadFile, exportAsJson, exportAsMarkdown, exportAsText } from "@/lib/exports";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import { loadRemoteVaultState, mergeVaultDatasets, saveRemoteVaultState } from "@/lib/supabase/vault-state";
import {
  loadPreviewDataset,
  loadPreviewSyncQueue,
  savePreviewDataset,
  savePreviewSyncQueue
} from "@/lib/storage";
import { createDashboardSnapshot } from "@/lib/vault-utils";
import { useToast } from "@/providers/toast-provider";
import { entryInputSchema, type EntryInput, type ProjectInput } from "@prompt-vault/validation";
import type {
  AIAssistResponse,
  AISuggestionRecord,
  AuthMode,
  DashboardSnapshot,
  EntryDraftRecord,
  EntryRecord,
  OfflineMutationRecord,
  PromptVersion,
  PromptVaultDataset,
  UserPreferenceRecord
} from "@prompt-vault/types";
import {
  createContext,
  startTransition,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";

interface EntryEditorInput extends Omit<EntryInput, "tagIds" | "platforms"> {
  tagNames: string[];
  platforms: string[];
}

interface UpsertEntryOptions {
  source?: PromptVersion["source"];
  changeSummary?: string;
  restoredFromVersionId?: string;
}

interface VaultContextValue {
  dataset: PromptVaultDataset;
  authMode: AuthMode;
  runtime: ReturnType<typeof getProductRuntime>;
  dashboard: DashboardSnapshot;
  isReady: boolean;
  syncQueueCount: number;
  sessionUserId: string | null;
  isCloudSessionActive: boolean;
  cloudSyncState: "idle" | "loading" | "saving" | "error";
  upsertEntry: (input: EntryEditorInput, existingId?: string, options?: UpsertEntryOptions) => string;
  upsertPrompt: (input: EntryEditorInput, existingId?: string, options?: UpsertEntryOptions) => string;
  saveDraft: (input: EntryEditorInput, options?: { entryId?: string; draftId?: string }) => string;
  discardDraft: (options?: { entryId?: string; draftId?: string }) => void;
  toggleFavorite: (entryId: string) => void;
  toggleArchive: (entryId: string) => void;
  duplicateEntry: (entryId: string) => string | null;
  duplicatePrompt: (entryId: string) => string | null;
  restoreVersion: (entryId: string, versionId: string) => boolean;
  createProject: (input: ProjectInput) => string;
  createCollection: (input: ProjectInput) => string;
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

function buildDraftId(entryId?: string, draftId?: string) {
  if (draftId) {
    return draftId;
  }

  if (entryId) {
    return `draft-entry-${entryId}`;
  }

  return "draft-capture";
}

function createVersionSnapshot(options: {
  entry: EntryRecord;
  versionId: string;
  versionNumber: number;
  source: PromptVersion["source"];
  createdAt: string;
  createdBy: string;
  changeSummary?: string;
  restoredFromVersionId?: string;
}): PromptVersion {
  const { entry, versionId, versionNumber, source, createdAt, createdBy, changeSummary, restoredFromVersionId } =
    options;

  return {
    id: versionId,
    entryId: entry.id,
    versionChainId: entry.versionChainId,
    versionNumber,
    title: entry.title,
    body: entry.body,
    summary: entry.summary,
    notes: entry.notes,
    resultNotes: entry.resultNotes,
    categoryId: entry.categoryId,
    projectId: entry.projectId ?? entry.collectionId,
    type: entry.type,
    platforms: entry.platforms,
    tagIds: entry.tagIds,
    source,
    changeSummary,
    restoredFromVersionId,
    createdAt,
    createdBy
  };
}

function queueMutation(
  current: PromptVaultDataset,
  mutation: Omit<OfflineMutationRecord, "id" | "createdAt">
) {
  return [
    {
      ...mutation,
      id: `sync-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString()
    },
    ...current.syncQueue
  ].slice(0, 100);
}

export function VaultProvider({ children }: { children: ReactNode }) {
  const [dataset, setDataset] = useState<PromptVaultDataset>(withDatasetAliases(createDemoDataset()));
  const [isReady, setIsReady] = useState(false);
  const [sessionUserId, setSessionUserId] = useState<string | null>(null);
  const [hydratedRemoteUserId, setHydratedRemoteUserId] = useState<string | null>(null);
  const [cloudSyncState, setCloudSyncState] = useState<"idle" | "loading" | "saving" | "error">("idle");
  const lastRemoteSnapshotRef = useRef<string | null>(null);
  const { notify } = useToast();
  const authMode = getAuthMode();
  const runtime = getProductRuntime();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const stored = loadPreviewDataset();
      const syncQueue = loadPreviewSyncQueue();
      const seed = withDatasetAliases(stored ?? createDemoDataset());
      setDataset({
        ...seed,
        syncQueue: seed.syncQueue.length > 0 ? seed.syncQueue : syncQueue
      });
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
    savePreviewSyncQueue(dataset.syncQueue);
  }, [dataset, isReady]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let active = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!active) {
        return;
      }

      setSessionUserId(user?.id ?? null);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      setSessionUserId(nextUserId);

      if (!nextUserId) {
        setHydratedRemoteUserId(null);
        setCloudSyncState("idle");
        lastRemoteSnapshotRef.current = null;
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  useEffect(() => {
    if (!isReady || !supabase || !sessionUserId || hydratedRemoteUserId === sessionUserId) {
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setCloudSyncState("loading");
        const remoteState = await loadRemoteVaultState(supabase, sessionUserId);
        if (cancelled) {
          return;
        }

        const localState = withDatasetAliases(dataset);
        const nextDataset = remoteState ? mergeVaultDatasets(remoteState, localState) : localState;
        const serialized = JSON.stringify(nextDataset);

        setDataset(nextDataset);
        setHydratedRemoteUserId(sessionUserId);
        lastRemoteSnapshotRef.current = serialized;

        if (!remoteState || JSON.stringify(withDatasetAliases(remoteState)) !== serialized) {
          await saveRemoteVaultState(supabase, sessionUserId, nextDataset);
        }

        setCloudSyncState("idle");
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error("[vault.remote-load-failed]", error);
        setCloudSyncState("error");
        notify("Cloud sync could not load your saved state.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dataset, hydratedRemoteUserId, isReady, notify, sessionUserId, supabase]);

  useEffect(() => {
    if (!isReady || !supabase || !sessionUserId || hydratedRemoteUserId !== sessionUserId) {
      return;
    }

    const serialized = JSON.stringify(withDatasetAliases(dataset));
    if (lastRemoteSnapshotRef.current === serialized) {
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setCloudSyncState("saving");
        await saveRemoteVaultState(supabase, sessionUserId, dataset);
        lastRemoteSnapshotRef.current = serialized;
        setCloudSyncState("idle");
      } catch (error) {
        console.error("[vault.remote-save-failed]", error);
        setCloudSyncState("error");
      }
    }, 1200);

    return () => {
      window.clearTimeout(timer);
    };
  }, [dataset, hydratedRemoteUserId, isReady, sessionUserId, supabase]);

  function updateDataset(updater: (current: PromptVaultDataset) => PromptVaultDataset) {
    startTransition(() => {
      setDataset((current) => {
        const aliasedCurrent = withDatasetAliases(current);
        const updated = updater(aliasedCurrent);

        if (updated === aliasedCurrent || updated === current) {
          return current;
        }

        return withDatasetAliases(updated);
      });
    });
  }

  function upsertEntry(input: EntryEditorInput, existingId?: string, options?: UpsertEntryOptions) {
    const now = new Date().toISOString();
    const entryId = existingId ?? `entry-${crypto.randomUUID()}`;
    let nextEntryId = entryId;

    updateDataset((current) => {
      const entries = getEntries(current);
      const { tagIds, newTags } = normalizeTags(current, input.tagNames);
      const basePayload = entryInputSchema.parse({
        ...input,
        projectId: input.projectId || input.collectionId || "",
        collectionId: input.projectId || input.collectionId || "",
        tagIds,
        sourceUrl: input.sourceUrl || "",
        sourceLabel: input.sourceLabel || ""
      });
      const existingEntry = entries.find((entry) => entry.id === entryId);
      const versionChainId = existingEntry?.versionChainId ?? `chain-${crypto.randomUUID()}`;
      const nextVersionNumber = existingEntry ? existingEntry.latestVersionNumber + 1 : 1;
      const versionId = buildVersionId(versionChainId, nextVersionNumber);
      const versionSource = options?.source ?? "manual";

      const nextEntry: EntryRecord = {
        ...existingEntry,
        ...basePayload,
        id: entryId,
        userId: existingEntry?.userId ?? "demo-user",
        projectId: basePayload.projectId || undefined,
        collectionId: basePayload.projectId || basePayload.collectionId || undefined,
        latestVersionId: versionId,
        latestVersionNumber: nextVersionNumber,
        versionChainId,
        createdAt: existingEntry?.createdAt ?? now,
        updatedAt: now
      };

      nextEntryId = nextEntry.id;
      const nextEntries = existingEntry
        ? entries.map((entry) => (entry.id === entryId ? nextEntry : entry))
        : [nextEntry, ...entries];

      return {
        ...current,
        tags: [
          ...current.tags,
          ...newTags.filter((tag) => !current.tags.some((item) => item.id === tag.id))
        ],
        drafts: current.drafts.filter(
          (draft) => draft.entryId !== nextEntry.id && draft.id !== buildDraftId(undefined)
        ),
        entries: nextEntries,
        prompts: nextEntries,
        versions: [
          ...current.versions,
          createVersionSnapshot({
            entry: nextEntry,
            versionId,
            versionNumber: nextVersionNumber,
            source: versionSource,
            createdAt: now,
            createdBy: "demo-user",
            changeSummary: options?.changeSummary,
            restoredFromVersionId: options?.restoredFromVersionId
          })
        ],
        activities: [
          {
            id: `activity-${crypto.randomUUID()}`,
            userId: "demo-user",
            type: existingEntry ? "version_created" : "created",
            entryId: nextEntry.id,
            promptId: nextEntry.id,
            entryTitle: nextEntry.title,
            promptTitle: nextEntry.title,
            createdAt: now,
            description: existingEntry
              ? `Saved version ${nextVersionNumber} for ${nextEntry.title}.`
              : `Captured ${nextEntry.title}.`
          },
          ...current.activities
        ],
        syncQueue: queueMutation(current, {
          entity: "entry",
          action: "upsert",
          targetId: nextEntry.id
        })
      };
    });

    notify(existingId ? "Saved as a new version in your local vault." : "Entry added to your vault.");

    return nextEntryId;
  }

  function saveDraft(input: EntryEditorInput, options?: { entryId?: string; draftId?: string }) {
    const now = new Date().toISOString();
    const nextDraftId = buildDraftId(options?.entryId, options?.draftId);

    updateDataset((current) => {
      const draft: EntryDraftRecord = {
        id: nextDraftId,
        entryId: options?.entryId,
        title: input.title,
        body: input.body,
        summary: input.summary || "",
        notes: input.notes || "",
        resultNotes: input.resultNotes || "",
        categoryId: input.categoryId,
        projectId: input.projectId || input.collectionId || undefined,
        type: input.type,
        language: input.language,
        platforms: input.platforms,
        tagIds: input.tagNames.map((tagName) => createTagId(tagName)),
        variables: input.variables,
        sourceLabel: input.sourceLabel || "",
        sourceUrl: input.sourceUrl || "",
        status: input.status,
        rating: input.rating,
        updatedAt: now,
        deviceId: "preview-device"
      };

      const existingDraft = current.drafts.find((item) => item.id === nextDraftId);
      if (existingDraft) {
        const currentShape = JSON.stringify({
          ...existingDraft,
          updatedAt: undefined
        });
        const nextShape = JSON.stringify({
          ...draft,
          updatedAt: undefined
        });

        if (currentShape === nextShape) {
          return current;
        }
      }

      const drafts = existingDraft
        ? current.drafts.map((item) => (item.id === nextDraftId ? draft : item))
        : [draft, ...current.drafts].slice(0, 30);

      return {
        ...current,
        drafts
      };
    });

    return nextDraftId;
  }

  function discardDraft(options?: { entryId?: string; draftId?: string }) {
    const targetId = buildDraftId(options?.entryId, options?.draftId);

    updateDataset((current) => {
      const drafts = current.drafts.filter(
        (draft) => draft.id !== targetId && draft.entryId !== options?.entryId
      );

      if (drafts.length === current.drafts.length) {
        return current;
      }

      return {
        ...current,
        drafts
      };
    });
  }

  function toggleFavorite(entryId: string) {
    updateDataset((current) => {
      const entries = getEntries(current).map((entry) =>
        entry.id === entryId
          ? { ...entry, isFavorite: !entry.isFavorite, updatedAt: new Date().toISOString() }
          : entry
      );

      return {
        ...current,
        entries,
        prompts: entries,
        syncQueue: queueMutation(current, {
          entity: "entry",
          action: "toggle_favorite",
          targetId: entryId
        })
      };
    });
  }

  function toggleArchive(entryId: string) {
    updateDataset((current) => {
      const entries = getEntries(current).map((entry) =>
        entry.id === entryId
          ? { ...entry, isArchived: !entry.isArchived, updatedAt: new Date().toISOString() }
          : entry
      );

      return {
        ...current,
        entries,
        prompts: entries,
        syncQueue: queueMutation(current, {
          entity: "entry",
          action: "toggle_archive",
          targetId: entryId
        })
      };
    });
  }

  function duplicateEntry(entryId: string) {
    const source = getEntries(dataset).find((entry) => entry.id === entryId);
    if (!source) {
      return null;
    }

    const duplicatedId = upsertEntry(
      {
        ...source,
        title: `${source.title} Copy`,
        projectId: source.projectId || source.collectionId || "",
        collectionId: source.projectId || source.collectionId || "",
        language: source.language === "tr" ? "tr" : "en",
        tagNames: source.tagIds.map(
          (tagId) => dataset.tags.find((tag) => tag.id === tagId)?.name ?? tagId
        )
      },
      undefined,
      {
        source: "duplicate",
        changeSummary: `Duplicated from ${source.title}.`
      }
    );
    notify("Created a duplicate with its own version chain.");

    return duplicatedId;
  }

  function restoreVersion(entryId: string, versionId: string) {
    let restored = false;
    const now = new Date().toISOString();

    updateDataset((current) => {
      const entries = getEntries(current);
      const existingEntry = entries.find((entry) => entry.id === entryId);
      const version = current.versions.find(
        (candidate) => candidate.id === versionId && candidate.entryId === entryId
      );

      if (!existingEntry || !version) {
        return current;
      }

      const nextVersionNumber = existingEntry.latestVersionNumber + 1;
      const nextVersionId = buildVersionId(existingEntry.versionChainId, nextVersionNumber);
      const restoredEntry: EntryRecord = {
        ...existingEntry,
        title: version.title,
        body: version.body,
        summary: version.summary,
        notes: version.notes,
        resultNotes: version.resultNotes,
        categoryId: version.categoryId,
        projectId: version.projectId,
        collectionId: version.projectId,
        type: version.type,
        platforms: version.platforms,
        tagIds: version.tagIds,
        latestVersionId: nextVersionId,
        latestVersionNumber: nextVersionNumber,
        updatedAt: now
      };

      restored = true;

      return {
        ...current,
        entries: entries.map((entry) => (entry.id === entryId ? restoredEntry : entry)),
        prompts: entries.map((entry) => (entry.id === entryId ? restoredEntry : entry)),
        versions: [
          ...current.versions,
          createVersionSnapshot({
            entry: restoredEntry,
            versionId: nextVersionId,
            versionNumber: nextVersionNumber,
            source: "restore",
            createdAt: now,
            createdBy: "demo-user",
            changeSummary: `Restored from v${version.versionNumber}.`,
            restoredFromVersionId: version.id
          })
        ],
        activities: [
          {
            id: `activity-${crypto.randomUUID()}`,
            userId: "demo-user",
            type: "version_created",
            entryId: restoredEntry.id,
            promptId: restoredEntry.id,
            entryTitle: restoredEntry.title,
            promptTitle: restoredEntry.title,
            createdAt: now,
            description: `Restored ${restoredEntry.title} from version ${version.versionNumber}.`
          },
          ...current.activities
        ],
        syncQueue: queueMutation(current, {
          entity: "entry",
          action: "upsert",
          targetId: restoredEntry.id
        })
      };
    });

    if (restored) {
      notify("Version restored as a new safe snapshot.");
    } else {
      notify("Version could not be restored.");
    }

    return restored;
  }

  function createProject(input: ProjectInput) {
    const parsed = input.name.trim();
    const projectId = input.id || `project-${crypto.randomUUID()}`;
    updateDataset((current) => {
      const projects = [
        {
          id: projectId,
          userId: "demo-user",
          name: parsed,
          description: input.description || undefined,
          color: input.color,
          icon: input.icon,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        ...getProjects(current)
      ];

      return {
        ...current,
        projects,
        collections: projects,
        syncQueue: queueMutation(current, {
          entity: "project",
          action: "create",
          targetId: projectId
        })
      };
    });
    notify("Project created.");

    return projectId;
  }

  function updatePreferences(input: Partial<UserPreferenceRecord>) {
    updateDataset((current) => ({
      ...current,
      preferences: {
        ...current.preferences,
        ...input
      },
      syncQueue: queueMutation(current, {
        entity: "preferences",
        action: "update_preferences"
      })
    }));
    notify("Preferences updated.");
  }

  function exportVault(format: "json" | "markdown" | "txt") {
    const filenameBase = `vault-export-${new Date().toISOString().slice(0, 10)}`;
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
          entryId: options?.promptId ?? undefined,
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
          entryId: options?.promptId ?? undefined,
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

  function setAISuggestionStatus(suggestionId: string, status: AISuggestionRecord["status"]) {
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
    const seed = withDatasetAliases(createDemoDataset());
    setDataset(seed);
    notify("Preview vault reset to the seeded dataset.");
  }

  return (
    <VaultContext.Provider
      value={{
        dataset,
        authMode,
        runtime,
        dashboard: createDashboardSnapshot(dataset),
        isReady,
        syncQueueCount: dataset.syncQueue.length,
        sessionUserId,
        isCloudSessionActive: Boolean(sessionUserId),
        cloudSyncState,
        upsertEntry,
        upsertPrompt: upsertEntry,
        saveDraft,
        discardDraft,
        toggleFavorite,
        toggleArchive,
        duplicateEntry,
        duplicatePrompt: duplicateEntry,
        restoreVersion,
        createProject,
        createCollection: createProject,
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
