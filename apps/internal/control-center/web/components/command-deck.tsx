import { StatusPill } from "@/components/status-pill";
import { appEnv } from "@/lib/env";
import type { SummaryView } from "@/lib/ocos-store";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

function stripProtocol(value: string) {
  return value.replace(/^https?:\/\//, "");
}

export function CommandDeck({ summary }: { summary: SummaryView }) {
  const primaryIncident = summary.activeIncidents[0];
  const latestAction = summary.actionRuns[0];
  const latestReport = summary.latestReports[0];
  const degradedProjects = summary.projects.filter((project) => project.currentStatus !== "healthy").length;

  return (
    <section className="ocos-panel-strong ocos-appear rounded-[16px] p-4">
      <div className="flex flex-col gap-3 border-b border-[var(--ocos-line)] pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="ocos-kicker">Organization Situation</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ocos-ink)] sm:text-2xl">
            Open work queue
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--ocos-muted)]">
            Internal workbench view for what is broken, what is already being handled, and what still needs operator
            attention right now.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone={summary.demoMode ? "muted" : "healthy"}>
            {summary.demoMode ? "demo mode" : "live mode"}
          </StatusPill>
          {primaryIncident ? (
            <StatusPill tone={primaryIncident.severity === "P1" ? "failed" : "degraded"}>
              {primaryIncident.severity}
            </StatusPill>
          ) : null}
          {primaryIncident ? <StatusPill tone="open">{primaryIncident.state}</StatusPill> : null}
        </div>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="rounded-[14px] border border-[var(--ocos-line)] bg-[var(--ocos-surface-muted)] p-4">
          <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="ocos-kicker">Current Focus</p>
              <h3 className="mt-2 text-lg font-semibold text-[var(--ocos-ink)]">
                {primaryIncident ? primaryIncident.title : "No active incident requires intervention"}
              </h3>
              <p className="mt-2 text-sm leading-6 text-[var(--ocos-muted)]">
                {primaryIncident
                  ? primaryIncident.summary
                  : "The queue is clear. OCOS is waiting for the next scheduled probe or signed service event."}
              </p>
            </div>

            <div className="rounded-[12px] border border-[var(--ocos-line)] bg-[var(--ocos-surface)] p-3">
              <p className="ocos-kicker">Recommended Action</p>
              <p className="mt-2 text-sm leading-6 text-[var(--ocos-ink)]">
                {primaryIncident?.recommendedNextPath ??
                  "Hold the queue clean and wait for the next operational signal."}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[14px] border border-[var(--ocos-line)] bg-[var(--ocos-surface)]">
          <div className="grid gap-px bg-[var(--ocos-line)] sm:grid-cols-2">
            <div className="bg-[var(--ocos-surface)] px-4 py-3">
              <div className="ocos-kicker">Project</div>
              <div className="mt-1 text-sm font-medium text-[var(--ocos-ink)]">
                {primaryIncident?.projectName ?? "No escalated project"}
              </div>
            </div>
            <div className="bg-[var(--ocos-surface)] px-4 py-3">
              <div className="ocos-kicker">Environment</div>
              <div className="mt-1 text-sm font-medium text-[var(--ocos-ink)]">
                {primaryIncident?.environmentName ?? "Standby"}
              </div>
            </div>
            <div className="bg-[var(--ocos-surface)] px-4 py-3">
              <div className="ocos-kicker">Latest action</div>
              <div className="mt-1 text-sm font-medium text-[var(--ocos-ink)]">
                {latestAction?.recipe ?? "none"}
              </div>
            </div>
            <div className="bg-[var(--ocos-surface)] px-4 py-3">
              <div className="ocos-kicker">Latest report</div>
              <div className="mt-1 text-sm font-medium text-[var(--ocos-ink)]">
                {latestReport ? formatTimestamp(latestReport.updatedAt) : formatTimestamp(summary.generatedAt)}
              </div>
            </div>
            <div className="bg-[var(--ocos-surface)] px-4 py-3">
              <div className="ocos-kicker">Operator host</div>
              <div className="mt-1 text-sm font-medium text-[var(--ocos-ink)]">{appEnv.publicHostname}</div>
            </div>
            <div className="bg-[var(--ocos-surface)] px-4 py-3">
              <div className="ocos-kicker">Hook ingress</div>
              <div className="mt-1 text-sm font-medium text-[var(--ocos-ink)]">{stripProtocol(appEnv.hooksBaseUrl)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-px overflow-hidden rounded-[14px] border border-[var(--ocos-line)] bg-[var(--ocos-line)] sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-[var(--ocos-surface)] px-4 py-3">
          <div className="ocos-kicker">Open incidents</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--ocos-ink)]">
            {summary.activeIncidents.length}
          </div>
        </div>
        <div className="bg-[var(--ocos-surface)] px-4 py-3">
          <div className="ocos-kicker">Degraded projects</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--ocos-ink)]">
            {degradedProjects}
          </div>
        </div>
        <div className="bg-[var(--ocos-surface)] px-4 py-3">
          <div className="ocos-kicker">Action queue</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--ocos-ink)]">
            {summary.actionRuns.length}
          </div>
        </div>
        <div className="bg-[var(--ocos-surface)] px-4 py-3">
          <div className="ocos-kicker">Codex queued</div>
          <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--ocos-ink)]">
            {summary.codexEscalations.length}
          </div>
        </div>
      </div>
    </section>
  );
}
