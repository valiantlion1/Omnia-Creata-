import type { ActionRunResult } from "@ocos/contracts";

import { StatusPill } from "@/components/status-pill";

function toneFromStatus(status: ActionRunResult["status"]) {
  if (status === "succeeded") {
    return "healthy" as const;
  }
  if (status === "failed") {
    return "failed" as const;
  }
  return "muted" as const;
}

export function ActionRunList({ actionRuns }: { actionRuns: ActionRunResult[] }) {
  return (
    <section className="ocos-panel rounded-[16px] p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="ocos-kicker">Execution Queue</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--ocos-ink)]">Action Runs</h2>
        </div>
        <div className="text-sm text-[var(--ocos-muted)]">{actionRuns.length} rows</div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[12px] border border-[var(--ocos-line)]">
        <div className="hidden border-b border-[var(--ocos-line)] bg-[var(--ocos-surface-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ocos-soft)] lg:grid lg:grid-cols-[100px_180px_minmax(0,1fr)_120px_120px] lg:gap-3">
          <div>Status</div>
          <div>Recipe</div>
          <div>Summary</div>
          <div>Environment</div>
          <div>Service</div>
        </div>

        {actionRuns.length === 0 ? (
          <div className="ocos-empty-state px-4 py-5 text-sm">No action runs recorded yet.</div>
        ) : (
          <div className="divide-y divide-[var(--ocos-line)]">
            {actionRuns.map((actionRun) => (
              <article key={actionRun.id} className="bg-[var(--ocos-surface)] px-3 py-3">
                <div className="grid gap-3 lg:grid-cols-[100px_180px_minmax(0,1fr)_120px_120px] lg:items-start">
                  <div>
                    <StatusPill tone={toneFromStatus(actionRun.status)}>{actionRun.status}</StatusPill>
                  </div>
                  <div className="text-sm font-medium text-[var(--ocos-ink)]">{actionRun.recipe}</div>
                  <div className="text-sm leading-6 text-[var(--ocos-muted)]">{actionRun.summary}</div>
                  <div className="text-sm text-[var(--ocos-ink)]">{actionRun.environmentSlug}</div>
                  <div className="text-sm text-[var(--ocos-ink)]">{actionRun.serviceSlug}</div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
