import "server-only";

import type { AIAction, AIProviderKey } from "@prompt-vault/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface AIRequestLogInput {
  requestId: string;
  actorId: string;
  action: AIAction;
  provider: AIProviderKey;
  model: string;
  status: "success" | "rate_limited" | "failed";
  promptId?: string;
  latencyMs: number;
  errorMessage?: string;
}

declare global {
  var __promptVaultAIUsageStore: AIRequestLogInput[] | undefined;
}

const usageStore = globalThis.__promptVaultAIUsageStore ?? [];
globalThis.__promptVaultAIUsageStore = usageStore;

export async function logAIRequest(input: AIRequestLogInput) {
  usageStore.push(input);
  if (usageStore.length > 200) {
    usageStore.shift();
  }

  console.info("[prompt-vault.ai]", JSON.stringify(input));

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return;
  }

  try {
    await admin.from("ai_requests").insert({
      id: input.requestId,
      actor_id: input.actorId,
      action: input.action,
      provider: input.provider,
      model: input.model,
      status: input.status,
      prompt_id: input.promptId ?? null,
      latency_ms: input.latencyMs,
      error_message: input.errorMessage ?? null
    });
  } catch (error) {
    console.error("[prompt-vault.ai.log-failed]", error);
  }
}
