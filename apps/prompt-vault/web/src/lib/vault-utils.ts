import type {
  DashboardSnapshot,
  EntryFilters,
  EntryRecord,
  PromptVaultDataset
} from "@prompt-vault/types";
import { getEntries, getProjects } from "@/lib/dataset";

export const defaultFilters: EntryFilters = {
  query: "",
  categoryId: "all",
  projectId: "all",
  collectionId: "all",
  platform: "all",
  type: "all",
  language: "all",
  favoritesOnly: false,
  archivedOnly: false,
  tags: []
};

export function sortEntries(entries: EntryRecord[]) {
  return [...entries].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export const sortPrompts = sortEntries;

export function filterEntries(dataset: PromptVaultDataset, filters: EntryFilters) {
  const query = filters.query.trim().toLowerCase();
  const entries = getEntries(dataset);
  const activeProjectId = filters.projectId === "all" ? filters.collectionId : filters.projectId;

  return sortEntries(entries).filter((entry) => {
    const matchesQuery =
      !query ||
      [entry.title, entry.body, entry.summary, entry.notes, entry.resultNotes]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query)) ||
      entry.platforms.some((platform) => platform.toLowerCase().includes(query)) ||
      entry.tagIds.some((tagId) => {
        const tag = dataset.tags.find((candidate) => candidate.id === tagId);
        return tag?.name.toLowerCase().includes(query);
      });

    const matchesCategory = filters.categoryId === "all" || entry.categoryId === filters.categoryId;
    const matchesProject = activeProjectId === "all" || entry.projectId === activeProjectId || entry.collectionId === activeProjectId;
    const matchesPlatform =
      filters.platform === "all" || entry.platforms.includes(filters.platform);
    const matchesType = filters.type === "all" || entry.type === filters.type;
    const matchesLanguage = filters.language === "all" || entry.language === filters.language;
    const matchesFavorites = !filters.favoritesOnly || entry.isFavorite;
    const matchesArchived = !filters.archivedOnly || entry.isArchived;
    const matchesTags =
      filters.tags.length === 0 || filters.tags.every((tagId) => entry.tagIds.includes(tagId));

    return (
      matchesQuery &&
      matchesCategory &&
      matchesProject &&
      matchesPlatform &&
      matchesType &&
      matchesLanguage &&
      matchesFavorites &&
      matchesArchived &&
      matchesTags
    );
  });
}

export const filterPrompts = filterEntries;

export function createDashboardSnapshot(dataset: PromptVaultDataset): DashboardSnapshot {
  const entries = sortEntries(getEntries(dataset));
  const projects = getProjects(dataset);
  const countsByCategory = dataset.categories.map((category) => ({
    categoryId: category.id,
    count: entries.filter((entry) => entry.categoryId === category.id).length
  }));
  const platformCounts = dataset.platforms.map((platform) => ({
    platform: platform.key,
    count: entries.filter((entry) => entry.platforms.includes(platform.key)).length
  }));
  const tagCounts = dataset.tags.map((tag) => ({
    tagId: tag.id,
    count: entries.filter((entry) => entry.tagIds.includes(tag.id)).length
  }));

  return {
    totalEntries: entries.length,
    totalProjects: projects.length,
    totalCollections: projects.length,
    favoriteCount: entries.filter((entry) => entry.isFavorite).length,
    archivedCount: entries.filter((entry) => entry.isArchived).length,
    recentEntries: entries.slice(0, 4),
    recentlyUpdated: entries.slice(0, 5),
    promptsByCategory: countsByCategory.filter((item) => item.count > 0),
    promptsByPlatform: platformCounts.filter((item) => item.count > 0),
    topTags: tagCounts.filter((item) => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 6)
  };
}

export function getEntry(dataset: PromptVaultDataset, entryId: string) {
  return getEntries(dataset).find((entry) => entry.id === entryId);
}

export const getPrompt = getEntry;

export function getEntryVersions(dataset: PromptVaultDataset, entryId: string) {
  const entry = getEntry(dataset, entryId);
  if (!entry) {
    return [];
  }

  return dataset.versions
    .filter((version) => version.versionChainId === entry.versionChainId)
    .sort((left, right) => right.versionNumber - left.versionNumber);
}

export const getPromptVersions = getEntryVersions;
