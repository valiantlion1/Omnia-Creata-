import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const DEFAULT_API_URL = "http://127.0.0.1:3000";
const TOOL_NAMES = [
  "get_runtime_status",
  "get_org_summary",
  "list_projects",
  "get_project_cockpit",
  "list_incidents",
  "get_incident",
  "list_reports"
];

function loadHomeConfig() {
  const configPath = path.join(os.homedir(), ".ocos", "config.json");
  if (!fs.existsSync(configPath)) {
    return {};
  }

  try {
    return JSON.parse(fs.readFileSync(configPath, "utf8"));
  } catch {
    return {};
  }
}

export function resolveRuntimeConfig() {
  const fileConfig = loadHomeConfig();
  const apiUrl = String(process.env.OCOS_API_URL ?? fileConfig.apiUrl ?? DEFAULT_API_URL).trim();
  const token = String(process.env.OCOS_OPERATOR_TOKEN ?? fileConfig.token ?? "").trim() || undefined;

  return {
    apiUrl: apiUrl.replace(/\/+$/, ""),
    token
  };
}

function buildUrl(pathname, searchParams) {
  const runtime = resolveRuntimeConfig();
  const url = new URL(pathname, `${runtime.apiUrl}/`);

  for (const [key, value] of Object.entries(searchParams ?? {})) {
    if (value === undefined || value === null || value === "") {
      continue;
    }
    url.searchParams.set(key, String(value));
  }

  return url;
}

async function fetchJson(pathname, { searchParams, requireAuth = false } = {}) {
  const runtime = resolveRuntimeConfig();
  const url = buildUrl(pathname, searchParams);
  const headers = { accept: "application/json" };

  if (runtime.token) {
    headers.authorization = `Bearer ${runtime.token}`;
  } else if (requireAuth) {
    throw new Error(
      "This OCOS request needs an operator token. Set OCOS_OPERATOR_TOKEN or store one in ~/.ocos/config.json."
    );
  }

  const response = await fetch(url, { headers });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const detail =
      payload && typeof payload === "object" && "message" in payload ? String(payload.message) : response.statusText;
    throw new Error(`OCOS API ${response.status} at ${url.pathname}: ${detail || "Request failed."}`);
  }

  return payload;
}

function toolResult(value, intro) {
  return {
    content: [
      {
        type: "text",
        text: intro ? `${intro}\n${JSON.stringify(value, null, 2)}` : JSON.stringify(value, null, 2)
      }
    ],
    structuredContent: value
  };
}

function toolError(error) {
  return {
    content: [
      {
        type: "text",
        text: error instanceof Error ? error.message : String(error)
      }
    ],
    isError: true
  };
}

