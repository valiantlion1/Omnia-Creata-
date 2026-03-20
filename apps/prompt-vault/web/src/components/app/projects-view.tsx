"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Badge, Button, EmptyState, Input, Textarea } from "@/components/ui/primitives";
import { getEntries, getProjects } from "@/lib/dataset";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

export function ProjectsView() {
  const { dataset, createProject } = useVault();
  const { locale, t } = useLocaleContext();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [showForm, setShowForm] = useState(false);
  const projects = getProjects(dataset);
  const entries = getEntries(dataset);

  function onCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) return;
    createProject({ name, description, color: "gold", icon: "folder" });
    setName("");
    setDescription("");
    setShowForm(false);
  }

  return (
    <div className="mx-auto flex w-full max-w-[600px] flex-col gap-6 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
            {t("app.projectsTitle")}
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-secondary)]">
            {projects.length} {t("common.projects")}
          </p>
        </div>
        <Button onClick={() => setShowForm((c) => !c)} size="sm">
          <Plus className="h-4 w-4" />
          {t("app.createProject")}
        </Button>
      </div>

      {/* Create form */}
      {showForm ? (
        <form
          className="fade-rise space-y-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4"
          onSubmit={onCreate}
        >
          <Input
            onChange={(e) => setName(e.target.value)}
            placeholder={t("app.projectName")}
            value={name}
          />
          <Textarea
            className="min-h-[80px]"
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("app.projectDescription")}
            value={description}
          />
          <div className="flex gap-2">
            <Button type="submit" size="sm">{t("app.createProject")}</Button>
            <Button onClick={() => setShowForm(false)} size="sm" variant="ghost">
              {t("common.cancel")}
            </Button>
          </div>
        </form>
      ) : null}

      {/* Project list */}
      {projects.length > 0 ? (
        <div className="space-y-1.5">
          {projects.map((project) => {
            const count = entries.filter(
              (e) => e.projectId === project.id || e.collectionId === project.id
            ).length;

            return (
              <div
                key={project.id}
                className="vault-row"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[14px] font-medium text-[var(--text-primary)]">
                    {project.name}
                  </div>
                  {project.description ? (
                    <div className="mt-0.5 truncate text-xs text-[var(--text-tertiary)]">
                      {project.description}
                    </div>
                  ) : null}
                </div>
                <Badge tone="accent">{count}</Badge>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title={locale === "tr" ? "Henüz proje yok" : "No projects yet"}
          description={t("app.emptyStateDescription")}
        />
      )}
    </div>
  );
}
