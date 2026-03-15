import { runCommand } from "./command";

export async function runPowerShell(script: string) {
  return runCommand("powershell.exe", [
    "-NoLogo",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    script
  ]);
}

export async function runPowerShellJson<T>(script: string): Promise<T> {
  const output = await runPowerShell(script);
  if (!output) {
    return [] as T;
  }

  return JSON.parse(output) as T;
}
