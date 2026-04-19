import { Suspense } from "react";

import { AutomationsWorkbench } from "@/components/automations-workbench";
import { NavShell } from "@/components/nav-shell";
import { listAutomations } from "@/lib/ocos-automations";

function AutomationsFallback() {
  return (
    <section className="ocos-panel rounded-[16px] p-4 text-sm text-[var(--ocos-muted)]">
      Loading automations…
    </section>
  );
}

export default async function AutomationsPage() {
  const automations = await listAutomations();

  return (
    <NavShell eyebrow="Automations">
      <Suspense fallback={<AutomationsFallback />}>
        <AutomationsWorkbench
          automations={automations}
          title="Automations"
          description="Read recurring playbooks, event-triggered jobs, and bounded operator routines without collapsing the whole system into one dashboard."
        />
      </Suspense>
    </NavShell>
  );
}
