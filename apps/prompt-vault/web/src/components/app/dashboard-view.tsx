"use client";

import Link from "next/link";
import { FileText, FolderOpen, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/primitives";
import { getEntries, getProjects } from "@/lib/dataset";
import { formatRelative } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

export function DashboardView() {
  const { dataset } = useVault();
  const { locale } = useLocaleContext();
  const entries = getEntries(dataset);
  const projects = getProjects(dataset);
  const recentEntries = [...entries]
    .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt))
    .slice(0, 5);

  return (
    <div className="space-y-8">
      <section className="space-y-6 pt-3">
        <div>
          <h1 className="font-serif text-[43px] font-bold leading-none tracking-[-0.07em] text-[var(--text-primary)]">
            Home
          </h1>
          <p className="mt-3 max-w-[300px] text-[15px] leading-6 text-[var(--text-secondary)]">
            {locale === "tr"
              ? "Once yakala, sonra don. Fikir guvendeyse duzen bekleyebilir."
              : "Capture first, return fast, organize once the idea is safe."}
          </p>
        </div>

        <Link href={localizeHref(locale, "/app/capture")}>
          <Button className="h-14 w-full rounded-[14px] text-[15px]" size="lg">
            <Plus className="h-5 w-5" />
            {locale === "tr" ? "Yeni kayit" : "New prompt"}
          </Button>
        </Link>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
            {locale === "tr" ? "Son kayitlar" : "Recent prompts"}
          </h2>
          <Link
            className="text-[12px] font-medium text-[var(--accent-strong)]"
            href={localizeHref(locale, "/app/library")}
          >
            {locale === "tr" ? "Tumunu gor" : "View all"}
          </Link>
        </div>

        <div className="omni-simple-list">
          {recentEntries.length > 0 ? (
            recentEntries.map((entry) => (
              <HomeRow
                key={entry.id}
                href={localizeHref(locale, `/app/library/${entry.id}`)}
                icon={<FileText className="h-4 w-4" />}
                meta={`${formatRelative(entry.updatedAt, locale)} · ${entry.type.replace(/_/g, " ")}`}
                title={entry.title}
              />
            ))
          ) : (
            <div className="px-4 py-5 text-sm text-[var(--text-secondary)]">
              {locale === "tr" ? "Ilk kaydin burada gorunur." : "Your first entry will appear here."}
            </div>
          )}
        </div>
      </section>

      {projects.length > 0 ? (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
              {locale === "tr" ? "Projeler" : "Projects"}
            </h2>
            <Link
              className="text-[12px] font-medium text-[var(--accent-strong)]"
              href={localizeHref(locale, "/app/projects")}
            >
              {locale === "tr" ? "Ac" : "Open"}
            </Link>
          </div>
          <div className="omni-simple-list">
            {projects.slice(0, 3).map((project) => {
              const count = entries.filter((entry) => entry.projectId === project.id || entry.collectionId === project.id).length;
              return (
                <HomeRow
                  key={project.id}
                  href={localizeHref(locale, "/app/projects")}
                  icon={<FolderOpen className="h-4 w-4" />}
                  meta={`${count} ${locale === "tr" ? "kayit" : "items"}`}
                  title={project.name}
                />
              );
            })}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function HomeRow({
  href,
  icon,
  meta,
  title
}: {
  href: string;
  icon: ReactNode;
  meta: string;
  title: string;
}) {
  return (
    <Link className="omni-simple-row vault-press" href={href}>
      <span className="omni-row-icon">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-medium text-[var(--text-primary)]">{title}</span>
        <span className="mt-1 block truncate text-[12px] text-[var(--text-tertiary)]">{meta}</span>
      </span>
    </Link>
  );
}
