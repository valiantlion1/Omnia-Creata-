import { notFound } from "next/navigation";

import { ActionRunList } from "@/components/action-run-list";
import { CodexList } from "@/components/codex-list";
import { NavShell } from "@/components/nav-shell";
import { QuickActions } from "@/components/quick-actions";
import { StatusPill } from "@/components/status-pill";
import { getIncident, listActionRuns, listCodexEscalations } from "@/lib/ocos-store";

export default async function IncidentDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const incident = await getIncident(id);

  if (!incident) {
    notFound();
  }

  const [actionRuns, codexEscalations] = await Promise.all([
    listActionRuns(),
    listCodexEscalations()
  ]);

  return (
    <NavShell eyebrow="Incident Detail">
      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="space-y-6 rounded-[28px] border border-white/10 bg-black/20 p-6 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={incident.severity === "P1" ? "failed" : incident.severity === "P2" ? "degraded" : "open"}>
              {incident.severity}
            </StatusPill>
            <StatusPill tone={incident.state === "resolved" ? "resolved" : incident.state === "silenced" ? "muted" : "open"}>
              {incident.state}
            </StatusPill>
            <span className="text-xs uppercase tracking-[0.24em] text-white/45">{incident.environmentName}</span>
          </div>

          <div>
            <h2 className="text-3xl font-semibold text-white">{incident.title}</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-white/72">{incident.summary}</p>
          </div>

          <div className="grid gap-4 rounded-[24px] border border-white/10 bg-white/[0.04] p-5 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Fingerprint</p>
              <p className="mt-2 break-all text-sm text-white/78">{incident.fingerprint}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Latest Build</p>
              <p className="mt-2 text-sm text-white/78">{incident.latestVersionBuild ?? "unknown"}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Opened</p>
              <p className="mt-2 text-sm text-white/78">{incident.openedAt}</p>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.24em] text-white/40">Next Path</p>
              <p className="mt-2 text-sm text-white/78">
                {incident.recommendedNextPath ?? "No next path recorded yet."}
              </p>
            </div>
          </div>

          <QuickActions incidentId={incident.id} environmentSlug={incident.environmentSlug} />
        </section>

        <div className="space-y-6">
          <ActionRunList actionRuns={actionRuns.filter((run) => run.incidentId === incident.id)} />
          <CodexList items={codexEscalations.filter((item) => item.incidentId === incident.id)} />
        </div>
      </div>
    </NavShell>
  );
}
