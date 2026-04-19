import Link from "next/link";

const tabs = [
  {
    key: "overview",
    label: "Overview",
    href: (projectSlug: string) => `/projects/${projectSlug}`
  },
  {
    key: "services",
    label: "Services",
    href: (projectSlug: string) => `/projects/${projectSlug}/services`
  },
  {
    key: "operations",
    label: "Operations",
    href: (projectSlug: string) => `/projects/${projectSlug}/operations`
  },
  {
    key: "automations",
    label: "Automations",
    href: (projectSlug: string) => `/projects/${projectSlug}/automations`
  },
  {
    key: "reports",
    label: "Reports",
    href: (projectSlug: string) => `/projects/${projectSlug}/reports`
  }
] as const;

export function ProjectTabs({
  projectSlug,
  active
}: {
  projectSlug: string;
  active: (typeof tabs)[number]["key"];
}) {
  return (
    <nav className="flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const selected = tab.key === active;
        return (
          <Link
            key={tab.key}
            href={tab.href(projectSlug)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              selected
                ? "border border-[rgba(23,107,102,0.18)] bg-[rgba(23,107,102,0.08)] text-[var(--ocos-accent)]"
                : "border border-transparent bg-white/58 text-[var(--ocos-muted)] hover:border-[rgba(23,107,102,0.14)] hover:bg-[rgba(23,107,102,0.06)] hover:text-[var(--ocos-ink)]"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
