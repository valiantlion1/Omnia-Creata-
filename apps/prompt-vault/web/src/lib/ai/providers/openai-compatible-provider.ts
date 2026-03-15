import "server-only";

import { env } from "@/lib/env";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/ai/prompts";
import type {
  AIProvider,
  AIProviderResult,
  AITaskContext
} from "@/lib/ai/provider-types";
import type { AIProviderKey, AISuggestionPayload } from "@prompt-vault/types";
import { aiSuggestionSchemas } from "@prompt-vault/validation";

interface OpenAICompatibleProviderOptions {
  key: AIProviderKey;
  baseUrl: string;
  apiKey: string;
  model?: string;
  extraHeaders?: Record<string, string>;
}

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ type?: string; text?: string }>;
    };
  }>;
}

function extractTextContent(response: ChatCompletionResponse) {
  const content = response.choices?.[0]?.message?.content;
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => (part.type === "text" ? part.text ?? "" : ""))
      .join("")
      .trim();
  }

  return "";
}

function parseModelJson<TPayload extends AISuggestionPayload>(
  action: AITaskContext["action"],
  raw: string
) {
  const normalized = raw.trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/i, "").trim();
  const schema = aiSuggestionSchemas[action];
  return schema.parse(JSON.parse(normalized)) as TPayload;
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly key: AIProviderKey;
  readonly model: string;

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly extraHeaders?: Record<string, string>;

  constructor(options: OpenAICompatibleProviderOptions) {
    this.key = options.key;
    this.baseUrl = options.baseUrl;
    this.apiKey = options.apiKey;
    this.model = options.model ?? env.aiModel;
    this.extraHeaders = options.extraHeaders;
  }

  isConfigured() {
    return Boolean(this.apiKey);
  }

  async generate<TPayload extends AISuggestionPayload>(
    task: AITaskContext
  ): Promise<AIProviderResult<TPayload>> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
        ...this.extraHeaders
      },
      body: JSON.stringify({
        model: this.model,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: buildSystemPrompt()
          },
          {
            role: "user",
            content: buildUserPrompt(task)
          }
        ]
      })
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`${this.key} request failed: ${response.status} ${message}`);
    }

    const json = (await response.json()) as ChatCompletionResponse;
    const content = extractTextContent(json);
    if (!content) {
      throw new Error(`${this.key} returned an empty completion.`);
    }

    return {
      provider: this.key,
      model: this.model,
      payload: parseModelJson<TPayload>(task.action, content)
    };
  }
}
