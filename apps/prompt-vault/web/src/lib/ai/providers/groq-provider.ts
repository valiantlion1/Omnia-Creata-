import "server-only";

import { OpenAICompatibleProvider } from "@/lib/ai/providers/openai-compatible-provider";
import { env } from "@/lib/env";

export class GroqProvider extends OpenAICompatibleProvider {
  constructor() {
    super({
      key: "groq",
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: env.groqApiKey
    });
  }
}
