import type { SummaryView } from "@/lib/ocos-store";

function describeAutomation(summary: SummaryView) {
  const boundedRuns = summary.actionRuns.filter((actionRun) => actionRun.recipe !== "create_codex_escalation");
  if (!boundedRuns.length) {
    return "Standby";
  }
  return `${boundedRuns.length} bounded runs`;
}

export function OperatorLoop({ summary }: { summary: SummaryView }) {
  const steps = [
    {
      label: "Detect",
      value: summary.activeIncidents.length ? `${summary.activeIncidents.length} active` : "Quiet",
      detail: "Scheduled probes and signed service events collapse into one incident fingerprint per failure line."
    },
    {
      label: "Verify",
      value: `${summary.serviceTotals.total} environments`,
      detail: "Studio production runs on a 5 minute cadence; staging stays sparse at 15 minutes."
    },
    {
      label: "Automate",
      value: describeAutomation(summary),
      detail: "Only safe recipes live here: public recheck, staging verify, incident bundle, and Codex bundle prep."
    },
    {
      label: "Escalate",
      value: summary.codexEscalations.length ? `${summary.codexEscalations.length} queued` : "Standby",
      detail: "Codex only enters after failed bounded remediation or a prolonged P1/P2 window."
    }
  ];

  return (
    <section className="ocos-panel-strong">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="ocos-kicker">Operator Loop</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ocos-ink)]">
            How OCOS behaves under load
          </h2>
        </div>
        <div className="text-sm text-[var(--ocos-muted)]">Detect, verify, automate, escalate</div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-4">
        {steps.map((step, index) => (
          <article
            key={step.label}
            className="rounded-[24px] border border-[var(--ocos-border-strong)] bg-white/78 p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-[0.3em] text-[var(--ocos-muted)]">0{index + 1}</span>
              <span className="text-sm font-medium text-[var(--ocos-accent-strong)]">{step.label}</span>
            </div>
            <div className="mt-4 text-2xl font-semibold tracking-[-0.04em] text-[var(--ocos-ink)]">{step.value}</div>
            <p className="mt-3 text-sm leading-7 text-[var(--ocos-muted)]">{step.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
