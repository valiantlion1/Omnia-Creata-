import Link from "next/link";

import type { OcosReport, ReportSummary } from "@ocos/contracts";

import { StatusPill } from "@/components/status-pill";

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

type ReportLike = ReportSummary | OcosReport;

function resolveHref(report: ReportLike) {
  return `/projects/${report.projectSlug}/reports`;
}

export function ReportFeed({
  reports,
  title = "Recent Reports",
  description = "Reports stay readable for operators and structured enough for AI or automation to consume without guessing."
}: {
  reports: ReportLike[];
  title?: string;
  description?: string;
}) {
  return (
    <section className="ocos-panel rounded-[16px] p-4">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="ocos-kicker">Digest</p>
          <h2 className="mt-1 text-lg font-semibold tracking-[-0.02em] text-[var(--ocos-ink)]">{title}</h2>
        </div>
        <p className="text-sm leading-6 text-[var(--ocos-muted)]">{description}</p>
      </div>

      <div className="mt-4 overflow-hidden rounded-[12px] border border-[var(--ocos-line)]">
        <div className="hidden border-b border-[var(--ocos-line)] bg-[var(--ocos-surface-muted)] px-3 py-2 text-[11px] uppercase tracking-[0.18em] text-[var(--ocos-soft)] lg:grid lg:grid-cols-[100px_120px_minmax(0,1.4fr)_110px_170px] lg:gap-3">
          <div>Status</div>
          <div>Project</div>
          <div>Headline</div>
          <div>Type</div>
          <div>Window</div>
        </div>

        {reports.length === 0 ? (
          <div className="ocos-empty-state px-4 py-5 text-sm">No reports materialized yet.</div>
        ) : (
          <div className="divide-y divide-[var(--ocos-line)]">
            {reports.map((report) => (
              <Link
                key={report.id}
                href={resolveHref(report)}
                className="block bg-[var(--ocos-surface)] px-3 py-3 transition hover:bg-[var(--ocos-surface-muted)]"
              >
                <div className="grid gap-3 lg:grid-cols-[100px_120px_minmax(0,1.4fr)_110px_170px] lg:items-start">
                  <div>
                    <StatusPill tone={report.status}>{report.status}</StatusPill>
                  </div>
                  <div className="text-sm text-[var(--ocos-ink)]">{report.projectSlug}</div>
                  <div>
                    <div className="text-sm font-medium text-[var(--ocos-ink)]">{report.headline}</div>
                    <div className="mt-1 text-xs text-[var(--ocos-muted)]">
                      {report.projectName} · {report.scopeLevel} · {formatTimestamp(report.updatedAt)}
                    </div>
                  </div>
                  <div className="text-sm text-[var(--ocos-ink)]">{report.reportType}</div>
                  <div className="text-sm text-[var(--ocos-ink)]">
                    {formatTimestamp(report.periodStart)} - {formatTimestamp(report.periodEnd)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
