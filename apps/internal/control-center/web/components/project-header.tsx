import type { ProjectSummaryView } from "@ocos/contracts";

import { ProjectTabs } from "@/components/project-tabs";
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

export function ProjectHeader({
  summary,
  active
}: {
  summary: ProjectSummaryView;
  active: "overview" | "services" | "operations" | "reports";
}) {
  return (
    <section className="rounded-[30px] border border-white/10 bg-[#091414]/88 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={summary.project.currentStatus}>{summary.project.currentStatus}</StatusPill>
            <span className="text-xs uppercase tracking-[0.26em] text-teal-100/70">{summary.project.slug}</span>
            {summary.demoMode ? <StatusPill tone="muted">demo mode</StatusPill> : null}
          </div>
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white">{summary.project.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68">{summary.project.description}</p>
          </div>
          <ProjectTabs projectSlug={summary.project.slug} active={active} />
        </div>

        <div className="grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-white/64 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] uppercase tracking-[0.22em] text-white/35">Services</dt>
            <dd className="mt-1 text-xl font-semibold text-white">{summary.project.serviceCount}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.22em] text-white/35">Environments</dt>
            <dd className="mt-1 text-xl font-semibold text-white">{summary.project.environmentCount}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.22em] text-white/35">Open incidents</dt>
            <dd className="mt-1 text-xl font-semibold text-white">{summary.project.totalOpenIncidents}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-[0.22em] text-white/35">Latest report</dt>
            <dd className="mt-1 text-white/82">{formatTimestamp(summary.project.latestReportAt)}</dd>
          </div>
        </div>
      </div>
    </section>
  );
}
