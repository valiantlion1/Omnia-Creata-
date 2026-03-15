export const appName = "Prompt Vault";
export const parentBrand = "Omnia Creata";
export const parentDomain = "omniacreata.com";

export const locales = ["en", "tr"] as const;
export type Locale = (typeof locales)[number];

export const promptTypes = [
  "prompt",
  "idea",
  "workflow",
  "template",
  "system_prompt",
  "agent_instruction",
  "text_block",
  "note",
] as const;

export type PromptType = (typeof promptTypes)[number];

export const promptStatuses = ["draft", "active", "reviewed", "archived"] as const;
export type PromptStatus = (typeof promptStatuses)[number];

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

export interface PromptVersion {
  id: string;
  versionNumber: number;
  body: string;
  summary?: string;
  resultNotes?: string;
  createdAt: string;
  createdBy: string;
}

export interface Collection {
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

export interface Tag {
  id: string;
  userId: string;
  name: string;
  color?: string;
  createdAt: string;
}

export interface PromptRecord {
  id: string;
  userId: string;
  title: string;
  body: string;
  summary?: string;
  notes?: string;
  resultNotes?: string;
  recommendedVariations?: string;
  categoryId: string;
  collectionId?: string;
  type: PromptType;
  language: Locale | string;
  platforms: string[];
  tagIds: string[];
  isFavorite: boolean;
  isArchived: boolean;
  isPinned: boolean;
  status: PromptStatus;
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

export interface UserPreferenceRecord {
  language: Locale;
  theme: "system" | "light" | "dark";
  density: "comfortable" | "compact";
  defaultView: "list" | "grid";
  enableOfflineCache: boolean;
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
  promptId?: string;
  title?: string;
  body: string;
  summary?: string;
  notes?: string;
  resultNotes?: string;
  categoryId?: string;
  collectionId?: string;
  language: Locale;
  type?: PromptType;
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
  promptId?: string;
  promptTitle?: string;
  createdAt: string;
  description: string;
}

export interface PromptFilters {
  query: string;
  categoryId: string | "all";
  collectionId: string | "all";
  platform: string | "all";
  type: PromptType | "all";
  language: Locale | "all";
  favoritesOnly: boolean;
  archivedOnly: boolean;
  tags: string[];
}

export interface DashboardSnapshot {
  totalEntries: number;
  totalCollections: number;
  favoriteCount: number;
  archivedCount: number;
  recentEntries: PromptRecord[];
  recentlyUpdated: PromptRecord[];
  promptsByCategory: Array<{ categoryId: string; count: number }>;
  promptsByPlatform: Array<{ platform: string; count: number }>;
  topTags: Array<{ tagId: string; count: number }>;
}

export interface PromptVaultDataset {
  categories: CategoryDefinition[];
  platforms: PlatformDefinition[];
  collections: Collection[];
  tags: Tag[];
  prompts: PromptRecord[];
  versions: PromptVersion[];
  activities: ActivityRecord[];
  aiSuggestions: AISuggestionRecord[];
  aiUsage: AIUsageRecord[];
  preferences: UserPreferenceRecord;
}

export interface AuthMode {
  enabled: boolean;
  strategy: "supabase" | "preview";
}
