import { ActionRunList } from "@/components/action-run-list";
import { CapabilityMap } from "@/components/capability-map";
import { CodexList } from "@/components/codex-list";
import { CommandDeck } from "@/components/command-deck";
import { IncidentList } from "@/components/incident-list";
import { NavShell } from "@/components/nav-shell";
import { OperatorLoop } from "@/components/operator-loop";
import { OverviewCards } from "@/components/overview-cards";
import { PwaClient } from "@/components/pwa-client";
import { ServiceGrid } from "@/components/service-grid";
import { getSummary } from "@/lib/ocos-store";

export default async function HomePage() {
  const summary = await getSummary();

  return (
    <NavShell eyebrow={summary.demoMode ? "Demo Control Plane" : "Live Control Plane"}>
      <PwaClient summary={summary} />
      <div className="space-y-6">
        <div className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <CommandDeck summary={summary} />
          <CapabilityMap />
        </div>
        <OverviewCards totals={summary.serviceTotals} incidentsBySeverity={summary.incidentsBySeverity} />
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <OperatorLoop summary={summary} />
          <ActionRunList actionRuns={summary.actionRuns.slice(0, 4)} />
        </div>
        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <IncidentList
              incidents={summary.activeIncidents}
              title="Active Queue"
              emptyMessage="No active incidents are open. OCOS is waiting for the next signed event or scheduled probe."
            />
            <ServiceGrid services={summary.services} />
          </div>
          <CodexList items={summary.codexEscalations.slice(0, 3)} />
        </div>
      </div>
    </NavShell>
  );
}
