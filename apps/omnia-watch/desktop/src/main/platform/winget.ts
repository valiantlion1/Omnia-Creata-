import { runCommand } from "./command";

export interface WingetUpgrade {
  availableVersion: string;
  currentVersion: string;
  id: string;
  name: string;
  source: string;
}

function stripAnsi(value: string) {
  return value.replace(/\u001b\[[0-9;]*m/g, "");
}

export async function getWingetUpgrades(): Promise<WingetUpgrade[]> {
  try {
    const raw = await runCommand("winget.exe", [
      "upgrade",
      "--accept-source-agreements",
      "--disable-interactivity"
    ]);
    return parseWingetTable(raw);
  } catch {
    return [];
  }
}

export function parseWingetTable(raw: string): WingetUpgrade[] {
  const lines = stripAnsi(raw)
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean);

  const separatorIndex = lines.findIndex((line) => /^-+/.test(line));
  if (separatorIndex === -1) {
    return [];
  }

  return lines.slice(separatorIndex + 1).flatMap((line) => {
    const parts = line.trim().split(/\s{2,}/);
    if (parts.length < 5) {
      return [];
    }

    const name = parts[0] ?? "";
    const id = parts[1] ?? "";
    const currentVersion = parts[2] ?? "";
    const availableVersion = parts[3] ?? "";
    const source = parts[4] ?? "";

    if (!name || !id || !availableVersion || !source || line.toLowerCase().includes("upgrade available")) {
      return [];
    }

    return [
      {
        availableVersion,
        currentVersion: currentVersion ?? "",
        id,
        name,
        source
      } satisfies WingetUpgrade
    ];
  });
}
