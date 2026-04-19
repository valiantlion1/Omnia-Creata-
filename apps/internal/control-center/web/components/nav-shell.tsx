import Link from "next/link";
import type { ReactNode } from "react";

import { appEnv } from "@/lib/env";

const navItems = [
  { href: "/", label: "Org Home", detail: "Situation and queue" },
  { href: "/projects", label: "Projects", detail: "Project health summary" },
  { href: "/incidents", label: "Incidents", detail: "Open queue" },
  { href: "/services", label: "Services", detail: "Environment map" },
  { href: "/automations", label: "Automations", detail: "Playbooks and recurring jobs" },
  { href: "/action-runs", label: "Action Runs", detail: "Execution history" },
  { href: "/codex", label: "Codex", detail: "Escalation lane" },
  { href: "/settings", label: "Settings", detail: "Runtime notes" }
];

export function NavShell({
  children,
  eyebrow
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="min-h-screen text-[var(--ocos-ink)]">
      <a href="#main-content" className="ocos-skip-link">
        Skip To Main Content
      </a>
      <div className="mx-auto max-w-[1700px] px-3 py-3 sm:px-4 lg:px-5">
        <div className="grid gap-4 xl:grid-cols-[250px_minmax(0,1fr)]">
          <div className="order-1 space-y-4 xl:order-2">
            <header className="ocos-panel-strong ocos-appear rounded-[16px] px-4 py-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="ocos-kicker">{eyebrow ?? "Organization Workbench"}</p>
                  <h1 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-[var(--ocos-ink)] sm:text-2xl">
                    OCOS internal operations workbench
                  </h1>
                </div>

                <div className="grid gap-px overflow-hidden rounded-[12px] border border-[var(--ocos-line)] bg-[var(--ocos-line)] sm:grid-cols-3">
                  <div className="bg-[var(--ocos-surface-muted)] px-3 py-2">
                    <div className="ocos-kicker">Model</div>
                    <div className="mt-1 text-sm font-medium text-[var(--ocos-ink)]">Project-aware</div>
                  </div>
                  <div className="bg-[var(--ocos-surface-muted)] px-3 py-2">
                    <div className="ocos-kicker">Access</div>
                    <div className="mt-1 text-sm font-medium text-[var(--ocos-ink)]">Internal only</div>
                  </div>
                  <div className="bg-[var(--ocos-surface-muted)] px-3 py-2">
                    <div className="ocos-kicker">Policy</div>
                    <div className="mt-1 text-sm font-medium text-[var(--ocos-ink)]">Bounded actions</div>
                  </div>
                </div>
              </div>
            </header>

            <main id="main-content" className="space-y-4">
              {children}
            </main>
          </div>

          <aside className="order-2 h-fit rounded-[16px] xl:order-1">
            <div className="ocos-panel-strong ocos-appear overflow-hidden rounded-[16px]">
              <div className="border-b border-[var(--ocos-line)] px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="ocos-kicker">Internal Control Center</p>
                    <div className="mt-1 text-2xl font-semibold tracking-[-0.05em] text-[var(--ocos-ink)]">OCOS</div>
                  </div>
                  <div className="rounded-[10px] border border-[var(--ocos-line)] bg-[var(--ocos-surface-muted)] px-2.5 py-1.5 text-right">
                    <div className="ocos-kicker">Scope</div>
                    <div className="mt-1 text-sm font-medium text-[var(--ocos-accent-strong)]">Studio v0</div>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--ocos-muted)]">
                  Internal-only incident cockpit for live queue reading, bounded action dispatch, and Codex handoff.
                </p>
              </div>

              <nav className="grid gap-1 p-2">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href} className="ocos-nav-link rounded-[10px] px-3 py-2.5">
                    <div className="text-sm font-semibold text-[var(--ocos-ink)]">{item.label}</div>
                    <div className="mt-0.5 text-xs text-[var(--ocos-muted)]">{item.detail}</div>
                  </Link>
                ))}
              </nav>

              <div className="grid gap-px border-t border-[var(--ocos-line)] bg-[var(--ocos-line)] sm:grid-cols-3 xl:grid-cols-1">
                <div className="bg-[var(--ocos-surface)] px-4 py-3">
                  <div className="ocos-kicker">Operator UI</div>
                  <div className="mt-1 text-sm font-medium text-[var(--ocos-ink)]">{appEnv.publicHostname}</div>
                </div>
                <div className="bg-[var(--ocos-surface)] px-4 py-3">
                  <div className="ocos-kicker">Ingress</div>
                  <div className="mt-1 text-sm font-medium text-[var(--ocos-ink)]">Signed worker + PAT</div>
                </div>
                <div className="bg-[var(--ocos-surface)] px-4 py-3">
                  <div className="ocos-kicker">Remediation</div>
                  <div className="mt-1 text-sm font-medium text-[var(--ocos-ink)]">Bounded only</div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
