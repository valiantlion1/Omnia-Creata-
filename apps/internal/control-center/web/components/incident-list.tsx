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
    <section className="rounded-[28px] border border-white/10 bg-black/20 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">Triage</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
        </div>
        <div className="text-sm text-white/55">{incidents.length} visible</div>
      </div>

      <div className="mt-5 space-y-3">
        {incidents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/60">
            {emptyMessage}
          </div>
        ) : null}

        {incidents.map((incident) => (
          <Link
            key={incident.id}
            href={`/projects/${incident.projectSlug}/operations?incident=${incident.id}`}
            className="block rounded-[22px] border border-white/10 bg-white/[0.04] p-4 transition hover:border-teal-300/30 hover:bg-teal-300/[0.08]"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={toneFromSeverity(incident.severity)}>{incident.severity}</StatusPill>
                  <StatusPill tone={toneFromState(incident.state)}>{incident.state}</StatusPill>
                  <span className="text-xs uppercase tracking-[0.24em] text-teal-100/70">{incident.projectSlug}</span>
                  <span className="text-xs uppercase tracking-[0.24em] text-white/45">
                    {incident.environmentName}
                  </span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">{incident.title}</h3>
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-white/68">{incident.summary}</p>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-3 text-sm text-white/55 sm:w-[280px]">
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.24em] text-white/40">Service</dt>
                  <dd className="mt-1 text-white/80">{incident.serviceName}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.24em] text-white/40">Age</dt>
                  <dd className="mt-1 text-white/80">{incident.openDurationMinutes ?? 0} min</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-[11px] uppercase tracking-[0.24em] text-white/40">Next Path</dt>
                  <dd className="mt-1 text-white/80">
                    {incident.recommendedNextPath ?? "Inspect latest verify and decide next bounded action."}
                  </dd>
                </div>
              </dl>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
