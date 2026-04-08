import type { CheckRunPayload } from "@ocos/contracts";

import { verifySignature } from "./signing";

type Env = {
  OCOS_API_BASE_URL: string;
  OCOS_INTERNAL_API_TOKEN: string;
  OCOS_WEBHOOK_SIGNING_SECRET: string;
  OCOS_TELEGRAM_BOT_TOKEN?: string;
  OCOS_TELEGRAM_CHAT_ID?: string;
  OCOS_STUDIO_PROD_BASE_URL?: string;
  OCOS_STUDIO_STAGING_BASE_URL?: string;
};

async function timedFetch(url: string): Promise<{
  ok: boolean;
  statusCode?: number;
  latencyMs: number;
  body?: string;
}> {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "ocos-worker/0.1"
      }
    });
    return {
      ok: response.ok,
      statusCode: response.status,
      latencyMs: Date.now() - startedAt,
      body: await response.text()
    };
  } catch {
    return {
      ok: false,
      latencyMs: Date.now() - startedAt
    };
  }
}

async function probeStudioEnvironment(
  env: Env,
  environmentSlug: "staging" | "production"
): Promise<CheckRunPayload> {
  const baseUrl =
    environmentSlug === "production"
      ? env.OCOS_STUDIO_PROD_BASE_URL ?? "https://studio.omniacreata.com"
      : env.OCOS_STUDIO_STAGING_BASE_URL ?? "https://staging-studio.omniacreata.com";

  const [loginResult, healthResult, versionResult] = await Promise.all([
    timedFetch(`${baseUrl}/login`),
    timedFetch(`${baseUrl}/api/v1/healthz`),
    timedFetch(`${baseUrl}/api/v1/version`)
  ]);

  let healthStatus: string | undefined;
  let versionBuild: string | undefined;
  const loginOk = Boolean(loginResult.ok && loginResult.body?.includes("OmniaCreata Studio"));

  if (healthResult.body) {
    try {
      const payload = JSON.parse(healthResult.body) as { status?: string };
      healthStatus = payload.status;
    } catch {
      healthStatus = undefined;
    }
  }

  if (versionResult.body) {
    try {
      const payload = JSON.parse(versionResult.body) as { build?: string; bootBuild?: string };
      versionBuild = payload.bootBuild ?? payload.build;
    } catch {
      versionBuild = undefined;
    }
  }

  const hardDown = !loginResult.ok || !healthResult.ok || !versionResult.ok;
  const degraded = !hardDown && healthStatus && !["ok", "healthy", "pass"].includes(healthStatus.toLowerCase());

  return {
    serviceSlug: "studio",
    environmentSlug,
    runType: "public_probe",
    source: "cloudflare-worker",
    status: hardDown ? "failed" : degraded ? "degraded" : "healthy",
    summary: hardDown
      ? `Worker probe saw Studio ${environmentSlug} fail at least one public path.`
      : degraded
        ? `Worker probe saw Studio ${environmentSlug} return ${healthStatus}.`
        : `Worker probe saw healthy Studio ${environmentSlug} signals.`,
    healthStatus,
    loginOk,
    versionBuild,
    checkedPaths: [
      {
        path: "/login",
        ok: loginOk,
        statusCode: loginResult.statusCode,
        latencyMs: loginResult.latencyMs
      },
      {
        path: "/api/v1/healthz",
        ok: healthResult.ok,
        statusCode: healthResult.statusCode,
        latencyMs: healthResult.latencyMs
      },
      {
        path: "/api/v1/version",
        ok: versionResult.ok,
        statusCode: versionResult.statusCode,
        latencyMs: versionResult.latencyMs
      }
    ],
    artifacts: [],
    metadata: {
      baseUrl
    }
  };
}

async function forwardJson(env: Env, path: string, payload: unknown) {
  const response = await fetch(`${env.OCOS_API_BASE_URL}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-ocos-internal-token": env.OCOS_INTERNAL_API_TOKEN
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(
      typeof data === "object" && data && "message" in data
        ? String(data.message)
        : `Forward failed with ${response.status}`
    );
  }

  return data as Record<string, unknown>;
}

async function sendTelegram(env: Env, notification: Record<string, unknown> | null | undefined) {
  if (!env.OCOS_TELEGRAM_BOT_TOKEN || !env.OCOS_TELEGRAM_CHAT_ID || !notification) {
    return;
  }

  if (notification.shouldNotify !== true || notification.channel !== "telegram") {
    return;
  }

  const message = [notification.title, notification.body, notification.deepLink]
    .filter(Boolean)
    .join("\n");

  await fetch(`https://api.telegram.org/bot${env.OCOS_TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      chat_id: env.OCOS_TELEGRAM_CHAT_ID,
      text: message,
      disable_web_page_preview: true
    })
  });
}

