import "server-only";

import {
  heuristicCategory,
  heuristicPlatforms,
  heuristicRewrite,
  heuristicSummary,
  heuristicTags,
  heuristicTitle
} from "@/lib/ai/heuristics";
import type {
  AIProvider,
  AIProviderResult,
  AITaskContext
} from "@/lib/ai/provider-types";
import type { AISuggestionPayload } from "@prompt-vault/types";

export class PreviewAIProvider implements AIProvider {
  readonly key = "preview" as const;
  readonly model = "preview-organizer-v1";

  isConfigured() {
    return true;
  }

  async generate<TPayload extends AISuggestionPayload>(
    task: AITaskContext
  ): Promise<AIProviderResult<TPayload>> {
    let payload: AISuggestionPayload;

    switch (task.action) {
      case "suggest_title":
        payload = heuristicTitle(task.prompt);
        break;
      case "suggest_category":
        payload = heuristicCategory(task.prompt);
        break;
      case "suggest_tags":
        payload = heuristicTags(task.prompt);
        break;
      case "suggest_platforms":
        payload = heuristicPlatforms(task.prompt);
        break;
      case "summarize":
        payload = heuristicSummary(task.prompt);
        break;
      case "rewrite_cleaner":
        payload = heuristicRewrite(task.prompt, "cleaner");
        break;
      case "make_shorter":
        payload = heuristicRewrite(task.prompt, "shorter");
        break;
      case "make_detailed":
        payload = heuristicRewrite(task.prompt, "detailed");
        break;
      default:
        throw new Error(`Unsupported preview AI action: ${task.action}`);
    }

    return {
      provider: this.key,
      model: this.model,
      payload: payload as TPayload
    };
  }
}
