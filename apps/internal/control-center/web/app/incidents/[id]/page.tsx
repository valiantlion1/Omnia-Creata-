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

  const [actionRuns, codexEscalations] = await Promise.all([listActionRuns(), listCodexEscalations()]);

  return (
    <NavShell eyebrow="Incident Detail">
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <section className="ocos-panel-strong space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill
              tone={incident.severity === "P1" ? "failed" : incident.severity === "P2" ? "degraded" : "open"}
            >
              {incident.severity}
            </StatusPill>
            <StatusPill
              tone={
                incident.state === "resolved" ? "resolved" : incident.state === "silenced" ? "muted" : "open"
              }
            >
              {incident.state}
            </StatusPill>
            <span className="text-xs uppercase tracking-[0.24em] text-[var(--ocos-muted)]">
              {incident.environmentName}
            </span>
          </div>

          <div>
            <p className="ocos-kicker">Incident brief</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ocos-ink)]">{incident.title}</h2>
            <p className="mt-3 max-w-3xl text-base leading-7 text-[var(--ocos-muted)]">{incident.summary}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <article className="rounded-[22px] border border-[var(--ocos-border)] bg-white/78 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--ocos-muted)]">Fingerprint</p>
              <p className="mt-2 break-all text-sm text-[var(--ocos-ink)]">{incident.fingerprint}</p>
            </article>
            <article className="rounded-[22px] border border-[var(--ocos-border)] bg-white/78 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--ocos-muted)]">Latest build</p>
              <p className="mt-2 text-sm text-[var(--ocos-ink)]">{incident.latestVersionBuild ?? "unknown"}</p>
            </article>
            <article className="rounded-[22px] border border-[var(--ocos-border)] bg-white/78 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--ocos-muted)]">Opened</p>
              <p className="mt-2 text-sm text-[var(--ocos-ink)]">{incident.openedAt}</p>
            </article>
            <article className="rounded-[22px] border border-[var(--ocos-border)] bg-white/78 p-4">
              <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--ocos-muted)]">Next path</p>
              <p className="mt-2 text-sm text-[var(--ocos-ink)]">
                {incident.recommendedNextPath ?? "No next path recorded yet."}
              </p>
            </article>
          </div>

          <QuickActions incidentId={incident.id} environmentSlug={incident.environmentSlug} />
        </section>

        <div className="space-y-5">
          <ActionRunList actionRuns={actionRuns.filter((run) => run.incidentId === incident.id)} />
          <CodexList items={codexEscalations.filter((item) => item.incidentId === incident.id)} />
        </div>
      </div>
    </NavShell>
  );
}
