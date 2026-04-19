import { ActionRunList } from "@/components/action-run-list";
import { CodexList } from "@/components/codex-list";
import { CommandDeck } from "@/components/command-deck";
import { IncidentList } from "@/components/incident-list";
import { NavShell } from "@/components/nav-shell";
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
      <div className="space-y-4">
        <CommandDeck summary={summary} />

        <OverviewCards totals={summary.serviceTotals} incidentsBySeverity={summary.incidentsBySeverity} />

        <div className="grid gap-4 xl:grid-cols-[1.28fr_0.72fr]">
          <IncidentList
            incidents={summary.activeIncidents}
            title="Active Queue"
            emptyMessage="No active incidents are open. OCOS is waiting for the next signed event or scheduled probe."
          />
          <div className="space-y-4">
            <ActionRunList actionRuns={summary.actionRuns.slice(0, 6)} />
            <CodexList items={summary.codexEscalations.slice(0, 4)} />
          </div>
        </div>

        <ProjectGrid
          projects={summary.projects}
          title="Project Health Summary"
          description="Project row summary for degraded services, open incident count, and report currency."
        />

        <ReportFeed
          reports={summary.latestReports}
          title="Notification Digest"
          description="Latest daily, weekly, and overview report material for operator follow-up."
        />
      </div>
    </NavShell>
  );
}
