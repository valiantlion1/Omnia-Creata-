import { appEnv } from "@/lib/env";
import type { SummaryView } from "@/lib/ocos-store";
import { StatusPill } from "@/components/status-pill";

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
  const noisiestProject = [...summary.projects].sort((left, right) => right.totalOpenIncidents - left.totalOpenIncidents)[0];
  const latestReport = summary.latestReports[0];
  const projectFootprint = `${summary.organizationTotals.projects} project${summary.organizationTotals.projects === 1 ? "" : "s"} / ${summary.organizationTotals.services} service${summary.organizationTotals.services === 1 ? "" : "s"}`;

  return (
    <section className="rounded-[32px] border border-white/10 bg-[#091414]/88 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl">
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.32em] text-teal-200/70">Current Situation</p>
            <h2 className="max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-[2.1rem]">
              Organization-wide signal first, project cockpit second, and a clean path for CLI, skills, agents, and future AI.
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-white/68">
              OCOS stays readable by separating the company-wide queue from each project cockpit. New control layers plug
              into the same incident and report model instead of forcing operators to relearn the surface every sprint.
            </p>
          </div>

          <section className="rounded-[26px] border border-white/10 bg-black/20 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill tone={summary.demoMode ? "muted" : "healthy"}>
                {summary.demoMode ? "demo mode" : "live mode"}
              </StatusPill>
              {primaryIncident ? <StatusPill tone={primaryIncident.severity === "P1" ? "failed" : "degraded"}>{primaryIncident.severity}</StatusPill> : null}
              {primaryIncident ? <StatusPill tone={primaryIncident.state === "resolved" ? "resolved" : "open"}>{primaryIncident.state}</StatusPill> : null}
            </div>

            <div className="mt-4 grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/42">Primary Focus</p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                  {primaryIncident ? primaryIncident.title : "System quiet"}
                </h3>
                <p className="mt-3 max-w-2xl text-sm leading-7 text-white/68">
                  {primaryIncident
                    ? primaryIncident.summary
                    : "No active incidents are open. OCOS is standing by for the next probe, signed service event, or manual operator action."}
                </p>
                <p className="mt-4 text-sm text-teal-100/82">
                  {primaryIncident?.recommendedNextPath ?? "Hold the surface clean, keep bounded actions armed, and wait for the next signal."}
                </p>
              </div>

              <dl className="grid gap-3 self-start rounded-[22px] border border-white/10 bg-[#081111] p-4 text-sm text-white/60 sm:grid-cols-2">
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.26em] text-white/38">Project</dt>
                  <dd className="mt-1.5 text-white/82">{primaryIncident?.projectName ?? noisiestProject?.name ?? "OCOS foundation"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.26em] text-white/38">Scope</dt>
                  <dd className="mt-1.5 text-white/82">{primaryIncident?.environmentName ?? projectFootprint}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.26em] text-white/38">Incident Age</dt>
                  <dd className="mt-1.5 text-white/82">
                    {primaryIncident ? `${primaryIncident.openDurationMinutes ?? 0} min` : "quiet window"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-[0.26em] text-white/38">Last Action</dt>
                  <dd className="mt-1.5 text-white/82">{latestAction?.recipe ?? "no bounded run yet"}</dd>
                </div>
              </dl>
            </div>
          </section>
        </div>

        <div className="space-y-4">
          <section className="rounded-[26px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-white/42">Hosted Surface</p>
            <div className="mt-4 space-y-4">
              <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-4">
                <div>
                  <div className="text-sm font-medium text-white">Operator UI</div>
                  <div className="mt-1 text-sm text-white/58">Desktop and mobile PWA entrypoint</div>
                </div>
                <div className="text-right text-sm text-teal-100/82">{appEnv.publicHostname}</div>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-4">
                <div>
                  <div className="text-sm font-medium text-white">Hook ingress</div>
                  <div className="mt-1 text-sm text-white/58">Signed machine events and workflow callbacks</div>
                </div>
                <div className="text-right text-sm text-white/78">{stripProtocol(appEnv.hooksBaseUrl)}</div>
              </div>
              <div className="flex items-start justify-between gap-4 border-b border-white/8 pb-4">
                <div>
                  <div className="text-sm font-medium text-white">Project footprint</div>
                  <div className="mt-1 text-sm text-white/58">Org, project, and service hierarchy now stays explicit</div>
                </div>
                <div className="text-right text-sm text-white/78">{projectFootprint}</div>
              </div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-white">Latest report</div>
                  <div className="mt-1 text-sm text-white/58">Human and AI readable report block</div>
                </div>
                <div className="text-right text-sm text-white/78">
                  {latestReport ? formatTimestamp(latestReport.updatedAt) : formatTimestamp(summary.generatedAt)}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[26px] border border-white/10 bg-black/20 p-5">
            <p className="text-xs uppercase tracking-[0.28em] text-white/42">Control Policy</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-white/70">
              <li>Bounded actions only: recheck, verify, collect bundle, escalate.</li>
              <li>Hosted and phone-safe: OCOS keeps running even when the desktop is off.</li>
              <li>Codex wakes up after failed remediation or a prolonged P1/P2 window.</li>
              <li>One incident model feeds web, CLI, automations, and future agent runtimes.</li>
            </ul>
          </section>
        </div>
      </div>
    </section>
  );
}
