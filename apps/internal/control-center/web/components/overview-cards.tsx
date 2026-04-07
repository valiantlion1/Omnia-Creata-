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
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => {
        const Icon = card.icon;
        return (
          <article
            key={card.label}
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.18)]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">{card.label}</p>
                <div className="mt-4 text-4xl font-semibold tracking-tight text-white">{card.value}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-3 text-teal-100">
                <Icon className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-4 text-sm text-white/65">{card.detail}</p>
          </article>
        );
      })}
    </div>
  );
}
