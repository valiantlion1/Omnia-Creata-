import "server-only";

import { builtinCategories, platformCatalog } from "@prompt-vault/config";
import type { AITaskContext } from "@/lib/ai/provider-types";

export function buildSystemPrompt() {
  const categoryGuide = builtinCategories
    .map((category) => `${category.id}: ${category.label.en}`)
    .join(", ");
  const platformGuide = platformCatalog.map((platform) => platform.key).join(", ");

  return [
    "You are Nolra's AI organization assistant.",
    "You improve prompt organization and clarity only.",
    "You are not a general chat bot and must not introduce unrelated conversation.",
    "Return valid JSON only, with no markdown fences and no commentary outside JSON.",
    "Never overwrite user intent. Prefer concise, high-signal suggestions.",
    `Valid category ids: ${categoryGuide}.`,
    `Valid platform keys: ${platformGuide}.`
  ].join(" ");
}

export function buildUserPrompt(context: AITaskContext) {
  const actionInstructions: Record<AITaskContext["action"], string> = {
    suggest_title:
      'Return JSON with keys "title" and optional "rationale". Create a clean, reusable title under 80 characters.',
    suggest_category:
      'Return JSON with keys "categoryId" and optional "reason". Pick the best matching category id only.',
    suggest_tags:
      'Return JSON with keys "tags" and optional "reason". Suggest 4 to 8 concise lowercase tags.',
    suggest_platforms:
      'Return JSON with keys "platforms" and optional "reason". Suggest 1 to 4 platform keys.',
    summarize:
      'Return JSON with key "summary". Summarize the prompt in 1 or 2 compact sentences.',
    rewrite_cleaner:
      'Return JSON with keys "body", optional "summary", and optional "notes". Rewrite the prompt into a clearer reusable structure while preserving intent.',
    make_shorter:
      'Return JSON with keys "body", optional "summary", and optional "notes". Make the prompt shorter and tighter while keeping its purpose intact.',
    make_detailed:
      'Return JSON with keys "body", optional "summary", and optional "notes". Expand the prompt into a more detailed, production-ready version.'
  };

  return [
    actionInstructions[context.action],
    "",
    "Prompt record:",
    JSON.stringify(context.prompt),
    "",
    "Nearby library context:",
    JSON.stringify(context.library.slice(0, 10))
  ].join("\n");
}


