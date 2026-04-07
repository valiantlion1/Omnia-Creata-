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
    state: "reserved",
    tone: "muted" as const,
    description: "Recurring audits, wake-up routines, and bounded background jobs."
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
    <section className="rounded-[32px] border border-white/10 bg-[#091414]/88 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-white/42">Control Surfaces</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">What OCOS grows into</h2>
        </div>
        <div className="text-sm text-white/54">One system, multiple operator surfaces</div>
      </div>

      <div className="mt-5 divide-y divide-white/10">
        {surfaces.map((surface) => (
          <article key={surface.name} className="grid gap-3 py-4 sm:grid-cols-[auto_1fr] sm:items-start">
            <div className="flex items-center gap-3">
              <StatusPill tone={surface.tone}>{surface.state}</StatusPill>
              <h3 className="text-base font-medium text-white">{surface.name}</h3>
            </div>
            <p className="text-sm leading-6 text-white/66">{surface.description}</p>
          </article>
        ))}
      </div>

      <div className="mt-5 rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/64">
        Every new surface plugs into the same incident record, access rules, and bounded-action policy. That
        keeps the dashboard readable even as OCOS grows into a wider operating system.
      </div>
    </section>
  );
}
