import { ActionRunList } from "@/components/action-run-list";
import { NavShell } from "@/components/nav-shell";
import { listActionRuns } from "@/lib/ocos-store";

export default async function ActionRunsPage() {
  const actionRuns = await listActionRuns();

  return (
    <NavShell eyebrow="Bounded Actions">
      <ActionRunList actionRuns={actionRuns} />
    </NavShell>
  );
}
