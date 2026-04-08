import { ActionRunList } from "@/components/action-run-list";
import { CapabilityMap } from "@/components/capability-map";
import { CodexList } from "@/components/codex-list";
import { CommandDeck } from "@/components/command-deck";
import { IncidentList } from "@/components/incident-list";
import { NavShell } from "@/components/nav-shell";
import { OperatorLoop } from "@/components/operator-loop";
import { OverviewCards } from "@/components/overview-cards";
import { PwaClient } from "@/components/pwa-client";
import { ProjectGrid } from "@/components/project-grid";
import { ReportFeed } from "@/components/report-feed";
import { getSummary } from "@/lib/ocos-store";

export default async function HomePage() {
  const summary = await getSummary();

  return (
    <NavShell eyebrow={summary.demoMode ? "Demo Org Home" : "Organization Home"}>
      <PwaClient summary={summary} />
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <CommandDeck summary={summary} />
          <CapabilityMap />
        </div>
        <OverviewCards totals={summary.serviceTotals} incidentsBySeverity={summary.incidentsBySeverity} />
        <ProjectGrid projects={summary.projects} />
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <IncidentList
            incidents={summary.activeIncidents}
            title="Active Queue"
            emptyMessage="No active incidents are open. OCOS is waiting for the next signed event or scheduled probe."
          />
          <ReportFeed reports={summary.latestReports} />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <OperatorLoop summary={summary} />
          <ActionRunList actionRuns={summary.actionRuns.slice(0, 4)} />
        </div>
        <CodexList items={summary.codexEscalations.slice(0, 4)} />
      </div>
    </NavShell>
  );
}
