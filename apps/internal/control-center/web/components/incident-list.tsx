import Link from "next/link";
import type { IncidentSnapshot } from "@ocos/contracts";

import { StatusPill } from "@/components/status-pill";

function toneFromSeverity(severity: IncidentSnapshot["severity"]) {
  if (severity === "P1") {
    return "failed" as const;
  }
  if (severity === "P2") {
    return "degraded" as const;
  }
  return "open" as const;
}

function toneFromState(state: IncidentSnapshot["state"]) {
  if (state === "resolved") {
    return "resolved" as const;
  }
  if (state === "silenced") {
    return "muted" as const;
  }
  return "open" as const;
}

export function IncidentList({
  incidents,
  title = "Active Incidents",
  emptyMessage = "No active incidents are currently open."
}: {
  incidents: IncidentSnapshot[];
  title?: string;
  emptyMessage?: string;
}) {
  return (
    <section className="ocos-panel rounded-[16px] p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="ocos-kicker">Live Queue</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--ocos-ink)]">{title}</h2>
        </div>
        <div className="text-sm text-[var(--ocos-muted)]">{incidents.length} rows</div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[12px] border border-[var(--ocos-line)]">
        <div className="hidden border-b border-[var(--ocos-line)] bg-[var(--ocos-surface-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ocos-soft)] lg:grid lg:grid-cols-[140px_minmax(0,1.55fr)_170px_90px_minmax(0,1fr)] lg:gap-3">
          <div>Status</div>
          <div>Incident</div>
          <div>Service</div>
          <div>Age</div>
          <div>Next step</div>
        </div>

        {incidents.length === 0 ? (
          <div className="ocos-empty-state px-4 py-5 text-sm">{emptyMessage}</div>
        ) : (
          <div className="divide-y divide-[var(--ocos-line)]">
            {incidents.map((incident) => (
              <Link
                key={incident.id}
                href={`/projects/${incident.projectSlug}/operations?incident=${incident.id}`}
                className="block bg-[var(--ocos-surface)] px-3 py-3 transition hover:bg-[var(--ocos-surface-muted)]"
              >
                <div className="grid gap-3 lg:grid-cols-[140px_minmax(0,1.55fr)_170px_90px_minmax(0,1fr)] lg:items-start">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill tone={toneFromSeverity(incident.severity)}>{incident.severity}</StatusPill>
                    <StatusPill tone={toneFromState(incident.state)}>{incident.state}</StatusPill>
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-[var(--ocos-ink)]">{incident.title}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--ocos-soft)]">
                      {incident.projectSlug} / {incident.environmentName}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--ocos-muted)]">{incident.summary}</p>
                  </div>

                  <div className="text-sm text-[var(--ocos-ink)]">
                    <div className="font-medium">{incident.serviceName}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--ocos-soft)]">
                      {incident.projectSlug}
                    </div>
                  </div>

                  <div className="text-sm text-[var(--ocos-ink)]">{incident.openDurationMinutes ?? 0} min</div>

                  <div className="text-sm leading-6 text-[var(--ocos-muted)]">
                    {incident.recommendedNextPath ?? "Inspect latest verify and choose a bounded action."}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
