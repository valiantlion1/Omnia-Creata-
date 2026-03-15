import "server-only";

import { builtinCategories, platformCatalog } from "@prompt-vault/config";
import type {
  AICategorySuggestion,
  AILibraryContextItem,
  AIPlatformSuggestion,
  AIPromptInput,
  AIRewriteSuggestion,
  AISimilarPromptMatch,
  AISimilarPromptSuggestion,
  AISummarySuggestion,
  AITagSuggestion,
  AITitleSuggestion
} from "@prompt-vault/types";

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "that",
  "this",
  "from",
  "into",
  "your",
  "about",
  "have",
  "will",
  "would",
  "should",
  "could",
  "there",
  "their",
  "them",
  "then",
  "than",
  "also",
  "just",
  "like",
  "when",
  "where",
  "what",
  "which",
  "while",
  "make",
  "create",
  "prompt",
  "write",
  "using",
  "into",
  "more",
  "less",
  "very"
]);

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function keywordFrequency(value: string) {
  const counts = new Map<string, number>();
  tokenize(value).forEach((token) => {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  });
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function topKeywords(value: string, limit = 6) {
  return keywordFrequency(value)
    .slice(0, limit)
    .map(([token]) => token);
}

function firstMeaningfulSentence(value: string, maxLength = 100) {
  const sentence = value
    .split(/[\n.!?]/)
    .map((part) => part.trim())
    .find((part) => part.length > 20);

  if (!sentence) {
    return "";
  }

  return sentence.length > maxLength ? `${sentence.slice(0, maxLength - 1)}…` : sentence;
}

function shortParagraph(value: string, wordLimit: number) {
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length <= wordLimit) {
    return words.join(" ");
  }

  return `${words.slice(0, wordLimit).join(" ")}…`;
}

export function heuristicTitle(prompt: AIPromptInput): AITitleSuggestion {
  const sentence = firstMeaningfulSentence(prompt.title || prompt.body, 76);
  if (sentence && sentence.length <= 80 && sentence.split(" ").length <= 8) {
    return {
      title: toTitleCase(sentence.replace(/[:;,.-]+$/g, "")),
      rationale: "Built from the clearest lead sentence in the prompt."
    };
  }

  const title = toTitleCase(topKeywords(`${prompt.title ?? ""} ${prompt.body}`, 5).join(" "));
  return {
    title: title || "Refined Prompt Draft",
    rationale: "Built from the strongest recurring keywords in the prompt."
  };
}

export function heuristicCategory(prompt: AIPromptInput): AICategorySuggestion {
  const source = `${prompt.title ?? ""} ${prompt.summary ?? ""} ${prompt.body}`.toLowerCase();
  const categoryMatchers: Array<{ id: string; tokens: string[] }> = [
    { id: "cat-image", tokens: ["image", "visual", "render", "midjourney", "flux", "lighting"] },
    { id: "cat-video", tokens: ["video", "shot", "camera", "runway", "veo", "storyboard"] },
    { id: "cat-music", tokens: ["music", "song", "lyrics", "suno", "melody", "chorus"] },
    { id: "cat-coding", tokens: ["code", "react", "typescript", "debug", "refactor", "api"] },
    { id: "cat-marketing", tokens: ["ad", "marketing", "campaign", "landing", "brand", "copy"] },
    { id: "cat-agent", tokens: ["agent", "system prompt", "workflow automation", "assistant"] },
    { id: "cat-uiux", tokens: ["ux", "ui", "interface", "figma", "layout", "wireframe"] },
    { id: "cat-research", tokens: ["research", "analyze", "summary", "report", "compare"] },
    { id: "cat-business", tokens: ["business", "sales", "strategy", "pricing", "operations"] }
  ];

  const bestMatch = categoryMatchers
    .map((matcher) => ({
      id: matcher.id,
      score: matcher.tokens.filter((token) => source.includes(token)).length
    }))
    .sort((left, right) => right.score - left.score)[0];

  return {
    categoryId: bestMatch && bestMatch.score > 0 ? bestMatch.id : prompt.categoryId || "cat-other",
    reason:
      bestMatch && bestMatch.score > 0
        ? "The prompt language strongly matches this category's intent."
        : "No single category dominated, so the current or fallback category was kept."
  };
}

export function heuristicTags(prompt: AIPromptInput): AITagSuggestion {
  const keywords = topKeywords(
    `${prompt.title ?? ""} ${prompt.summary ?? ""} ${prompt.body} ${prompt.platforms.join(" ")} ${prompt.tagNames.join(" ")}`
  )
    .filter((keyword) => keyword.length > 3)
    .slice(0, 8);

  const tags = Array.from(new Set([...prompt.tagNames.map((tag) => tag.toLowerCase()), ...keywords]));

  return {
    tags: tags.slice(0, 8),
    reason: "Tags were derived from recurring terms, platforms, and the prompt's current focus."
  };
}

