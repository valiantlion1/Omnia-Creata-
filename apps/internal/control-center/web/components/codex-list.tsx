import Link from "next/link";

export function CodexList({
  items
}: {
  items: Array<{
    id: string;
    incidentId: string;
    projectSlug?: string;
    serviceSlug: string;
    environmentSlug: "staging" | "production";
    status: string;
    recommendedNextPath: string;
    createdAt: string;
  }>;
}) {
  return (
    <section className="ocos-panel rounded-[16px] p-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="ocos-kicker">Escalation Queue</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--ocos-ink)]">Codex Escalations</h2>
        </div>
        <div className="text-sm text-[var(--ocos-muted)]">{items.length} rows</div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[12px] border border-[var(--ocos-line)]">
        <div className="hidden border-b border-[var(--ocos-line)] bg-[var(--ocos-surface-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ocos-soft)] lg:grid lg:grid-cols-[100px_120px_130px_minmax(0,1fr)_120px] lg:gap-3">
          <div>Status</div>
          <div>Project</div>
          <div>Environment</div>
          <div>Recommendation</div>
          <div>Action</div>
        </div>

        {items.length === 0 ? (
          <div className="ocos-empty-state px-4 py-5 text-sm">No Codex bundles have been created yet.</div>
        ) : (
          <div className="divide-y divide-[var(--ocos-line)]">
            {items.map((item) => (
              <article key={item.id} className="bg-[var(--ocos-surface)] px-3 py-3">
                <div className="grid gap-3 lg:grid-cols-[100px_120px_130px_minmax(0,1fr)_120px] lg:items-start">
                  <div className="text-sm font-medium uppercase tracking-[0.16em] text-[var(--ocos-accent-strong)]">
                    {item.status}
                  </div>
                  <div className="text-sm text-[var(--ocos-ink)]">{item.projectSlug ?? "studio"}</div>
                  <div className="text-sm text-[var(--ocos-ink)]">{item.environmentSlug}</div>
                  <div className="text-sm leading-6 text-[var(--ocos-muted)]">{item.recommendedNextPath}</div>
                  <div>
                    <Link
                      href={`/projects/${item.projectSlug ?? "studio"}/operations?incident=${item.incidentId}`}
                      className="ocos-button inline-flex rounded-[10px] px-3 py-2 text-sm"
                    >
                      Open
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
