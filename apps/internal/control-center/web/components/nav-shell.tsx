import Link from "next/link";
import type { ReactNode } from "react";

import { appEnv } from "@/lib/env";

const navItems = [
  { href: "/", label: "Org Home" },
  { href: "/projects", label: "Projects" },
  { href: "/incidents", label: "Incidents" },
  { href: "/services", label: "Services" },
  { href: "/action-runs", label: "Action Runs" },
  { href: "/codex", label: "Codex" },
  { href: "/settings", label: "Settings" }
];

export function NavShell({
  children,
  eyebrow
}: {
  children: ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(38,145,124,0.12),_transparent_34%),linear-gradient(180deg,_#06100f_0%,_#081312_44%,_#091313_100%)] text-white">
      <div className="mx-auto flex min-h-screen max-w-[1440px] flex-col px-4 pb-10 pt-4 sm:px-6 lg:px-8">
        <header className="mb-6 rounded-[30px] border border-white/10 bg-[#091414]/88 px-5 py-5 shadow-[0_20px_80px_rgba(0,0,0,0.24)] backdrop-blur-xl">
          <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.35em] text-teal-200/70">
                {eyebrow ?? "OmniaCreata Incident OS"}
              </p>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  OCOS
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-white/70 sm:text-base">
                  Internal command center for Studio-first monitoring, bounded response, hosted operator access,
                  and future Omnia control surfaces.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs uppercase tracking-[0.24em] text-white/52">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Hosted UI</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Bounded Actions</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5">Studio First</span>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[340px]">
              <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/78">
                <div className="text-[11px] uppercase tracking-[0.26em] text-white/45">Operator Host</div>
                <div className="mt-2">{appEnv.publicHostname}</div>
              </div>
              <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-50/80">
                <div className="text-[11px] uppercase tracking-[0.26em] text-amber-100/60">Access Model</div>
                <div className="mt-2">Internal Only</div>
              </div>
            </div>
          </div>
          <nav className="mt-5 flex flex-wrap gap-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 transition hover:border-teal-300/40 hover:bg-teal-300/10 hover:text-white"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
