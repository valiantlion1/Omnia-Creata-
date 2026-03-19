"use client";

import { FolderKanban, Plus } from "lucide-react";
import Link from "next/link";
import { getEntries, getProjects } from "@/lib/dataset";
import { localizeHref } from "@/lib/locale";
import { Badge, Surface } from "@/components/ui/primitives";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

export function ProjectCard({ projectId }: { projectId: string }) {
  const { dataset } = useVault();
  const { locale, t } = useLocaleContext();
  const project = getProjects(dataset).find((item) => item.id === projectId);

  if (!project) {
    return null;
  }

  const relatedEntries = getEntries(dataset).filter(
    (entry) => entry.projectId === project.id || entry.collectionId === project.id
  );

  return (
    <Surface className="overflow-hidden rounded-[20px] bg-[rgba(24,23,22,0.96)] p-4 transition duration-200 hover:border-[var(--border-strong)] hover:bg-[rgba(30,29,28,0.98)]">
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[rgba(242,202,80,0.1)] text-[var(--accent-strong)]">
                <FolderKanban className="h-4 w-4" />
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
                  {t("common.projects")}
                </div>
                <div className="text-lg font-semibold tracking-[-0.03em] text-[var(--text-primary)]">
                  {project.name}
                </div>
              </div>
            </div>
            {project.description ? (
              <p className="text-sm leading-6 text-[var(--text-secondary)]">{project.description}</p>
            ) : null}
          </div>
          <Badge tone="accent">
            {relatedEntries.length} {t("app.itemsLabel")}
          </Badge>
        </div>

        <div className="space-y-3">
          {relatedEntries.slice(0, 3).map((entry) => (
            <Link
              key={entry.id}
              className="flex items-center justify-between rounded-[16px] border border-[var(--border)] bg-[var(--surface-strong)] px-3.5 py-3"
              href={localizeHref(locale, `/app/library/${entry.id}`)}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
                  {entry.title}
                </div>
                <div className="truncate text-xs uppercase tracking-[0.12em] text-[var(--text-tertiary)]">
                  {entry.type}
                </div>
              </div>
              <Plus className="h-4 w-4 shrink-0 text-[var(--accent-strong)]" />
            </Link>
          ))}
        </div>
      </div>
    </Surface>
  );
}
