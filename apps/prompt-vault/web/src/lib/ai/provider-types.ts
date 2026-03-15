import "server-only";

import type {
  AIAction,
  AILibraryContextItem,
  AIPromptInput,
  AIProviderKey,
  AISuggestionPayload
} from "@prompt-vault/types";

export interface AITaskContext {
  action: Exclude<AIAction, "find_similar">;
  prompt: AIPromptInput;
  library: AILibraryContextItem[];
}

export interface AIProviderResult<TPayload extends AISuggestionPayload> {
  provider: AIProviderKey;
  model: string;
  payload: TPayload;
}

export interface AIProvider {
  readonly key: AIProviderKey;
  readonly model: string;
  isConfigured(): boolean;
  generate<TPayload extends AISuggestionPayload>(
    task: AITaskContext
  ): Promise<AIProviderResult<TPayload>>;
}
