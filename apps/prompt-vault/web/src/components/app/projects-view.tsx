"use client";

import { useState } from "react";
import { ProjectCard } from "@/components/app/project-card";
import { Badge, Button, Input, Surface, Textarea } from "@/components/ui/primitives";
import { getEntries, getProjects } from "@/lib/dataset";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

export function ProjectsView() {
  const { dataset, createProject } = useVault();
  const { t } = useLocaleContext();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const projects = getProjects(dataset);
  const entries = getEntries(dataset);

  function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      return;
    }

    createProject({
      name,
      description,
      color: "gold",
      icon: "folder"
    });
    setName("");
    setDescription("");
  }

  return (
    <div className="space-y-6 lg:space-y-7">
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Surface className="rounded-[28px] bg-[linear-gradient(135deg,rgba(242,202,80,0.08),rgba(20,20,20,0.92)_48%,rgba(111,151,141,0.06))] p-5 md:p-6">
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Badge tone="accent">
                {projects.length} {t("common.projects")}
              </Badge>
              <Badge tone="info">
                {entries.length} {t("app.itemsLabel")}
              </Badge>
            </div>
            <div className="space-y-2">
              <h1 className="font-display text-3xl font-extrabold tracking-[-0.05em] text-[var(--text-primary)] md:text-[2rem]">
                {t("app.projectsTitle")}
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-[var(--text-secondary)] md:text-base md:leading-8">
                {t("app.projectsSubtitle")}
              </p>
            </div>
          </div>
        </Surface>

        <Surface className="rounded-[28px] bg-[rgba(20,20,20,0.9)] p-5 md:p-6">
          <form className="space-y-4" onSubmit={onCreate}>
            <div className="space-y-1">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                {t("app.createProject")}
              </div>
              <div className="font-display text-xl font-bold tracking-[-0.04em] text-[var(--text-primary)]">
                {localeProjectCopy(t)}
              </div>
            </div>
            <div className="space-y-3">
              <Input
                onChange={(event) => setName(event.target.value)}
                placeholder={t("app.projectName")}
                value={name}
              />
              <Textarea
                className="min-h-[120px]"
                onChange={(event) => setDescription(event.target.value)}
                placeholder={t("app.projectDescription")}
                value={description}
              />
            </div>
            <Button type="submit">{t("app.createProject")}</Button>
          </form>
        </Surface>
      </section>

      {projects.length > 0 ? (
        <div className="space-y-4">
          {projects.map((project) => (
            <ProjectCard key={project.id} projectId={project.id} />
          ))}
        </div>
      ) : (
        <Surface className="rounded-[22px] bg-[rgba(28,27,27,0.96)] p-6">
          <p className="text-sm leading-7 text-[var(--text-secondary)]">{t("app.emptyStateDescription")}</p>
        </Surface>
      )}
    </div>
  );
}

function localeProjectCopy(t: (path: string) => string) {
  return t("app.projectsWorkspaceTitle");
}
