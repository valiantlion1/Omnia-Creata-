import { NextResponse, type NextRequest } from "next/server";
import { aiAssistRequestSchema } from "@prompt-vault/validation";
import { getAIBackendConfig, runAIAssist } from "@/lib/ai/service";
import { logAIRequest } from "@/lib/ai/logging";
import { checkAIRateLimit } from "@/lib/ai/rate-limit";
import { isAIEnabled } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function isSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

async function resolveActorId(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (user) {
      return { actorId: user.id, previewActorCookie: null as string | null };
    }
  }

  const existingCookie = request.cookies.get("pv-preview-actor")?.value;
  if (existingCookie) {
    return { actorId: existingCookie, previewActorCookie: null as string | null };
  }

  const fallback = `preview-${crypto.randomUUID()}`;
  return { actorId: fallback, previewActorCookie: fallback };
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const backend = getAIBackendConfig();

  if (!isAIEnabled) {
    return NextResponse.json({ error: "AI help is not available for this workspace." }, { status: 503 });
  }

  if (!isSameOrigin(request)) {
    await logAIRequest({
      requestId,
      actorId: "unknown",
      action: "suggest_title",
      provider: backend.provider,
      model: backend.model,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      errorMessage: "Blocked non same-origin AI request."
    });
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const { actorId, previewActorCookie } = await resolveActorId(request);
  const rateLimit = checkAIRateLimit(actorId);
  if (!rateLimit.allowed) {
    await logAIRequest({
      requestId,
      actorId,
      action: "suggest_title",
      provider: backend.provider,
      model: backend.model,
      status: "rate_limited",
      latencyMs: Date.now() - startedAt,
      errorMessage: "AI rate limit exceeded."
    });
    const response = NextResponse.json(
      {
        error: "Rate limit exceeded.",
        rateLimit
      },
      { status: 429 }
    );
    if (previewActorCookie) {
      response.cookies.set("pv-preview-actor", previewActorCookie, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365
      });
    }
    response.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    response.headers.set("X-RateLimit-Reset", rateLimit.resetAt);
    return response;
  }

  try {
    const json = await request.json();
    const input = aiAssistRequestSchema.parse(json);
    const result = await runAIAssist(input);
    await logAIRequest({
      requestId,
      actorId,
      action: input.action,
      provider: result.provider,
      model: result.model,
      promptId: input.prompt.promptId,
      status: "success",
      latencyMs: Date.now() - startedAt
    });

    const response = NextResponse.json({
      requestId,
      action: input.action,
      provider: result.provider,
      model: result.model,
      payload: result.payload,
      rateLimit
    });

    if (previewActorCookie) {
      response.cookies.set("pv-preview-actor", previewActorCookie, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365
      });
    }

    response.headers.set("X-RateLimit-Limit", String(rateLimit.limit));
    response.headers.set("X-RateLimit-Remaining", String(rateLimit.remaining));
    response.headers.set("X-RateLimit-Reset", rateLimit.resetAt);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI assistance failed.";
    await logAIRequest({
      requestId,
      actorId,
      action: "suggest_title",
      provider: backend.provider,
      model: backend.model,
      status: "failed",
      latencyMs: Date.now() - startedAt,
      errorMessage: message
    });

    const response = NextResponse.json({ error: message }, { status: 400 });
    if (previewActorCookie) {
      response.cookies.set("pv-preview-actor", previewActorCookie, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 365
      });
    }
    return response;
  }
}
