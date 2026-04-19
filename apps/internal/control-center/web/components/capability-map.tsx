import { StatusPill } from "@/components/status-pill";

const surfaces = [
  {
    name: "Web / PWA",
    state: "live",
    tone: "healthy" as const,
    description: "Primary operator cockpit for desktop and phone."
  },
  {
    name: "CLI",
    state: "live",
    tone: "healthy" as const,
    description: "Terminal entrypoint for status, ack, recheck, verify, and escalation."
  },
  {
    name: "Automations",
    state: "preview",
    tone: "open" as const,
    description: "Playbooks, recurring audits, and bounded background jobs now have a first-class workbench lane."
  },
  {
    name: "Skills",
    state: "ready",
    tone: "healthy" as const,
    description: "Domain runbooks that keep operators and Codex working from the same playbook."
  },
  {
    name: "Agents",
    state: "reserved",
    tone: "muted" as const,
    description: "Future bounded workers for investigation and remediation handoff."
  },
  {
    name: "AI Runtime",
    state: "reserved",
    tone: "muted" as const,
    description: "Future Omnia-owned inference and reasoning layer on the same control plane."
  }
];

export function CapabilityMap() {
  return (
    <section className="ocos-panel-strong">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="ocos-kicker">Control Surfaces</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ocos-ink)]">
            What OCOS grows into
          </h2>
        </div>
        <div className="text-sm text-[var(--ocos-muted)]">One system, multiple operator surfaces</div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {surfaces.map((surface) => (
          <article
            key={surface.name}
            className="rounded-[24px] border border-[var(--ocos-border-strong)] bg-white/78 p-4"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-semibold text-[var(--ocos-ink)]">{surface.name}</h3>
              <StatusPill tone={surface.tone}>{surface.state}</StatusPill>
            </div>
            <p className="mt-3 text-sm leading-7 text-[var(--ocos-muted)]">{surface.description}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-[24px] border border-[var(--ocos-border)] bg-[var(--ocos-surface-muted)] p-4 text-sm leading-7 text-[var(--ocos-ink)]">
        Every new surface plugs into the same incident record, access rules, and bounded-action policy. That keeps the
        shell calm even while the system grows wider behind it.
      </div>
    </section>
  );
}
