import type {
  ActivityRecord,
  AISuggestionRecord,
  AIUsageRecord,
  CategoryDefinition,
  EntryDraftRecord,
  EntryRecord,
  OfflineMutationRecord,
  PlatformDefinition,
  PromptVaultDataset,
  PromptVersion,
  ProjectRecord,
  Tag,
  UserPreferenceRecord
} from "@prompt-vault/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { withDatasetAliases } from "@/lib/dataset";

interface RemoteVaultStateRow {
  user_id: string;
  state: PromptVaultDataset;
  updated_at: string;
}

function mergeById<T extends { id: string }>(
  remote: T[],
  local: T[],
  pickWinner: (remoteItem: T, localItem: T) => T
) {
  const map = new Map(remote.map((item) => [item.id, item]));

  for (const localItem of local) {
    const remoteItem = map.get(localItem.id);
    map.set(localItem.id, remoteItem ? pickWinner(remoteItem, localItem) : localItem);
  }

  return [...map.values()];
}

function pickMostRecent<T extends { updatedAt?: string; createdAt?: string }>(remoteItem: T, localItem: T) {
  const remoteStamp = remoteItem.updatedAt ?? remoteItem.createdAt ?? "";
  const localStamp = localItem.updatedAt ?? localItem.createdAt ?? "";

  return new Date(localStamp).getTime() >= new Date(remoteStamp).getTime() ? localItem : remoteItem;
}

function pickNewestVersion(remoteItem: PromptVersion, localItem: PromptVersion) {
  if (localItem.versionNumber !== remoteItem.versionNumber) {
    return localItem.versionNumber > remoteItem.versionNumber ? localItem : remoteItem;
  }

  return pickMostRecent(remoteItem, localItem);
}

function pickLatestPreference(remotePreferences: UserPreferenceRecord, localPreferences: UserPreferenceRecord) {
  return localPreferences;
}

function pickLocal<T>(_: T, localItem: T) {
  return localItem;
}

function mergeOfflineMutations(remote: OfflineMutationRecord[], local: OfflineMutationRecord[]) {
  return mergeById(remote, local, pickMostRecent).slice(0, 100);
}

export function mergeVaultDatasets(remoteState: PromptVaultDataset, localState: PromptVaultDataset) {
  const remote = withDatasetAliases(remoteState);
  const local = withDatasetAliases(localState);

  return withDatasetAliases({
    ...remote,
    preferences: pickLatestPreference(remote.preferences, local.preferences),
    categories: mergeById<CategoryDefinition>(remote.categories, local.categories, pickLocal),
    tags: mergeById<Tag>(remote.tags, local.tags, pickMostRecent),
    projects: mergeById<ProjectRecord>(remote.projects, local.projects, pickMostRecent),
    collections: mergeById<ProjectRecord>(remote.collections, local.collections, pickMostRecent),
    entries: mergeById<EntryRecord>(remote.entries, local.entries, pickMostRecent),
    prompts: mergeById<EntryRecord>(remote.prompts, local.prompts, pickMostRecent),
    drafts: mergeById<EntryDraftRecord>(remote.drafts, local.drafts, pickMostRecent),
    versions: mergeById<PromptVersion>(remote.versions, local.versions, pickNewestVersion),
    activities: mergeById<ActivityRecord>(remote.activities, local.activities, pickMostRecent),
    aiSuggestions: mergeById<AISuggestionRecord>(remote.aiSuggestions, local.aiSuggestions, pickMostRecent),
    aiUsage: mergeById<AIUsageRecord>(remote.aiUsage, local.aiUsage, pickMostRecent),
    syncQueue: mergeOfflineMutations(remote.syncQueue, local.syncQueue),
    platforms: mergeById<PlatformDefinition>(remote.platforms, local.platforms, pickLocal)
  });
}

export async function loadRemoteVaultState(
  supabase: SupabaseClient,
  userId: string
): Promise<PromptVaultDataset | null> {
  const { data, error } = await supabase
    .from("user_vault_state")
    .select("user_id, state, updated_at")
    .eq("user_id", userId)
    .maybeSingle<RemoteVaultStateRow>();

  if (error) {
    throw error;
  }

  if (!data?.state) {
    return null;
  }

  return withDatasetAliases(data.state);
}

export async function saveRemoteVaultState(
  supabase: SupabaseClient,
  userId: string,
  dataset: PromptVaultDataset
) {
  const { error } = await supabase.from("user_vault_state").upsert(
    {
      user_id: userId,
      state: withDatasetAliases(dataset)
    },
    {
      onConflict: "user_id"
    }
  );

  if (error) {
    throw error;
  }
}
