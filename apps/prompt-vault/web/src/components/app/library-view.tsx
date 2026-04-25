"use client";

import { useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { FileText, FolderOpen, Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/primitives";
import { getProjects } from "@/lib/dataset";
import { formatRelative } from "@/lib/format";
import { localizeHref } from "@/lib/locale";
import { defaultFilters, filterEntries } from "@/lib/vault-utils";
import { cn } from "@/lib/cn";
import { useLocaleContext } from "@/providers/locale-provider";
import { useVault } from "@/providers/vault-provider";

const filterTabs = ["all", "prompt", "idea", "workflow", "note"] as const;

export function LibraryView() {
  const { dataset } = useVault();
  const { locale, t } = useLocaleContext();
  const [activeTab, setActiveTab] = useState<(typeof filterTabs)[number]>("all");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const projects = getProjects(dataset);
  const entries = filterEntries(dataset, {
    ...defaultFilters,
    query: deferredQuery,
    type: activeTab === "all" ? "all" : activeTab
  });

  const recentEntries = useMemo(
    () => [...entries].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt)).slice(0, 8),
    [entries]
  );

  return (
    <div className="space-y-7">
      <section className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-tertiary)]" />
          <Input
            className="h-12 rounded-[14px] bg-[rgba(255,252,245,0.72)] pl-11"
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("app.searchPlaceholder")}
            value={query}
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              className={cn("omni-filter-pill vault-press", activeTab === tab ? "is-active" : "")}
              onClick={() => setActiveTab(tab)}
              type="button"
            >
              {labelForTab(tab, locale)}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle
          action={locale === "tr" ? "Yeni" : "New"}
          href={localizeHref(locale, "/app/projects")}
          title={locale === "tr" ? "Projeler" : "Projects"}
        />
        <div className="omni-simple-list">
          {projects.slice(0, 4).map((project) => {
            const count = entries.filter((entry) => entry.projectId === project.id || entry.collectionId === project.id).length;
            return (
              <LibraryRow
                key={project.id}
                href={localizeHref(locale, "/app/projects")}
                icon={<FolderOpen className="h-4 w-4" />}
                meta={`${count} ${locale === "tr" ? "kayit" : "items"}`}
                title={project.name}
              />
            );
          })}
          <LibraryRow
            href={localizeHref(locale, "/app/projects")}
            icon={<FolderOpen className="h-4 w-4" />}
            meta={locale === "tr" ? "Tum proje alanlari" : "All project spaces"}
            title={locale === "tr" ? "Tum projeleri gor" : "View all projects"}
          />
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle
          action={`${recentEntries.length}`}
          title={locale === "tr" ? "Son" : "Recent"}
        />
        <div className="omni-simple-list">
          {recentEntries.length > 0 ? (
            recentEntries.map((entry) => (
              <LibraryRow
                key={entry.id}
                href={localizeHref(locale, `/app/library/${entry.id}`)}
                icon={<FileText className="h-4 w-4" />}
                meta={`${formatRelative(entry.updatedAt, locale)} · ${entry.type.replace(/_/g, " ")}`}
                title={entry.title}
              />
            ))
          ) : (
            <div className="px-4 py-5 text-sm text-[var(--text-secondary)]">
              {locale === "tr" ? "Eslesen kayit yok." : "No matching entries."}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function labelForTab(tab: (typeof filterTabs)[number], locale: "en" | "tr") {
  const labels = {
    en: { all: "All", prompt: "Prompts", idea: "Ideas", workflow: "Workflows", note: "Notes" },
    tr: { all: "Tum", prompt: "Promptlar", idea: "Fikirler", workflow: "Akislar", note: "Notlar" }
  } as const;
  return labels[locale][tab];
}

function SectionTitle({
  action,
  href,
  title
}: {
  action?: string;
  href?: string;
  title: string;
}) {
  const content = action ? (
    <span className="text-[13px] font-medium text-[var(--accent-strong)]">{action}</span>
  ) : null;

  return (
    <div className="flex items-center justify-between">
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">{title}</h2>
      {href && action ? <Link href={href}>{content}</Link> : content}
    </div>
  );
}

function LibraryRow({
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
