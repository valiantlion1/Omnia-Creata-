import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const serverScriptPath = path.join(__dirname, "server.mjs");
const requiredTools = [
  "get_runtime_status",
  "get_org_summary",
  "list_projects",
  "get_project_cockpit",
  "list_incidents",
  "get_incident",
  "list_reports"
];

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [serverScriptPath],
  env: {
    ...process.env
  }
});

const client = new Client({
  name: "ocos-api-smoke",
  version: "0.1.0"
});

try {
  await client.connect(transport);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((tool) => tool.name);
  const missing = requiredTools.filter((name) => !toolNames.includes(name));
  if (missing.length > 0) {
    throw new Error(`Missing MCP tools: ${missing.join(", ")}`);
  }

  const runtime = await client.callTool({
    name: "get_runtime_status",
    arguments: {}
  });
  const summary = await client.callTool({
    name: "get_org_summary",
    arguments: {}
  });

  console.log(
    JSON.stringify(
      {
        ok: true,
        toolCount: toolNames.length,
        tools: toolNames,
        runtime,
        summary
      },
      null,
      2
    )
  );
} finally {
  if (typeof transport.close === "function") {
    await transport.close().catch(() => {});
  }
  if (typeof client.close === "function") {
    await client.close().catch(() => {});
  }
}
