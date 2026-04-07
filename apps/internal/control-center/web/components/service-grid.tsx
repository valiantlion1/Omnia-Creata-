import type { ServiceView } from "@/lib/ocos-store";
import { StatusPill } from "@/components/status-pill";

export function ServiceGrid({ services }: { services: ServiceView[] }) {
  return (
    <section className="rounded-[28px] border border-white/10 bg-black/20 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-white/45">Topology</p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Services</h2>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        {services.map((service) => (
          <article
            key={service.id}
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5"
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

            <div className="mt-5 grid gap-3">
              {service.environments.map((environment) => (
                <div
                  key={environment.id}
                  className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <StatusPill tone={environment.currentStatus}>{environment.currentStatus}</StatusPill>
                        <span className="text-sm font-medium text-white">{environment.name}</span>
                      </div>
                      <p className="mt-2 text-sm text-white/62">{environment.baseUrl}</p>
                    </div>
                    <dl className="text-right text-sm text-white/58">
                      <div>
                        <dt className="text-[11px] uppercase tracking-[0.24em] text-white/35">Cadence</dt>
                        <dd className="mt-1 text-white/80">{environment.cadenceMinutes} min</dd>
                      </div>
                      <div className="mt-2">
                        <dt className="text-[11px] uppercase tracking-[0.24em] text-white/35">Build</dt>
                        <dd className="mt-1 text-white/80">{environment.lastBuild ?? "unknown"}</dd>
                      </div>
                    </dl>
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
