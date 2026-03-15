import { appendFile, mkdir, readFile } from "node:fs/promises";
import { join } from "node:path";

export class LogStore {
  private readonly filePath: string;

  constructor(private readonly rootDir: string) {
    this.filePath = join(rootDir, "agent.log");
  }

  async write(level: "error" | "info" | "warn", message: string) {
    await mkdir(this.rootDir, { recursive: true });
    await appendFile(
      this.filePath,
      JSON.stringify({
        level,
        message,
        timestamp: new Date().toISOString()
      }) + "\n",
      "utf8"
    );
  }

  async tail(limit = 60) {
    try {
      const content = await readFile(this.filePath, "utf8");
      return content
        .trim()
        .split(/\r?\n/)
        .filter(Boolean)
        .slice(-limit)
        .reverse();
    } catch {
      return [];
    }
  }
}
