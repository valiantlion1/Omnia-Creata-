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
            className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
              selected
                ? "border-teal-300/40 bg-teal-300/12 text-teal-50"
                : "border-white/10 bg-white/5 text-white/78 hover:border-teal-300/35 hover:bg-teal-300/10 hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
