import type { ServiceView } from "@/lib/ocos-store";
import { StatusPill } from "@/components/status-pill";

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
    <section className="rounded-[30px] border border-white/10 bg-[#091414]/88 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/45">Topology</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Services</h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-white/58">
          Studio is the first live surface. More Omnia services can join this topology without changing the operator
          model.
        </p>
      </div>

      <div className="mt-6 divide-y divide-white/10">
        {services.map((service) => (
          <article
            key={service.id}
            className="grid gap-5 py-6 lg:grid-cols-[0.72fr_1.28fr]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                <p className="mt-2 text-sm leading-6 text-white/65">{service.description}</p>
              </div>
              <div className="text-right text-xs uppercase tracking-[0.26em] text-white/35">
                {service.slug}
              </div>
            </div>

            <div className="space-y-3">
              {service.environments.map((environment) => (
                <div
                  key={environment.id}
                  className="grid gap-4 rounded-[22px] border border-white/10 bg-black/20 px-4 py-4 sm:grid-cols-[1.05fr_0.95fr_auto]"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <StatusPill tone={environment.currentStatus}>{environment.currentStatus}</StatusPill>
                      <span className="text-sm font-medium text-white">{environment.name}</span>
                    </div>
                    <p className="mt-2 text-sm text-white/62">{environment.baseUrl}</p>
                  </div>
                  <dl className="grid gap-3 text-sm text-white/58 sm:grid-cols-2">
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.24em] text-white/35">Cadence</dt>
                      <dd className="mt-1 text-white/80">{environment.cadenceMinutes} min</dd>
                    </div>
                    <div>
                      <dt className="text-[11px] uppercase tracking-[0.24em] text-white/35">Build</dt>
                      <dd className="mt-1 text-white/80">{environment.lastBuild ?? "unknown"}</dd>
                    </div>
                  </dl>
                  <div className="text-left text-sm text-white/58 sm:text-right">
                    <div className="text-[11px] uppercase tracking-[0.24em] text-white/35">Last check</div>
                    <div className="mt-1 text-white/80">{formatTimestamp(environment.lastCheckAt)}</div>
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