async function readOrgSummary() {
  const runtime = resolveRuntimeConfig();
  if (!runtime.token) {
    return fetchJson("/api/summary");
  }

  try {
    return await fetchJson("/api/cli/summary", { requireAuth: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!message.includes("401") && !message.includes("403")) {
      throw error;
    }
    return fetchJson("/api/summary");
  }
}

async function readProjectCockpit(projectSlug, reportLimit) {
  const [project, incidents, reports] = await Promise.all([
    fetchJson(`/api/projects/${encodeURIComponent(projectSlug)}`),
    fetchJson("/api/incidents", {
      searchParams: {
        projectSlug
      }
    }),
    fetchJson(`/api/projects/${encodeURIComponent(projectSlug)}/reports`, {
      searchParams: {
        limit: reportLimit
      }
    })
  ]);

  const activeIncidents = Array.isArray(incidents)
    ? incidents.filter((incident) => incident && incident.state !== "resolved")
    : [];
  const p1Count = activeIncidents.filter((incident) => incident.severity === "P1").length;
  const latestReport = Array.isArray(reports) && reports.length > 0 ? reports[0] : null;

  return {
    project,
    incidents: activeIncidents,
    reports,
    snapshot: {
      projectSlug,
      activeIncidentCount: activeIncidents.length,
      p1Count,
      latestReportHeadline: latestReport?.headline ?? null,
      latestReportStatus: latestReport?.status ?? null,
      safestNextPath:
        activeIncidents[0]?.recommendedNextPath ??
        latestReport?.recommendedActions?.[0] ??
        "Review the project report, then choose the smallest bounded action."
    }
  };
}

export function buildServer() {
  const server = new McpServer({
    name: "ocos-api",
    version: "0.1.0"
  });

  server.registerTool(
    "get_runtime_status",
    {
      title: "OCOS Runtime Status",
      description: "Inspect the current OCOS API target, token availability, and a live summary probe.",
      inputSchema: {}
    },
    async () => {
      try {
        const runtime = resolveRuntimeConfig();
        const summary = await readOrgSummary();
        return toolResult(
          {
            apiUrl: runtime.apiUrl,
            tokenConfigured: Boolean(runtime.token),
            reachable: true,
            toolNames: TOOL_NAMES,
            generatedAt: summary?.generatedAt ?? null,
            demoMode: summary?.demoMode ?? null
          },
          "OCOS runtime is reachable."
        );
      } catch (error) {
        const runtime = resolveRuntimeConfig();
        return toolResult(
          {
            apiUrl: runtime.apiUrl,
            tokenConfigured: Boolean(runtime.token),
            reachable: false,
            error: error instanceof Error ? error.message : String(error),
            toolNames: TOOL_NAMES
          },
          "OCOS runtime probe failed."
        );
      }
    }
  );

  server.registerTool(
    "get_org_summary",
    {
      title: "Organization Summary",
      description: "Read the current OCOS organization summary, preferring the protected compact summary when a token is configured.",
      inputSchema: {}
    },
    async () => {
      try {
        return toolResult(await readOrgSummary(), "Current OCOS organization summary:");
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "list_projects",
    {
      title: "List Projects",
      description: "List OCOS projects from the control plane.",
      inputSchema: {}
    },
    async () => {
      try {
        return toolResult(await fetchJson("/api/projects"), "Current OCOS projects:");
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "get_project_cockpit",
    {
      title: "Project Cockpit",
      description: "Read a project summary together with active incidents and the freshest persisted reports.",
      inputSchema: {
        projectSlug: z.string().min(1),
        reportLimit: z.number().int().min(1).max(20).optional()
      }
    },
    async ({ projectSlug, reportLimit }) => {
      try {
        return toolResult(
          await readProjectCockpit(projectSlug, reportLimit ?? 5),
          `Current OCOS cockpit for ${projectSlug}:`
        );
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "list_incidents",
    {
      title: "List Incidents",
      description: "List OCOS incidents, with optional project, severity, and state filtering.",
      inputSchema: {
        projectSlug: z.string().min(1).optional(),
        severity: z.enum(["P1", "P2", "P3"]).optional(),
        state: z.string().min(1).optional()
      }
    },
    async ({ projectSlug, severity, state }) => {
      try {
        const incidents = await fetchJson("/api/incidents", {
          searchParams: {
            projectSlug
          }
        });

        const filtered = Array.isArray(incidents)
          ? incidents.filter((incident) => {
              if (severity && incident?.severity !== severity) return false;
              if (state && incident?.state !== state) return false;
              return true;
            })
          : incidents;

        return toolResult(filtered, "Current OCOS incidents:");
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "get_incident",
    {
      title: "Get Incident",
      description: "Read one OCOS incident by id.",
      inputSchema: {
        incidentId: z.string().min(1)
      }
    },
    async ({ incidentId }) => {
      try {
        return toolResult(
          await fetchJson(`/api/incidents/${encodeURIComponent(incidentId)}`),
          `Current OCOS incident ${incidentId}:`
        );
      } catch (error) {
        return toolError(error);
      }
    }
  );

  server.registerTool(
    "list_reports",
    {
      title: "List Reports",
      description: "List OCOS reports globally or for one project, with optional scope and report-type filters.",
      inputSchema: {
        projectSlug: z.string().min(1).optional(),
        scopeLevel: z.enum(["project", "service", "incident"]).optional(),
        reportType: z.enum(["overview", "daily", "weekly", "incident_snapshot"]).optional(),
        limit: z.number().int().min(1).max(50).optional()
      }
    },
    async ({ projectSlug, scopeLevel, reportType, limit }) => {
      try {
        const reports = projectSlug
          ? await fetchJson(`/api/projects/${encodeURIComponent(projectSlug)}/reports`, {
              searchParams: {
                reportType,
                limit: limit ?? 20
              }
            })
          : await fetchJson("/api/reports", {
              searchParams: {
                projectSlug,
                scopeLevel,
                reportType,
                limit: limit ?? 20
              }
            });

        const filtered = Array.isArray(reports) && scopeLevel
          ? reports.filter((report) => report?.scopeLevel === scopeLevel)
          : reports;

        return toolResult(filtered, "Current OCOS reports:");
      } catch (error) {
        return toolError(error);
      }
    }
  );

  return server;
}

export async function runServer() {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const modulePath = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === modulePath) {
  runServer().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  });
}
