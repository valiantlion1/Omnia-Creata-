import { notFound } from "next/navigation";

import { ActionRunList } from "@/components/action-run-list";
import { CodexList } from "@/components/codex-list";
import { IncidentList } from "@/components/incident-list";
import { NavShell } from "@/components/nav-shell";
import { ProjectHeader } from "@/components/project-header";
import { QuickActions } from "@/components/quick-actions";
import { StatusPill } from "@/components/status-pill";
import { getIncident, getProject } from "@/lib/ocos-store";

export default async function ProjectOperationsPage({
  params,
  searchParams
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ incident?: string }>;
}) {
  const { slug } = await params;
  const { incident: incidentId } = await searchParams;
  const project = await getProject(slug);

  if (!project) {
    notFound();
  }

  const focusedIncident =
    incidentId && project.activeIncidents.some((incident) => incident.id === incidentId)
      ? await getIncident(incidentId)
      : null;

  return (
    <NavShell eyebrow={`${project.project.name} Operations`}>
      <div className="space-y-5">
        <ProjectHeader summary={project} active="operations" />

        {focusedIncident ? (
          <section className="ocos-panel-strong">
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill
                  tone={
                    focusedIncident.severity === "P1"
                      ? "failed"
                      : focusedIncident.severity === "P2"
                        ? "degraded"
                        : "open"
                  }
                >
                  {focusedIncident.severity}
                </StatusPill>
                <StatusPill
                  tone={
                    focusedIncident.state === "resolved"
                      ? "resolved"
                      : focusedIncident.state === "silenced"
                        ? "muted"
                        : "open"
                  }
                >
                  {focusedIncident.state}
                </StatusPill>
                <span className="text-xs uppercase tracking-[0.24em] text-[var(--ocos-muted)]">
                  {focusedIncident.environmentName}
                </span>
              </div>

              <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
                <div>
                  <p className="ocos-kicker">Focused incident</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ocos-ink)]">
                    {focusedIncident.title}
                  </h2>
                  <p className="mt-3 text-sm leading-7 text-[var(--ocos-muted)]">{focusedIncident.summary}</p>
                  <div className="mt-4 rounded-[22px] border border-[var(--ocos-border)] bg-[var(--ocos-surface-muted)] p-4">
                    <p className="ocos-kicker">Recommended path</p>
                    <p className="mt-2 text-sm leading-7 text-[var(--ocos-ink)]">
                      {focusedIncident.recommendedNextPath ??
                        "Inspect the latest report, then choose the next bounded operator action."}
                    </p>
                  </div>
                </div>

                <QuickActions incidentId={focusedIncident.id} environmentSlug={focusedIncident.environmentSlug} />
              </div>
            </div>
          </section>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
          <IncidentList incidents={project.activeIncidents} title="Project Incident Queue" />
          <ActionRunList actionRuns={project.actionRuns} />
        </div>

        <CodexList items={project.codexEscalations} />
      </div>
    </NavShell>
  );
}
