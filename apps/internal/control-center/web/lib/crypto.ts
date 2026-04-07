import { createHash } from "node:crypto";

export function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export function isoNow(): string {
  return new Date().toISOString();
}

export function minutesBetween(olderIso: string, newerIso = isoNow()): number {
  const older = new Date(olderIso).getTime();
  const newer = new Date(newerIso).getTime();
  return Math.max(0, Math.round((newer - older) / 60000));
}