async function maybeAutoRemediate(env: Env, ingestResult: Record<string, unknown>) {
  const incident = ingestResult.incident as { id?: string; environmentSlug?: "staging" | "production" } | undefined;
  if (!incident?.id || ingestResult.suggestedAction !== "recheck_public_health") {
    return null;
  }

  return forwardJson(env, `/api/incidents/${incident.id}/actions/recheck_public_health/run`, {
    environmentSlug: incident.environmentSlug ?? "production"
  });
}

async function markDeliveryId(
  request: Request,
  ctx: ExecutionContext,
  deliveryId: string
): Promise<boolean> {
  const cache = (caches as CacheStorage & { default: Cache }).default;
  const key = new Request(new URL(`/_dedupe/${deliveryId}`, request.url).toString());
  const existing = await cache.match(key);
  if (existing) {
    return false;
  }

  ctx.waitUntil(
    cache.put(
      key,
      new Response("ok", {
        headers: {
          "cache-control": "max-age=300"
        }
      })
    )
  );

  return true;
}

async function handleSignedIngress(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  forwardPath: string
): Promise<Response> {
  const timestamp = request.headers.get("X-OCOS-Timestamp");
  const deliveryId = request.headers.get("X-OCOS-Delivery-Id");
  const signature = request.headers.get("X-OCOS-Signature");

  if (!timestamp || !deliveryId || !signature) {
    return Response.json({ message: "Missing signature headers." }, { status: 400 });
  }

  const ageMs = Math.abs(Date.now() - Date.parse(timestamp));
  if (ageMs > 5 * 60 * 1000) {
    return Response.json({ message: "Webhook timestamp is stale." }, { status: 401 });
  }

  const unique = await markDeliveryId(request, ctx, deliveryId);
  if (!unique) {
    return Response.json({ message: "Duplicate delivery id." }, { status: 409 });
  }

  const body = await request.text();
  const valid = await verifySignature({
    timestamp,
    deliveryId,
    signature,
    body,
    secret: env.OCOS_WEBHOOK_SIGNING_SECRET
  });

  if (!valid) {
    return Response.json({ message: "Invalid signature." }, { status: 401 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(body);
  } catch {
    return Response.json({ message: "Webhook body is not valid JSON." }, { status: 400 });
  }

  const response = await forwardJson(env, forwardPath, parsedBody);
  await sendTelegram(env, response.notification as Record<string, unknown> | undefined);
  return Response.json(response);
}

async function runScheduledProbe(env: Env, environmentSlug: "staging" | "production") {
  const probe = await probeStudioEnvironment(env, environmentSlug);
  const ingest = await forwardJson(env, "/api/ingest/check-result", probe);
  await sendTelegram(env, ingest.notification as Record<string, unknown> | undefined);

  const remediation = await maybeAutoRemediate(env, ingest);
  if (remediation && remediation.escalationBundle) {
    const incident = remediation.incident as { id?: string; projectSlug?: string } | undefined;
    await sendTelegram(env, {
      shouldNotify: true,
      channel: "telegram",
      title: "OCOS auto-remediation escalated",
      body: `Codex bundle created for incident ${String(incident?.id ?? "")}`,
      deepLink: `/projects/${String(incident?.projectSlug ?? "studio")}/operations?incident=${String(incident?.id ?? "")}`
    });
  }
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/healthz") {
      return Response.json({ ok: true, at: new Date().toISOString() });
    }

    if (request.method === "POST" && url.pathname.endsWith("/service-event")) {
      return handleSignedIngress(request, env, ctx, "/api/ingest/service-event");
    }

    if (request.method === "POST" && url.pathname.endsWith("/check-result")) {
      return handleSignedIngress(request, env, ctx, "/api/ingest/check-result");
    }

    return Response.json({ message: "Not found." }, { status: 404 });
  },

  async scheduled(controller: ScheduledController, env: Env): Promise<void> {
    if (controller.cron === "*/5 * * * *") {
      await runScheduledProbe(env, "production");
    }

    if (controller.cron === "*/15 * * * *") {
      await runScheduledProbe(env, "staging");
    }
  }
} satisfies ExportedHandler<Env>;
