import { notFound } from "next/navigation";

import { NavShell } from "@/components/nav-shell";
import { ProjectHeader } from "@/components/project-header";
import { ServiceGrid } from "@/components/service-grid";
import { getProject } from "@/lib/ocos-store";

export default async function ProjectServicesPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) {
    notFound();
  }

  return (
    <NavShell eyebrow={`${project.project.name} Services`}>
      <div className="space-y-6">
        <ProjectHeader summary={project} active="services" />
        <ServiceGrid services={project.services} />
      </div>
    </NavShell>
  );
}