export function heuristicPlatforms(prompt: AIPromptInput): AIPlatformSuggestion {
  const source = `${prompt.title ?? ""} ${prompt.body}`.toLowerCase();
  const matches = platformCatalog
    .filter((platform) => source.includes(platform.key) || source.includes(platform.label.en.toLowerCase()))
    .map((platform) => platform.key);

  let fallback = prompt.platforms.filter(Boolean);
  if (fallback.length === 0) {
    const category = heuristicCategory(prompt).categoryId;
    if (category === "cat-image") fallback = ["midjourney", "flux"];
    else if (category === "cat-video") fallback = ["runway", "veo"];
    else if (category === "cat-music") fallback = ["suno"];
    else if (category === "cat-coding") fallback = ["codex", "cursor"];
    else fallback = ["generic"];
  }

  return {
    platforms: Array.from(new Set([...(matches.length > 0 ? matches : []), ...fallback])).slice(0, 4),
    reason: "Platforms were chosen from explicit mentions and the prompt's likely workflow."
  };
}

export function heuristicSummary(prompt: AIPromptInput): AISummarySuggestion {
  return {
    summary: shortParagraph(`${prompt.summary ?? ""} ${prompt.body}`.trim(), 32)
  };
}

export function heuristicRewrite(prompt: AIPromptInput, mode: "cleaner" | "shorter" | "detailed"): AIRewriteSuggestion {
  if (mode === "shorter") {
    return {
      body: shortParagraph(prompt.body, 65),
      summary: shortParagraph(prompt.body, 20),
      notes: "Condensed to the most important instructions and outcomes."
    };
  }

  if (mode === "detailed") {
    const categoryLabel =
      builtinCategories.find((category) => category.id === heuristicCategory(prompt).categoryId)?.label.en ??
      "General";
    return {
      body: [
        `Goal: ${firstMeaningfulSentence(prompt.body, 140) || "Produce a high-quality result."}`,
        "",
        "Context:",
        `- Prompt type: ${prompt.type ?? "prompt"}`,
        `- Category: ${categoryLabel}`,
        `- Intended platforms: ${(heuristicPlatforms(prompt).platforms || ["generic"]).join(", ")}`,
        "",
        "Instructions:",
        prompt.body.trim(),
        "",
        "Output requirements:",
        "- Be clear and specific.",
        "- Preserve the original intent.",
        "- Organize the response so it is easy to reuse."
      ].join("\n"),
      summary: shortParagraph(prompt.body, 24),
      notes: "Expanded with clearer sections, context, and output requirements."
    };
  }

  return {
    body: [
      "Goal:",
      firstMeaningfulSentence(prompt.body, 140) || prompt.title || "Create a strong result.",
      "",
      "Key Instructions:",
      prompt.body.trim(),
      "",
      "Output Expectations:",
      "- Keep the answer structured.",
      "- Stay aligned with the prompt's intent.",
      "- Avoid unnecessary filler."
    ].join("\n"),
    summary: shortParagraph(prompt.body, 24),
    notes: "Restructured into a cleaner reusable prompt format."
  };
}

function jaccardScore(left: string, right: string) {
  const leftTokens = new Set(tokenize(left));
  const rightTokens = new Set(tokenize(right));
  const intersection = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  const union = new Set([...leftTokens, ...rightTokens]).size;
  return union === 0 ? 0 : intersection / union;
}

function matchReason(candidate: AILibraryContextItem, score: number) {
  if (score > 0.55) {
    return `Strong overlap in intent, terminology, and likely usage with "${candidate.title}".`;
  }

  return `Shares several concepts or workflow terms with "${candidate.title}".`;
}

function similarMatches(
  prompt: AIPromptInput,
  library: AILibraryContextItem[],
  threshold: number,
  limit: number
): AISimilarPromptMatch[] {
  return library
    .filter((item) => item.id !== prompt.promptId)
    .map((item) => {
      const score = jaccardScore(
        `${prompt.title ?? ""} ${prompt.summary ?? ""} ${prompt.body}`,
        `${item.title} ${item.summary ?? ""} ${item.body}`
      );

      return {
        promptId: item.id,
        title: item.title,
        score,
        reason: matchReason(item, score)
      };
    })
    .filter((item) => item.score >= threshold)
    .sort((left, right) => right.score - left.score)
    .slice(0, limit);
}

export function heuristicSimilarPrompts(
  prompt: AIPromptInput,
  library: AILibraryContextItem[]
): AISimilarPromptSuggestion {
  return {
    possibleDuplicates: similarMatches(prompt, library, 0.52, 5),
    relatedPrompts: similarMatches(prompt, library, 0.26, 6)
  };
}
