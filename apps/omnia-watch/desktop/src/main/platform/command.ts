import { execFile } from "node:child_process";

export function runCommand(
  file: string,
  args: string[],
  options?: {
    cwd?: string;
    timeoutMs?: number;
  }
) {
  return new Promise<string>((resolve, reject) => {
    execFile(
      file,
      args,
      {
        cwd: options?.cwd,
        maxBuffer: 1024 * 1024 * 16,
        timeout: options?.timeoutMs ?? 30_000,
        windowsHide: true
      },
      (error, stdout, stderr) => {
        if (error) {
          reject(new Error(stderr || error.message));
          return;
        }

        resolve(stdout.trim());
      }
    );
  });
}
