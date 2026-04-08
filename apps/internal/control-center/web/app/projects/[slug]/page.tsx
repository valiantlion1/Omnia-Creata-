import { notFound } from "next/navigation";

import { IncidentList } from "@/components/incident-list";
import { NavShell } from "@/components/nav-shell";
import { OverviewCards } from "@/components/overview-cards";
import { ProjectHeader } from "@/components/project-header";
import { PwaClient } from "@/components/pwa-client";
import { ReportCharts } from "@/components/report-charts";
import { ReportFeed } from "@/components/report-feed";
import { ServiceGrid } from "@/components/service-grid";
import { getProject } from "@/lib/ocos-store";

export default async function ProjectOverviewPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) {
    notFound();
  }

  const overviewReport = project.overviewReport;

  return (
    <NavShell eyebrow={`${project.project.name} Overview`}>
      <PwaClient summary={project} />
      <div className="space-y-6">
        <ProjectHeader summary={project} active="overview" />
        <OverviewCards totals={project.serviceTotals} incidentsBySeverity={project.incidentsBySeverity} />

        {overviewReport ? (
          <section className="rounded-[30px] border border-white/10 bg-[#091414]/88 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/42">Project Report</p>
                  <h2 className="mt-2 text-2xl font-semibold text-white">{overviewReport.headline}</h2>
                  <p className="mt-3 max-w-3xl text-sm leading-7 text-white/68">
                    {overviewReport.summary.keyFindings.join(" ")}
                  </p>
                </div>

                <div className="grid gap-3 rounded-[24px] border border-white/10 bg-black/20 p-4 sm:grid-cols-2 xl:grid-cols-4">
                  {overviewReport.metrics.map((metric) => (
                    <article key={metric.key} className="rounded-[18px] border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/38">{metric.label}</p>
                      <div className="mt-3 text-2xl font-semibold text-white">
                        {metric.value}
                        {metric.unit ? metric.unit : ""}
                      </div>
                      <p className="mt-2 text-sm text-white/58">{metric.detail ?? "Structured signal block."}</p>
                    </article>
                  ))}
                </div>
              </div>

              <section className="rounded-[24px] border border-white/10 bg-black/20 p-5">
                <p className="text-xs uppercase tracking-[0.28em] text-white/42">AI Ops Surface</p>
                <h3 className="mt-2 text-xl font-semibold text-white">Readable for operators, structured for machines</h3>
                <ul className="mt-4 space-y-3 text-sm leading-6 text-white/68">
                  {overviewReport.summary.recommendedActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </section>
            </div>

            <div className="mt-6">
              <ReportCharts report={overviewReport} />
            </div>
          </section>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <IncidentList incidents={project.activeIncidents} title="Project Incident Queue" />
          <ReportFeed reports={project.latestReports} title="Project Reports" />
        </div>

        <ServiceGrid services={project.services} />
      </div>
    </NavShell>
  );
}
