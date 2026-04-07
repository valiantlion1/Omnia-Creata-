import { NavShell } from "@/components/nav-shell";
import { ServiceGrid } from "@/components/service-grid";
import { listServices } from "@/lib/ocos-store";

export default async function ServicesPage() {
  const services = await listServices();

  return (
    <NavShell eyebrow="Service Graph">
      <ServiceGrid services={services} />
    </NavShell>
  );
}
