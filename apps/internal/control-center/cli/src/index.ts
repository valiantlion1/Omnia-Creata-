#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

type CliConfig = {
  apiUrl?: string;
  token?: string;
};

function loadConfig(): CliConfig {
  const configPath = path.join(os.homedir(), ".ocos", "config.json");
  if (!existsSync(configPath)) {
    return {};
  }

  try {
    return JSON.parse(readFileSync(configPath, "utf8")) as CliConfig;
  } catch {
    return {};
  }
}

function getRuntimeConfig() {
  const fileConfig = loadConfig();
  const apiUrl = process.env.OCOS_API_URL ?? fileConfig.apiUrl ?? "http://localhost:3000";
  const token = process.env.OCOS_OPERATOR_TOKEN ?? fileConfig.token;

  if (!token) {
    throw new Error(
      "Missing OCOS operator token. Set OCOS_OPERATOR_TOKEN or store one in ~/.ocos/config.json."
    );
  }

  return { apiUrl, token };
}

async function apiRequest(pathname: string, init?: RequestInit) {
  const runtime = getRuntimeConfig();
  const response = await fetch(`${runtime.apiUrl}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${runtime.token}`,
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });

  const data = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(
      typeof data === "object" && data && "message" in data
        ? String((data as { message: string }).message)
        : `Request failed with ${response.status}`
    );
  }
  return data;
}

function printJson(value: unknown) {
  console.log(JSON.stringify(value, null, 2));
}

async function main() {
  const args = process.argv.slice(2);
  const [command, ...rest] = args;

  switch (command) {
    case "status": {
      const data = await apiRequest("/api/cli/summary");
      printJson(data);
      return;
    }
    case "incidents": {
      const data = await apiRequest("/api/incidents");
      printJson(data);
      return;
    }
    case "projects": {
      const data = await apiRequest("/api/projects");
      printJson(data);
      return;
    }
    case "project": {
      const projectSlug = rest[0];
      if (!projectSlug) {
        throw new Error("Usage: ocos project <slug>");
      }
      const data = await apiRequest(`/api/projects/${projectSlug}`);
      printJson(data);
      return;
    }
    case "reports": {
      const projectSlug = rest[0];
      if (!projectSlug) {
        throw new Error("Usage: ocos reports <project-slug>");
      }
      const data = await apiRequest(`/api/projects/${projectSlug}/reports`);
      printJson(data);
      return;
    }
    case "incident": {
      const incidentId = rest[0];
      if (!incidentId) {
        throw new Error("Usage: ocos incident <id>");
      }
      const data = await apiRequest(`/api/incidents/${incidentId}`);
      printJson(data);
      return;
    }
    case "ack": {
      const incidentId = rest[0];
      if (!incidentId) {
        throw new Error("Usage: ocos ack <id>");
      }
      const data = await apiRequest(`/api/incidents/${incidentId}/ack`, {
        method: "POST"
      });
      printJson(data);
      return;
    }
    case "recheck": {
      const [serviceSlug, environmentSlug] = rest;
      if (serviceSlug !== "studio" || !environmentSlug) {
        throw new Error("Usage: ocos recheck studio <production|staging>");
      }
      const incidents = (await apiRequest("/api/incidents")) as Array<{
        id: string;
        serviceSlug: string;
        environmentSlug: string;
      }>;
      const incident = incidents.find(
        (item) => item.serviceSlug === serviceSlug && item.environmentSlug === environmentSlug
      );
      if (!incident) {
        throw new Error(`No incident found for ${serviceSlug}/${environmentSlug}`);
      }
      const data = await apiRequest(
        `/api/incidents/${incident.id}/actions/recheck_public_health/run`,
        {
          method: "POST",
          body: JSON.stringify({
            environmentSlug
          })
        }
      );
      printJson(data);
      return;
    }
    case "verify": {
      const [serviceSlug, environmentSlug] = rest;
      if (serviceSlug !== "studio" || !environmentSlug) {
        throw new Error("Usage: ocos verify studio <staging|production>");
      }
      const incidents = (await apiRequest("/api/incidents")) as Array<{
        id: string;
        serviceSlug: string;
        environmentSlug: string;
      }>;
      const incident = incidents.find(
        (item) => item.serviceSlug === serviceSlug && item.environmentSlug === environmentSlug
      );
      if (!incident) {
        throw new Error(`No incident found for ${serviceSlug}/${environmentSlug}`);
      }
      const data = await apiRequest(
        `/api/incidents/${incident.id}/actions/trigger_staging_verify/run`,
        {
          method: "POST",
          body: JSON.stringify({
            environmentSlug
          })
        }
      );
      printJson(data);
      return;
    }
    case "escalate": {
      const incidentId = rest[0];
      if (!incidentId) {
        throw new Error("Usage: ocos escalate <id>");
      }
      const data = await apiRequest(`/api/incidents/${incidentId}/escalate-codex`, {
        method: "POST"
      });
      printJson(data);
      return;
    }
    default:
      console.log("OCOS CLI");
      console.log("Usage:");
      console.log("  ocos status");
      console.log("  ocos projects");
      console.log("  ocos project <slug>");
      console.log("  ocos reports <project-slug>");
      console.log("  ocos incidents");
      console.log("  ocos incident <id>");
      console.log("  ocos ack <id>");
      console.log("  ocos recheck studio <production|staging>");
      console.log("  ocos verify studio <staging|production>");
      console.log("  ocos escalate <id>");
  }
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
