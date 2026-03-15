"use client";

import type { AIAssistRequest, AIAssistResponse } from "@prompt-vault/types";

export async function requestAIAssist(input: AIAssistRequest) {
  const startedAt = performance.now();
  const response = await fetch("/api/ai/assist", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(typeof json?.error === "string" ? json.error : "AI assistance failed.");
  }

  return {
    data: json as AIAssistResponse,
    latencyMs: Math.round(performance.now() - startedAt)
  };
}
