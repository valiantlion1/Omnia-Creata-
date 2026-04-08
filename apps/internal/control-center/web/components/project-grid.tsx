import Link from "next/link";

import type { ProjectView } from "@ocos/contracts";

import { StatusPill } from "@/components/status-pill";

function formatTimestamp(value?: string) {
  if (!value) {
    return "report pending";
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
    <section className="rounded-[30px] border border-white/10 bg-[#091414]/88 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">Project Cockpits</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
        </div>
        <p className="max-w-3xl text-sm leading-6 text-white/58">{description}</p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.slug}`}
            className="group rounded-[24px] border border-white/10 bg-black/20 p-5 transition hover:border-teal-300/35 hover:bg-teal-300/[0.08]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={project.currentStatus}>{project.currentStatus}</StatusPill>
                  <span className="text-xs uppercase tracking-[0.24em] text-teal-100/70">{project.slug}</span>
                </div>
                <h3 className="mt-3 text-xl font-semibold text-white group-hover:text-teal-50">{project.name}</h3>
                <p className="mt-2 text-sm leading-6 text-white/66">{project.description}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2 text-right text-sm text-white/64">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">Latest report</div>
                <div className="mt-1 text-white/82">{formatTimestamp(project.latestReportAt)}</div>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 rounded-[20px] border border-white/10 bg-white/[0.03] p-4 text-sm text-white/64 sm:grid-cols-4">
              <div>
                <dt className="text-[11px] uppercase tracking-[0.22em] text-white/35">Services</dt>
                <dd className="mt-1 text-lg font-semibold text-white">{project.serviceCount}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.22em] text-white/35">Envs</dt>
                <dd className="mt-1 text-lg font-semibold text-white">{project.environmentCount}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.22em] text-white/35">Open</dt>
                <dd className="mt-1 text-lg font-semibold text-white">{project.totalOpenIncidents}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-[0.22em] text-white/35">P1/P2</dt>
                <dd className="mt-1 text-lg font-semibold text-white">
                  {project.incidentsBySeverity.P1}/{project.incidentsBySeverity.P2}
                </dd>
              </div>
            </dl>
          </Link>
        ))}
      </div>
    </section>
  );
}
