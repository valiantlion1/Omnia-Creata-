"use client";

import { useEffect, useState } from "react";

export function OfflineSnapshot() {
  const [summary, setSummary] = useState<string>("No cached summary found yet.");

  useEffect(() => {
    const cached = window.localStorage.getItem("ocos:last-summary");
    if (!cached) {
      return;
    }

    try {
      const parsed = JSON.parse(cached) as {
        generatedAt?: string;
        activeIncidents?: Array<{ title?: string; severity?: string }>;
      };
      const firstIncident = parsed.activeIncidents?.[0];
      setSummary(
        firstIncident
          ? `Last snapshot ${parsed.generatedAt ?? "unknown"}: ${firstIncident.severity ?? "P?"} ${firstIncident.title ?? "incident"}`
          : `Last snapshot ${parsed.generatedAt ?? "unknown"} with no active incidents.`
      );
    } catch {
      setSummary("Cached summary could not be parsed.");
    }
  }, []);

  return <p className="mt-4 text-sm leading-6 text-white/68">{summary}</p>;
}
