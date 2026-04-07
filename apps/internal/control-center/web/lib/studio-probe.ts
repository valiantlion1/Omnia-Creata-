import type { CheckRunPayload } from "@ocos/contracts";

import { appEnv } from "@/lib/env";

type ProbeDetail = {
  ok: boolean;
  statusCode?: number;
  latencyMs?: number;
  body?: string;
};

async function timedFetch(url: string): Promise<ProbeDetail> {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        "User-Agent": "ocos-web-probe/0.1"
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

export async function runStudioPublicProbe(environmentSlug: "staging" | "production"): Promise<CheckRunPayload> {
  const baseUrl =
    environmentSlug === "production" ? appEnv.studioProdBaseUrl : appEnv.studioStagingBaseUrl;

  const [loginResult, healthResult, versionResult] = await Promise.all([
    timedFetch(`${baseUrl}/login`),
    timedFetch(`${baseUrl}/api/v1/healthz`),
    timedFetch(`${baseUrl}/api/v1/version`)
  ]);

  let healthStatus: string | undefined;
  let versionBuild: string | undefined;
  let loginOk = false;

  if (loginResult.ok && loginResult.body?.includes("OmniaCreata Studio")) {
    loginOk = true;
  }

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
  const status = hardDown ? "failed" : degraded ? "degraded" : "healthy";

  return {
    serviceSlug: "studio",
    environmentSlug,
    runType: "public_probe",
    source: "manual",
    status,
    summary: hardDown
      ? `Studio ${environmentSlug} failed at least one public probe.`
      : degraded
        ? `Studio ${environmentSlug} is reachable but reports ${healthStatus}.`
        : `Studio ${environmentSlug} public probes are healthy.`,
    healthStatus,
    loginOk,
    versionBuild,
    checkedPaths: [
      {
        path: "/login",
        ok: loginOk,
        statusCode: loginResult.statusCode,
        latencyMs: loginResult.latencyMs,
        detail: loginOk ? "Studio shell detected." : "Login shell missing or unreachable."
      },
      {
        path: "/api/v1/healthz",
        ok: healthResult.ok,
        statusCode: healthResult.statusCode,
        latencyMs: healthResult.latencyMs,
        detail: healthStatus ? `health=${healthStatus}` : "Health payload missing."
      },
      {
        path: "/api/v1/version",
        ok: versionResult.ok,
        statusCode: versionResult.statusCode,
        latencyMs: versionResult.latencyMs,
        detail: versionBuild ? `build=${versionBuild}` : "Version payload missing."
      }
    ],
    artifacts: [],
    metadata: {
      baseUrl
    }
  };
}
