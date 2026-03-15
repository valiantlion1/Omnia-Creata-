import "server-only";

import { OpenAICompatibleProvider } from "@/lib/ai/providers/openai-compatible-provider";
import { env } from "@/lib/env";

export class TogetherProvider extends OpenAICompatibleProvider {
  constructor() {
    super({
      key: "together",
      baseUrl: "https://api.together.xyz/v1",
      apiKey: env.togetherApiKey
    });
  }
}
