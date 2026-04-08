import { notFound } from "next/navigation";

import { NavShell } from "@/components/nav-shell";
import { ProjectHeader } from "@/components/project-header";
import { ReportCharts } from "@/components/report-charts";
import { ReportFeed } from "@/components/report-feed";
import { getProject, listReports, upsertProjectPeriodicReport } from "@/lib/ocos-store";

export default async function ProjectReportsPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) {
    notFound();
  }

  await upsertProjectPeriodicReport(slug, "weekly");
  const reports = await listReports({
    projectSlug: slug,
    limit: 20
  });
  const primaryReport = reports[0] ?? project.overviewReport ?? null;

  return (
    <NavShell eyebrow={`${project.project.name} Reports`}>
      <div className="space-y-6">
        <ProjectHeader summary={project} active="reports" />

        {primaryReport ? (
          <section className="rounded-[30px] border border-white/10 bg-[#091414]/88 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/42">Primary Report</p>
                <h2 className="mt-2 text-2xl font-semibold text-white">{primaryReport.headline}</h2>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68">
                  {primaryReport.summary.keyFindings.join(" ")}
                </p>
              </div>
            </div>
            <div className="mt-6">
              <ReportCharts report={primaryReport} />
            </div>
          </section>
        ) : null}

        <ReportFeed
          reports={reports}
          title="Materialized Reports"
          description="Daily and weekly reports persist as structured data blocks so operators, automations, and future AI runtimes can all reason over the same surface."
        />
      </div>
    </NavShell>
  );
}
