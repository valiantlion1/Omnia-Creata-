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
  active: "overview" | "services" | "operations" | "automations" | "reports";
}) {
  return (
    <section className="ocos-panel-strong">
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <StatusPill tone={summary.project.currentStatus}>{summary.project.currentStatus}</StatusPill>
            <span className="text-xs uppercase tracking-[0.26em] text-[var(--ocos-accent-strong)]">
              {summary.project.slug}
            </span>
            {summary.demoMode ? <StatusPill tone="muted">demo mode</StatusPill> : null}
          </div>

          <div>
            <p className="ocos-kicker">Project cockpit</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ocos-ink)]">
              {summary.project.name}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ocos-muted)]">{summary.project.description}</p>
          </div>

          <ProjectTabs projectSlug={summary.project.slug} active={active} />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-[24px] border border-[var(--ocos-border-strong)] bg-white/78 p-4">
            <dt className="text-[11px] uppercase tracking-[0.22em] text-[var(--ocos-muted)]">Services</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ocos-ink)]">
              {summary.project.serviceCount}
            </dd>
          </article>
          <article className="rounded-[24px] border border-[var(--ocos-border-strong)] bg-white/78 p-4">
            <dt className="text-[11px] uppercase tracking-[0.22em] text-[var(--ocos-muted)]">Environments</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ocos-ink)]">
              {summary.project.environmentCount}
            </dd>
          </article>
          <article className="rounded-[24px] border border-[var(--ocos-border-strong)] bg-white/78 p-4">
            <dt className="text-[11px] uppercase tracking-[0.22em] text-[var(--ocos-muted)]">Open incidents</dt>
            <dd className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--ocos-ink)]">
              {summary.project.totalOpenIncidents}
            </dd>
          </article>
          <article className="rounded-[24px] border border-[var(--ocos-border-strong)] bg-white/78 p-4">
            <dt className="text-[11px] uppercase tracking-[0.22em] text-[var(--ocos-muted)]">Latest report</dt>
            <dd className="mt-2 text-base font-medium text-[var(--ocos-ink)]">
              {formatTimestamp(summary.project.latestReportAt)}
            </dd>
          </article>
        </div>
      </div>
    </section>
  );
}
