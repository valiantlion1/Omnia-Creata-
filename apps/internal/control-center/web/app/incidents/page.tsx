import { IncidentList } from "@/components/incident-list";
import { NavShell } from "@/components/nav-shell";
import { listIncidents } from "@/lib/ocos-store";

export default async function IncidentsPage() {
  const incidents = await listIncidents();

  return (
    <NavShell eyebrow="Incident Queue">
      <IncidentList
        incidents={incidents}
        title="All Incidents"
        emptyMessage="No incidents recorded yet. OCOS is quiet."
      />
    </NavShell>
  );
}
