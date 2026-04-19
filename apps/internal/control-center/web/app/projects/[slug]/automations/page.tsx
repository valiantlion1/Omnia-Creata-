import { Suspense } from "react";

import { notFound } from "next/navigation";

import { AutomationsWorkbench } from "@/components/automations-workbench";
import { NavShell } from "@/components/nav-shell";
import { ProjectHeader } from "@/components/project-header";
import { listAutomations } from "@/lib/ocos-automations";
import { getProject } from "@/lib/ocos-store";

function ProjectAutomationsFallback() {
  return (
    <section className="ocos-panel rounded-[16px] p-4 text-sm text-[var(--ocos-muted)]">
      Loading project automations…
    </section>
  );
}

export default async function ProjectAutomationsPage({
  params
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) {
    notFound();
  }

  const automations = await listAutomations(slug);

  return (
    <NavShell eyebrow={`${project.project.name} Automations`}>
      <div className="space-y-6">
        <ProjectHeader summary={project} active="automations" />
        <Suspense fallback={<ProjectAutomationsFallback />}>
          <AutomationsWorkbench
            automations={automations}
            title={`${project.project.name} automations`}
            description="Project-scoped playbooks keep recurring checks, bounded actions, and escalation prep readable without burying the operator in one giant dashboard."
            lockedProjectSlug={slug}
          />
        </Suspense>
      </div>
    </NavShell>
  );
}
