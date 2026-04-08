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
    <section className="rounded-[28px] border border-white/10 bg-black/20 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/45">Escalation</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Codex Escalations</h2>
      </div>
      <div className="mt-5 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/60">
            No Codex bundles have been created yet.
          </div>
        ) : null}
        {items.map((item) => (
          <article
            key={item.id}
            className="rounded-[22px] border border-white/10 bg-white/[0.04] p-4"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-teal-300/25 bg-teal-300/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-teal-100">
                    {item.status}
                  </span>
                  {item.projectSlug ? (
                    <span className="text-xs uppercase tracking-[0.24em] text-teal-100/70">{item.projectSlug}</span>
                  ) : null}
                  <span className="text-xs uppercase tracking-[0.24em] text-white/45">{item.environmentSlug}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/68">{item.recommendedNextPath}</p>
              </div>
              <Link
                href={`/projects/${item.projectSlug ?? "studio"}/operations?incident=${item.incidentId}`}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:border-teal-300/35 hover:bg-teal-300/10"
              >
                Open Incident
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
