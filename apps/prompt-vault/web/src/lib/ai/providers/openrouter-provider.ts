import "server-only";

import { OpenAICompatibleProvider } from "@/lib/ai/providers/openai-compatible-provider";
import { env } from "@/lib/env";

export class OpenRouterProvider extends OpenAICompatibleProvider {
  constructor() {
    super({
      key: "openrouter",
      baseUrl: "https://openrouter.ai/api/v1",
      apiKey: env.openRouterApiKey,
      extraHeaders: {
        "HTTP-Referer": env.siteUrl,
        "X-Title": "Prompt Vault"
      }
    });
  }
}
