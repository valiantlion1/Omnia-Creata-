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
    <section className="rounded-[28px] border border-white/10 bg-black/20 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">Reports</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-white/58">{description}</p>
      </div>

      <div className="mt-5 space-y-3">
        {reports.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-white/60">
            No reports materialized yet.
          </div>
        ) : null}

        {reports.map((report) => (
          <Link
            key={report.id}
            href={resolveHref(report)}
            className="block rounded-[22px] border border-white/10 bg-white/[0.04] p-4 transition hover:border-teal-300/30 hover:bg-teal-300/[0.08]"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill tone={report.status}>{report.status}</StatusPill>
                  <span className="text-xs uppercase tracking-[0.24em] text-teal-100/70">{report.projectSlug}</span>
                  <span className="text-xs uppercase tracking-[0.24em] text-white/45">{report.reportType}</span>
                </div>
                <h3 className="mt-3 text-lg font-semibold text-white">{report.headline}</h3>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  {report.projectName} · {report.scopeLevel} scope · {formatTimestamp(report.updatedAt)}
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 px-3 py-2 text-right text-sm text-white/64">
                <div className="text-[11px] uppercase tracking-[0.22em] text-white/35">Window</div>
                <div className="mt-1 text-white/82">
                  {formatTimestamp(report.periodStart)} - {formatTimestamp(report.periodEnd)}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
