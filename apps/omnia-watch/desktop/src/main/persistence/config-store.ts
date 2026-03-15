import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgentConfig } from "@shared/contracts";

export class ConfigStore {
  private readonly filePath: string;

  constructor(private readonly rootDir: string) {
    this.filePath = join(rootDir, "agent-config.json");
  }

  async read() {
    await mkdir(this.rootDir, { recursive: true });

    try {
      const content = await readFile(this.filePath, "utf8");
      return JSON.parse(content) as AgentConfig;
    } catch {
      return {
        apiBaseUrl: process.env.AGENT_SYNC_API_BASE_URL ?? "http://localhost:3000",
        appVersion: "0.1.0"
      } satisfies AgentConfig;
    }
  }

  async write(config: AgentConfig) {
    await mkdir(this.rootDir, { recursive: true });
    await writeFile(this.filePath, JSON.stringify(config, null, 2), "utf8");
    return config;
  }
}
