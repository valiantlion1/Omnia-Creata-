import type {
  DashboardSnapshot,
  PromptFilters,
  PromptRecord,
  PromptVaultDataset
} from "@prompt-vault/types";

export const defaultFilters: PromptFilters = {
  query: "",
  categoryId: "all",
  collectionId: "all",
  platform: "all",
  type: "all",
  language: "all",
  favoritesOnly: false,
  archivedOnly: false,
  tags: []
};

export function sortPrompts(prompts: PromptRecord[]) {
  return [...prompts].sort((left, right) => {
    if (left.isPinned !== right.isPinned) {
      return left.isPinned ? -1 : 1;
    }

    return new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime();
  });
}

export function filterPrompts(dataset: PromptVaultDataset, filters: PromptFilters) {
  const query = filters.query.trim().toLowerCase();

  return sortPrompts(dataset.prompts).filter((prompt) => {
    const matchesQuery =
      !query ||
      [prompt.title, prompt.body, prompt.summary, prompt.notes, prompt.resultNotes]
        .filter(Boolean)
        .some((field) => field!.toLowerCase().includes(query)) ||
      prompt.platforms.some((platform) => platform.toLowerCase().includes(query)) ||
      prompt.tagIds.some((tagId) => {
        const tag = dataset.tags.find((candidate) => candidate.id === tagId);
        return tag?.name.toLowerCase().includes(query);
      });

    const matchesCategory = filters.categoryId === "all" || prompt.categoryId === filters.categoryId;
    const matchesCollection =
      filters.collectionId === "all" || prompt.collectionId === filters.collectionId;
    const matchesPlatform =
      filters.platform === "all" || prompt.platforms.includes(filters.platform);
    const matchesType = filters.type === "all" || prompt.type === filters.type;
    const matchesLanguage = filters.language === "all" || prompt.language === filters.language;
    const matchesFavorites = !filters.favoritesOnly || prompt.isFavorite;
    const matchesArchived = !filters.archivedOnly || prompt.isArchived;
    const matchesTags =
      filters.tags.length === 0 || filters.tags.every((tagId) => prompt.tagIds.includes(tagId));

    return (
      matchesQuery &&
      matchesCategory &&
      matchesCollection &&
      matchesPlatform &&
      matchesType &&
      matchesLanguage &&
      matchesFavorites &&
      matchesArchived &&
      matchesTags
    );
  });
}

export function createDashboardSnapshot(dataset: PromptVaultDataset): DashboardSnapshot {
  const prompts = sortPrompts(dataset.prompts);
  const countsByCategory = dataset.categories.map((category) => ({
    categoryId: category.id,
    count: dataset.prompts.filter((prompt) => prompt.categoryId === category.id).length
  }));
  const platformCounts = dataset.platforms.map((platform) => ({
    platform: platform.key,
    count: dataset.prompts.filter((prompt) => prompt.platforms.includes(platform.key)).length
  }));
  const tagCounts = dataset.tags.map((tag) => ({
    tagId: tag.id,
    count: dataset.prompts.filter((prompt) => prompt.tagIds.includes(tag.id)).length
  }));

  return {
    totalEntries: dataset.prompts.length,
    totalCollections: dataset.collections.length,
    favoriteCount: dataset.prompts.filter((prompt) => prompt.isFavorite).length,
    archivedCount: dataset.prompts.filter((prompt) => prompt.isArchived).length,
    recentEntries: prompts.slice(0, 4),
    recentlyUpdated: prompts.slice(0, 5),
    promptsByCategory: countsByCategory.filter((item) => item.count > 0),
    promptsByPlatform: platformCounts.filter((item) => item.count > 0),
    topTags: tagCounts.filter((item) => item.count > 0).sort((a, b) => b.count - a.count).slice(0, 6)
  };
}

export function getPrompt(dataset: PromptVaultDataset, promptId: string) {
  return dataset.prompts.find((prompt) => prompt.id === promptId);
}

export function getPromptVersions(dataset: PromptVaultDataset, promptId: string) {
  const prompt = getPrompt(dataset, promptId);
  if (!prompt) {
    return [];
  }

  return dataset.versions
    .filter((version) => version.id.startsWith(prompt.versionChainId))
    .sort((left, right) => right.versionNumber - left.versionNumber);
}
