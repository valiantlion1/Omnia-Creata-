import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AgentScanResult } from "@shared/contracts";

export class ScanCache {
  private readonly filePath: string;

  constructor(private readonly rootDir: string) {
    this.filePath = join(rootDir, "last-scan.json");
  }

  async read() {
    try {
      const content = await readFile(this.filePath, "utf8");
      return JSON.parse(content) as AgentScanResult;
    } catch {
      return null;
    }
  }

  async write(scan: AgentScanResult) {
    await mkdir(this.rootDir, { recursive: true });
    await writeFile(this.filePath, JSON.stringify(scan, null, 2), "utf8");
  }
}
