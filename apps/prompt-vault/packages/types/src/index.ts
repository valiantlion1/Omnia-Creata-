export const appName = "Nolra";
export const parentBrand = "Omnia Creata";
export const parentDomain = "omniacreata.com";

export const locales = ["en", "tr"] as const;
export type Locale = (typeof locales)[number];

export const entryTypes = [
  "prompt",
  "idea",
  "workflow",
  "template",
  "system_prompt",
  "agent_instruction",
  "text_block",
  "note",
] as const;

export const promptTypes = entryTypes;

export type EntryType = (typeof entryTypes)[number];
export type PromptType = EntryType;

export const entryStatuses = ["draft", "active", "reviewed", "archived"] as const;
export const promptStatuses = entryStatuses;
export type EntryStatus = (typeof entryStatuses)[number];
export type PromptStatus = EntryStatus;

export interface LocalizedLabel {
  en: string;
  tr: string;
}

export interface CategoryDefinition {
  id: string;
  key: string;
  label: LocalizedLabel;
  description: LocalizedLabel;
  tone: "teal" | "amber" | "coral" | "blue" | "ink" | "sage";
  icon: string;
  isSystem: boolean;
}

export interface PlatformDefinition {
  id: string;
  key: string;
  label: LocalizedLabel;
  shortLabel: LocalizedLabel;
}

export interface PromptVariableDefinition {
  id: string;
  key: string;
  label: string;
  description?: string;
  defaultValue?: string;
  required?: boolean;
}

export const versionSources = [
  "manual",
  "autosave",
  "restore",
  "ai_refine",
  "duplicate",
  "merge"
] as const;

export type VersionSource = (typeof versionSources)[number];

export interface PromptVersion {
  id: string;
  entryId: string;
  versionChainId: string;
  versionNumber: number;
  title: string;
  body: string;
  summary?: string;
  notes?: string;
  resultNotes?: string;
  categoryId: string;
  projectId?: string;
  type: EntryType;
  platforms: string[];
  tagIds: string[];
  source: VersionSource;
  changeSummary?: string;
  restoredFromVersionId?: string;
  createdAt: string;
  createdBy: string;
}

export interface ProjectRecord {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  entryCount?: number;
  createdAt: string;
  updatedAt: string;
}

export type Collection = ProjectRecord;

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface EntryRecord {
  id: string;
  userId: string;
  title: string;
  body: string;
  summary?: string;
  notes?: string;
  resultNotes?: string;
  recommendedVariations?: string;
  categoryId: string;
  projectId?: string;
  collectionId?: string;
  type: EntryType;
  language: Locale | string;
  platforms: string[];
  tagIds: string[];
  isFavorite: boolean;
  isArchived: boolean;
  isPinned: boolean;
  status: EntryStatus;
  rating?: number;
  latestVersionId: string;
  latestVersionNumber: number;
  versionChainId: string;
  sourceUrl?: string;
  sourceLabel?: string;
  variables: PromptVariableDefinition[];
  createdAt: string;
  updatedAt: string;
}

export type PromptRecord = EntryRecord;

export interface EntryDraftRecord {
  id: string;
  entryId?: string;
  title: string;
  body: string;
  summary?: string;
  notes?: string;
  resultNotes?: string;
  categoryId: string;
  projectId?: string;
  type: EntryType;
  language: Locale | string;
  platforms: string[];
  tagIds: string[];
  variables: PromptVariableDefinition[];
  sourceLabel?: string;
  sourceUrl?: string;
  status?: EntryStatus;
  rating?: number;
  updatedAt: string;
  deviceId?: string;
}

export interface UserPreferenceRecord {
  language: Locale;
  theme: "system" | "light" | "dark";
  density: "comfortable" | "compact";
  defaultView: "list" | "grid";
  enableOfflineCache: boolean;
}

export interface OfflineMutationRecord {
  id: string;
  entity: "entry" | "project" | "preferences";
  action:
    | "upsert"
    | "create"
    | "toggle_favorite"
    | "toggle_archive"
    | "duplicate"
    | "update_preferences";
  targetId?: string;
  createdAt: string;
}

export type AIAction =
  | "suggest_title"
  | "suggest_category"
  | "suggest_tags"
  | "suggest_platforms"
  | "summarize"
  | "rewrite_cleaner"
  | "make_shorter"
  | "make_detailed"
  | "find_similar";

export type AIProviderKey = "preview" | "openrouter" | "groq" | "together";

