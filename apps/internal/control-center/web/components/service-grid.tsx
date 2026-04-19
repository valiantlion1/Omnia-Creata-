import { StatusPill } from "@/components/status-pill";
import type { ServiceView } from "@/lib/ocos-store";

function formatTimestamp(value?: string) {
  if (!value) {
    return "pending";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

export function ServiceGrid({ services }: { services: ServiceView[] }) {
  return (
    <section className="ocos-panel-strong">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="ocos-kicker">Topology</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ocos-ink)]">Services</h2>
        </div>
        <p className="ocos-copy max-w-2xl">
          Studio is the first live surface. More Omnia services can join this topology without changing the operator
          model.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        {services.map((service) => (
          <article
            key={service.id}
            className="grid gap-5 rounded-[28px] border border-[var(--ocos-border-strong)] bg-white/78 p-5 lg:grid-cols-[0.72fr_1.28fr]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="ocos-kicker">Service</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--ocos-ink)]">{service.name}</h3>
                <p className="mt-2 text-sm leading-7 text-[var(--ocos-muted)]">{service.description}</p>
              </div>
              <div className="text-right text-xs uppercase tracking-[0.26em] text-[var(--ocos-muted)]">
                <div>{service.projectSlug}</div>
                <div className="mt-1 text-[var(--ocos-muted)]">{service.slug}</div>
              </div>
            </div>

            <div className="grid gap-3">
              {service.environments.map((environment) => (
                <div
                  key={environment.id}
                  className="grid gap-4 rounded-[22px] border border-[var(--ocos-border)] bg-[var(--ocos-surface-muted)] px-4 py-4 sm:grid-cols-[1.05fr_0.95fr_auto]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusPill tone={environment.currentStatus}>{environment.currentStatus}</StatusPill>
                      <span className="text-sm font-medium text-[var(--ocos-ink)]">{environment.name}</span>
                    </div>
                    <p className="mt-2 font-mono text-xs text-[var(--ocos-muted)]">{environment.baseUrl}</p>
                  </div>
                  <dl className="grid gap-3 text-sm text-[var(--ocos-muted)] sm:grid-cols-2">
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.24em] text-[var(--ocos-muted)]">Cadence</dt>
                      <dd className="mt-1 text-[var(--ocos-ink)]">{environment.cadenceMinutes} min</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.24em] text-[var(--ocos-muted)]">Build</dt>
                      <dd className="mt-1 text-[var(--ocos-ink)]">{environment.lastBuild ?? "unknown"}</dd>
                    </div>
                  </dl>
                  <div className="text-left text-sm text-[var(--ocos-muted)] sm:text-right">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-[var(--ocos-muted)]">Last check</div>
                    <div className="mt-1 text-[var(--ocos-ink)]">{formatTimestamp(environment.lastCheckAt)}</div>
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
