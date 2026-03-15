export function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(new Date(value));
}

export function formatRelative(value: string, locale: string) {
  const now = Date.now();
  const then = new Date(value).getTime();
  const diffHours = Math.round((then - now) / (1000 * 60 * 60));
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });

  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, "hour");
  }

  return rtf.format(Math.round(diffHours / 24), "day");
}

export function formatCompactNumber(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1
  }).format(value);
}

export function truncate(value: string, length: number) {
  if (value.length <= length) {
    return value;
  }

  return `${value.slice(0, length - 1)}…`;
}
