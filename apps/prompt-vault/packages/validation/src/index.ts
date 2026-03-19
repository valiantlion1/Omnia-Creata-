import { entryStatuses, entryTypes, locales, promptTypes } from "@prompt-vault/types";
import { z } from "zod";

export const promptVariableSchema = z.object({
  id: z.string().min(1),
  key: z
    .string()
    .min(1)
    .regex(/^[a-zA-Z0-9_-]+$/),
  label: z.string().min(1),
  description: z.string().optional(),
  defaultValue: z.string().optional(),
  required: z.boolean().optional()
});

export const entryInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(2).max(180),
  body: z.string().min(10),
  summary: z.string().max(280).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
  resultNotes: z.string().max(5000).optional().or(z.literal("")),
  recommendedVariations: z.string().max(5000).optional().or(z.literal("")),
  categoryId: z.string().min(1),
  projectId: z.string().optional().or(z.literal("")),
  collectionId: z.string().optional().or(z.literal("")),
  type: z.enum(entryTypes),
  language: z.enum(locales),
  platforms: z.array(z.string()).max(8),
  tagIds: z.array(z.string()).max(20),
  isFavorite: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  isPinned: z.boolean().default(false),
  status: z.enum(entryStatuses),
  rating: z.number().min(1).max(5).optional(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  sourceLabel: z.string().max(120).optional().or(z.literal("")),
  variables: z.array(promptVariableSchema).max(25)
});

export const promptInputSchema = entryInputSchema;

export const projectInputSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2).max(80),
  description: z.string().max(240).optional().or(z.literal("")),
  color: z.string().min(1).max(30),
  icon: z.string().min(1).max(30)
});

export const collectionInputSchema = projectInputSchema;

export const aiActionSchema = z.enum([
  "suggest_title",
  "suggest_category",
  "suggest_tags",
  "suggest_platforms",
  "summarize",
  "rewrite_cleaner",
  "make_shorter",
  "make_detailed",
  "find_similar"
]);

export const aiPromptInputSchema = z.object({
  entryId: z.string().optional(),
  promptId: z.string().optional(),
  title: z.string().max(180).optional().or(z.literal("")),
  body: z.string().min(10).max(20000),
  summary: z.string().max(600).optional().or(z.literal("")),
  notes: z.string().max(5000).optional().or(z.literal("")),
  resultNotes: z.string().max(5000).optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  projectId: z.string().optional().or(z.literal("")),
  collectionId: z.string().optional().or(z.literal("")),
  language: z.enum(locales),
  type: z.enum(promptTypes).optional(),
  platforms: z.array(z.string().min(1)).max(8),
  tagNames: z.array(z.string().min(1).max(40)).max(20),
  variables: z.array(promptVariableSchema).max(25)
});

export const aiLibraryContextItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).max(180),
  body: z.string().min(1).max(8000),
  summary: z.string().max(600).optional().or(z.literal("")),
  categoryId: z.string().optional().or(z.literal("")),
  platforms: z.array(z.string().min(1)).max(8),
  tagNames: z.array(z.string().min(1).max(40)).max(20)
});

export const aiAssistRequestSchema = z.object({
  action: aiActionSchema,
  prompt: aiPromptInputSchema,
  library: z.array(aiLibraryContextItemSchema).max(40).default([])
});

export const aiSimilarPromptMatchSchema = z.object({
  promptId: z.string().min(1),
  title: z.string().min(1).max(180),
  score: z.number().min(0).max(1),
  reason: z.string().min(1).max(240)
});

export const aiTitleSuggestionSchema = z.object({
  title: z.string().min(2).max(180),
  rationale: z.string().max(240).optional()
});

export const aiCategorySuggestionSchema = z.object({
  categoryId: z.string().min(1),
  reason: z.string().max(240).optional()
});

export const aiTagSuggestionSchema = z.object({
  tags: z.array(z.string().min(1).max(40)).min(1).max(12),
  reason: z.string().max(240).optional()
});

export const aiPlatformSuggestionSchema = z.object({
  platforms: z.array(z.string().min(1).max(40)).min(1).max(5),
  reason: z.string().max(240).optional()
});

export const aiSummarySuggestionSchema = z.object({
  summary: z.string().min(8).max(600)
});

export const aiRewriteSuggestionSchema = z.object({
  body: z.string().min(10).max(20000),
  summary: z.string().max(600).optional(),
  notes: z.string().max(1200).optional()
});

export const aiSimilarPromptSuggestionSchema = z.object({
  possibleDuplicates: z.array(aiSimilarPromptMatchSchema).max(8),
  relatedPrompts: z.array(aiSimilarPromptMatchSchema).max(8)
});

export const aiSuggestionSchemas = {
  suggest_title: aiTitleSuggestionSchema,
  suggest_category: aiCategorySuggestionSchema,
  suggest_tags: aiTagSuggestionSchema,
  suggest_platforms: aiPlatformSuggestionSchema,
  summarize: aiSummarySuggestionSchema,
  rewrite_cleaner: aiRewriteSuggestionSchema,
  make_shorter: aiRewriteSuggestionSchema,
  make_detailed: aiRewriteSuggestionSchema,
  find_similar: aiSimilarPromptSuggestionSchema
} as const;

export type EntryInput = z.infer<typeof entryInputSchema>;
export type PromptInput = EntryInput;
export type ProjectInput = z.infer<typeof projectInputSchema>;
export type CollectionInput = ProjectInput;
export type AIAssistRequest = z.infer<typeof aiAssistRequestSchema>;
