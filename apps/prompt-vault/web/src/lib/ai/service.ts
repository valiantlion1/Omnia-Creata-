import "server-only";

import { heuristicSimilarPrompts } from "@/lib/ai/heuristics";
import type { AIProvider, AIProviderResult, AITaskContext } from "@/lib/ai/provider-types";
import { GroqProvider } from "@/lib/ai/providers/groq-provider";
import { OpenRouterProvider } from "@/lib/ai/providers/openrouter-provider";
import { PreviewAIProvider } from "@/lib/ai/providers/preview-provider";
import { TogetherProvider } from "@/lib/ai/providers/together-provider";
import { env, isAIProviderConfigured } from "@/lib/env";
import type { AIAssistRequest, AIProviderKey, AISuggestionPayload } from "@prompt-vault/types";

const providerMap: Record<AIProviderKey, () => AIProvider> = {
  preview: () => new PreviewAIProvider(),
  openrouter: () => new OpenRouterProvider(),
  groq: () => new GroqProvider(),
  together: () => new TogetherProvider()
};

function resolveProvider(preferred: AIProviderKey, fallback: AIProviderKey) {
  if (isAIProviderConfigured(preferred)) {
    return providerMap[preferred]();
  }

  return providerMap[fallback]();
}

export function getAIBackendConfig() {
  const active = resolveProvider(env.aiProvider, env.aiFallbackProvider);
  return {
    provider: active.key,
    model: active.model
  };
}

export async function runAIAssist(
  input: AIAssistRequest
): Promise<AIProviderResult<AISuggestionPayload>> {
  if (input.action === "find_similar") {
    return {
      provider: "preview",
      model: "similarity-jaccard-v1",
      payload: heuristicSimilarPrompts(input.prompt, input.library)
    };
  }

  const provider = resolveProvider(env.aiProvider, env.aiFallbackProvider);

  try {
    return await provider.generate({
      action: input.action,
      prompt: input.prompt,
      library: input.library
    } satisfies AITaskContext);
  } catch {
    if (provider.key === env.aiFallbackProvider) {
      throw new Error("AI provider failed and no secondary fallback is available.");
    }

    return providerMap[env.aiFallbackProvider]().generate({
      action: input.action,
      prompt: input.prompt,
      library: input.library
    } satisfies AITaskContext);
  }
}
