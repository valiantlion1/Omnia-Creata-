import { NavShell } from "@/components/nav-shell";
import { ProjectGrid } from "@/components/project-grid";
import { ReportFeed } from "@/components/report-feed";
import { getSummary } from "@/lib/ocos-store";

export default async function ProjectsPage() {
  const summary = await getSummary();

  return (
    <NavShell eyebrow="Project Cockpits">
      <div className="space-y-6">
        <ProjectGrid
          projects={summary.projects}
          title="All Projects"
          description="Projects are the first-class cockpit boundary in OCOS. Each one keeps its own services, operations, and report memory."
        />
        <ReportFeed reports={summary.latestReports} title="Latest Project Reports" />
      </div>
    </NavShell>
  );
}