export interface AIPromptInput {
  entryId?: string;
  promptId?: string;
  title?: string;
  body: string;
  summary?: string;
  notes?: string;
  resultNotes?: string;
  categoryId?: string;
  projectId?: string;
  collectionId?: string;
  language: Locale;
  type?: EntryType;
  platforms: string[];
  tagNames: string[];
  variables: PromptVariableDefinition[];
}

export interface AILibraryContextItem {
  id: string;
  title: string;
  body: string;
  summary?: string;
  categoryId?: string;
  platforms: string[];
  tagNames: string[];
}

export interface AISimilarPromptMatch {
  entryId?: string;
  promptId: string;
  title: string;
  score: number;
  reason: string;
}

export interface AITitleSuggestion {
  title: string;
  rationale?: string;
}

export interface AICategorySuggestion {
  categoryId: string;
  reason?: string;
}

export interface AITagSuggestion {
  tags: string[];
  reason?: string;
}

export interface AIPlatformSuggestion {
  platforms: string[];
  reason?: string;
}

export interface AISummarySuggestion {
  summary: string;
}

export interface AIRewriteSuggestion {
  body: string;
  summary?: string;
  notes?: string;
}

export interface AISimilarPromptSuggestion {
  possibleDuplicates: AISimilarPromptMatch[];
  relatedPrompts: AISimilarPromptMatch[];
}

export type AISuggestionPayload =
  | AITitleSuggestion
  | AICategorySuggestion
  | AITagSuggestion
  | AIPlatformSuggestion
  | AISummarySuggestion
  | AIRewriteSuggestion
  | AISimilarPromptSuggestion;

export interface AISuggestionRecord {
  id: string;
  entryId?: string;
  promptId?: string;
  action: AIAction;
  provider: AIProviderKey;
  model: string;
  status: "pending" | "applied" | "rejected";
  payload: AISuggestionPayload;
  createdAt: string;
  updatedAt: string;
}

export interface AIUsageRecord {
  id: string;
  actorId: string;
  action: AIAction;
  provider: AIProviderKey;
  model: string;
  status: "success" | "rate_limited" | "failed";
  entryId?: string;
  promptId?: string;
  createdAt: string;
  latencyMs: number;
}

export interface AIAssistResponse {
  requestId: string;
  action: AIAction;
  provider: AIProviderKey;
  model: string;
  payload: AISuggestionPayload;
  rateLimit: {
    limit: number;
    remaining: number;
    resetAt: string;
  };
}

export interface AIAssistRequest {
  action: AIAction;
  prompt: AIPromptInput;
  library: AILibraryContextItem[];
}

export interface ActivityRecord {
  id: string;
  userId: string;
  type:
    | "created"
    | "updated"
    | "favorited"
    | "archived"
    | "version_created"
    | "exported";
  entryId?: string;
  promptId?: string;
  entryTitle?: string;
  promptTitle?: string;
  createdAt: string;
  description: string;
}

export interface EntryFilters {
  query: string;
  categoryId: string | "all";
  projectId: string | "all";
  collectionId: string | "all";
  platform: string | "all";
  type: EntryType | "all";
  language: Locale | "all";
  favoritesOnly: boolean;
  archivedOnly: boolean;
  tags: string[];
}

export type PromptFilters = EntryFilters;

export interface DashboardSnapshot {
  totalEntries: number;
  totalProjects: number;
  totalCollections: number;
  favoriteCount: number;
  archivedCount: number;
  recentEntries: EntryRecord[];
  recentlyUpdated: EntryRecord[];
  promptsByCategory: Array<{ categoryId: string; count: number }>;
  promptsByPlatform: Array<{ platform: string; count: number }>;
  topTags: Array<{ tagId: string; count: number }>;
}

export interface VaultDataset {
  categories: CategoryDefinition[];
  platforms: PlatformDefinition[];
  projects: ProjectRecord[];
  collections: Collection[];
  tags: Tag[];
  entries: EntryRecord[];
  prompts: PromptRecord[];
  drafts: EntryDraftRecord[];
  versions: PromptVersion[];
  activities: ActivityRecord[];
  aiSuggestions: AISuggestionRecord[];
  aiUsage: AIUsageRecord[];
  preferences: UserPreferenceRecord;
  syncQueue: OfflineMutationRecord[];
}

export type PromptVaultDataset = VaultDataset;

export interface AuthMode {
  enabled: boolean;
  strategy: "supabase" | "preview";
}
