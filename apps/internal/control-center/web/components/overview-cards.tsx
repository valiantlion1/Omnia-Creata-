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
      label: "Environments",
      value: String(totals.total),
      detail: `${totals.healthy} healthy / ${totals.degraded} degraded / ${totals.failed} failed`
    },
    {
      label: "P1 queue",
      value: String(incidentsBySeverity.P1),
      detail: "Hard-down incidents"
    },
    {
      label: "P2 queue",
      value: String(incidentsBySeverity.P2),
      detail: "Degraded health or verify failures"
    },
    {
      label: "P3 queue",
      value: String(incidentsBySeverity.P3),
      detail: "Lower-priority drift"
    }
  ];

  return (
    <section className="ocos-panel rounded-[14px]">
      <div className="grid gap-px overflow-hidden rounded-[14px] border border-[var(--ocos-line)] bg-[var(--ocos-line)] sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="bg-[var(--ocos-surface)] px-4 py-3">
            <p className="ocos-kicker">{card.label}</p>
            <div className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--ocos-ink)]">{card.value}</div>
            <p className="mt-2 text-xs leading-5 text-[var(--ocos-muted)]">{card.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
