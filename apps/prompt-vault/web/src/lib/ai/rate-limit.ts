import "server-only";

import { env } from "@/lib/env";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

declare global {
  var __promptVaultAIRateLimitStore: Map<string, RateLimitEntry> | undefined;
}

const store = globalThis.__promptVaultAIRateLimitStore ?? new Map<string, RateLimitEntry>();
globalThis.__promptVaultAIRateLimitStore = store;

export interface AIRateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: string;
}

export function checkAIRateLimit(actorId: string) {
  const now = Date.now();
  const windowMs = env.aiRateLimitWindowSeconds * 1000;
  const key = `ai:${actorId}`;
  const current = store.get(key);

  if (!current || now >= current.resetAt) {
    const nextEntry = {
      count: 1,
      resetAt: now + windowMs
    };
    store.set(key, nextEntry);
    return {
      allowed: true,
      limit: env.aiRateLimitMaxRequests,
      remaining: Math.max(env.aiRateLimitMaxRequests - 1, 0),
      resetAt: new Date(nextEntry.resetAt).toISOString()
    } satisfies AIRateLimitResult;
  }

  if (current.count >= env.aiRateLimitMaxRequests) {
    return {
      allowed: false,
      limit: env.aiRateLimitMaxRequests,
      remaining: 0,
      resetAt: new Date(current.resetAt).toISOString()
    } satisfies AIRateLimitResult;
  }

  current.count += 1;
  store.set(key, current);

  return {
    allowed: true,
    limit: env.aiRateLimitMaxRequests,
    remaining: Math.max(env.aiRateLimitMaxRequests - current.count, 0),
    resetAt: new Date(current.resetAt).toISOString()
  } satisfies AIRateLimitResult;
}
