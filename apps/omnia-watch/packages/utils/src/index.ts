import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
}

export function formatPercentage(value: number) {
  return `${Math.round(value)}%`;
}

export function formatRelativeTime(dateLike: string | Date, locale = "en") {
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  const deltaMs = date.getTime() - Date.now();
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["day", 1000 * 60 * 60 * 24],
    ["hour", 1000 * 60 * 60],
    ["minute", 1000 * 60]
  ];

  for (const [unit, factor] of units) {
    if (Math.abs(deltaMs) >= factor || unit === "minute") {
      const value = Math.round(deltaMs / factor);
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(value, unit);
    }
  }

  return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(0, "minute");
}

export function formatDateTime(dateLike: string | Date, locale = "en") {
  const date = typeof dateLike === "string" ? new Date(dateLike) : dateLike;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

export function compactNumber(value: number, locale = "en") {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
    notation: "compact"
  }).format(value);
}
