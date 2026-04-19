import Link from "next/link";

import type { ProjectView } from "@ocos/contracts";

import { StatusPill } from "@/components/status-pill";

function formatTimestamp(value?: string) {
  if (!value) {
    return "pending";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function ProjectGrid({
  projects,
  title = "Projects",
  description = "Each project keeps its own service graph, incident queue, action history, and report feed without losing the org-wide picture."
}: {
  projects: ProjectView[];
  title?: string;
  description?: string;
}) {
  return (
    <section className="ocos-panel rounded-[16px] p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="ocos-kicker">Project Summary</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--ocos-ink)]">{title}</h2>
        </div>
        <p className="text-sm leading-6 text-[var(--ocos-muted)]">{description}</p>
      </div>

      <div className="mt-4 overflow-hidden rounded-[12px] border border-[var(--ocos-line)]">
        <div className="hidden border-b border-[var(--ocos-line)] bg-[var(--ocos-surface-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ocos-soft)] lg:grid lg:grid-cols-[minmax(0,1.45fr)_120px_90px_90px_90px_150px] lg:gap-3">
          <div>Project</div>
          <div>Status</div>
          <div>Services</div>
          <div>Envs</div>
          <div>Open</div>
          <div>Latest report</div>
        </div>

        <div className="divide-y divide-[var(--ocos-line)]">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/projects/${project.slug}`}
              className="block bg-[var(--ocos-surface)] px-3 py-3 transition hover:bg-[var(--ocos-surface-muted)]"
            >
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1.45fr)_120px_90px_90px_90px_150px] lg:items-center">
                <div>
                  <div className="text-sm font-semibold text-[var(--ocos-ink)]">{project.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--ocos-soft)]">{project.slug}</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--ocos-muted)]">{project.description}</p>
                </div>
                <div>
                  <StatusPill tone={project.currentStatus}>{project.currentStatus}</StatusPill>
                </div>
                <div className="text-sm text-[var(--ocos-ink)]">{project.serviceCount}</div>
                <div className="text-sm text-[var(--ocos-ink)]">{project.environmentCount}</div>
                <div className="text-sm text-[var(--ocos-ink)]">{project.totalOpenIncidents}</div>
                <div className="text-sm text-[var(--ocos-ink)]">{formatTimestamp(project.latestReportAt)}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
