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
      <div className="space-y-6">
        <ProjectHeader summary={project} active="operations" />

        {focusedIncident ? (
          <section className="space-y-5 rounded-[30px] border border-white/10 bg-[#091414]/88 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={focusedIncident.severity === "P1" ? "failed" : focusedIncident.severity === "P2" ? "degraded" : "open"}>
                {focusedIncident.severity}
              </StatusPill>
              <StatusPill tone={focusedIncident.state === "resolved" ? "resolved" : focusedIncident.state === "silenced" ? "muted" : "open"}>
                {focusedIncident.state}
              </StatusPill>
              <span className="text-xs uppercase tracking-[0.24em] text-white/45">{focusedIncident.environmentName}</span>
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-white">{focusedIncident.title}</h2>
              <p className="mt-3 text-sm leading-7 text-white/68">{focusedIncident.summary}</p>
              <p className="mt-3 text-sm text-teal-100/82">
                {focusedIncident.recommendedNextPath ?? "Inspect latest report, then choose a bounded operator action."}
              </p>
            </div>
            <QuickActions incidentId={focusedIncident.id} environmentSlug={focusedIncident.environmentSlug} />
          </section>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <IncidentList incidents={project.activeIncidents} title="Project Incident Queue" />
          <ActionRunList actionRuns={project.actionRuns} />
        </div>

        <CodexList items={project.codexEscalations} />
      </div>
    </NavShell>
  );
}
