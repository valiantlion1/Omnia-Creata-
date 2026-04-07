import type { ActionRunResult } from "@ocos/contracts";
import { StatusPill } from "@/components/status-pill";

export function ActionRunList({ actionRuns }: { actionRuns: ActionRunResult[] }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-black/20 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/45">Execution</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Action Runs</h2>
      </div>
      <div className="mt-5 space-y-3">
        {actionRuns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/60">
            No action runs recorded yet.
          </div>
        ) : null}
        {actionRuns.map((actionRun) => (
          <article
            key={actionRun.id}
            className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill
                    tone={
                      actionRun.status === "succeeded"
                        ? "healthy"
                        : actionRun.status === "failed"
                          ? "failed"
                          : "muted"
                    }
                  >
                    {actionRun.status}
                  </StatusPill>
                  <span className="text-xs uppercase tracking-[0.24em] text-white/45">
                    {actionRun.recipe}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/68">{actionRun.summary}</p>
              </div>
              <div className="text-right text-sm text-white/55">
                <div>{actionRun.environmentSlug}</div>
                <div className="mt-1 text-white/75">{actionRun.serviceSlug}</div>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
