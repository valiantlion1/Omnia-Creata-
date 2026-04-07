import { ActionRunList } from "@/components/action-run-list";
import { CodexList } from "@/components/codex-list";
import { IncidentList } from "@/components/incident-list";
import { NavShell } from "@/components/nav-shell";
import { OverviewCards } from "@/components/overview-cards";
import { PwaClient } from "@/components/pwa-client";
import { ServiceGrid } from "@/components/service-grid";
import { getSummary } from "@/lib/ocos-store";

export default async function HomePage() {
  const summary = await getSummary();

  return (
    <NavShell eyebrow={summary.demoMode ? "Demo Control Plane" : "Live Control Plane"}>
      <PwaClient summary={summary} />
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="order-2 space-y-6 xl:order-1">
          <OverviewCards totals={summary.serviceTotals} incidentsBySeverity={summary.incidentsBySeverity} />
          <ServiceGrid services={summary.services} />
        </div>
        <div className="order-1 space-y-6 xl:order-2">
          <IncidentList incidents={summary.activeIncidents} />
          <ActionRunList actionRuns={summary.actionRuns.slice(0, 4)} />
          <CodexList items={summary.codexEscalations.slice(0, 3)} />
        </div>
      </div>
    </NavShell>
  );
}
