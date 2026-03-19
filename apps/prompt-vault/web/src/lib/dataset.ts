import type { EntryRecord, ProjectRecord, PromptVaultDataset } from "@prompt-vault/types";

export function getEntries(dataset: PromptVaultDataset): EntryRecord[] {
  return dataset.entries ?? dataset.prompts ?? [];
}

export function getProjects(dataset: PromptVaultDataset): ProjectRecord[] {
  return dataset.projects ?? dataset.collections ?? [];
}

export function withDatasetAliases(dataset: PromptVaultDataset): PromptVaultDataset {
  const entries = getEntries(dataset);
  const projects = getProjects(dataset);

  return {
    ...dataset,
    entries,
    prompts: entries,
    projects,
    collections: projects,
    drafts: dataset.drafts ?? [],
    syncQueue: dataset.syncQueue ?? []
  };
}
