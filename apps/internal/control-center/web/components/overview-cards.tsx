import { Activity, BellRing, ShieldAlert, Wrench } from "lucide-react";

export function OverviewCards({
  totals,
  incidentsBySeverity
}: {
  totals: {
    total: number;
    healthy: number;
    degraded: number;
    failed: number;
  };
  incidentsBySeverity: Record<"P1" | "P2" | "P3", number>;
}) {
  const cards = [
    {
      label: "Tracked Environments",
      value: String(totals.total),
      detail: `${totals.healthy} healthy, ${totals.degraded} degraded, ${totals.failed} failed`,
      icon: Activity
    },
    {
      label: "P1",
      value: String(incidentsBySeverity.P1),
      detail: "Hard down or shell failure",
      icon: ShieldAlert
    },
    {
      label: "P2",
      value: String(incidentsBySeverity.P2),
      detail: "Degraded health or verify failure",
      icon: Wrench
    },
    {
      label: "P3",
      value: String(incidentsBySeverity.P3),
      detail: "Digest-only drift or staging noise",
      icon: BellRing
    }
  ];

  return (
    <section className="rounded-[30px] border border-white/10 bg-[#091414]/88 px-5 py-4 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/42">Signal Strip</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">What matters right now</h2>
        </div>
        <p className="max-w-2xl text-sm leading-6 text-white/58">
          Keep the top layer readable: environment health first, then incident severity. Everything else lives deeper
          in the workflow.
        </p>
      </div>

      <div className="mt-5 grid gap-px overflow-hidden rounded-[24px] border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article
            key={card.label}
            className="bg-[#091212] p-5"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">{card.label}</p>
                <div className="mt-4 text-4xl font-semibold tracking-tight text-white">{card.value}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-black/20 p-3 text-teal-100">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-sm text-white/65">{card.detail}</p>
          </article>
        );
      })}
      </div>
    </section>
  );
}
