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
    <section className="rounded-[30px] border border-white/10 bg-[#091414]/88 p-6 shadow-[0_20px_70px_rgba(0,0,0,0.22)] backdrop-blur-xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.32em] text-white/42">Operator Loop</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">How OCOS behaves under load</h2>
        </div>
        <div className="text-sm text-white/54">Detect, verify, automate, escalate</div>
      </div>

      <div className="mt-5 grid gap-px overflow-hidden rounded-[24px] border border-white/10 bg-white/10 lg:grid-cols-4">
        {steps.map((step, index) => (
          <article key={step.label} className="bg-[#091212] p-5">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs uppercase tracking-[0.3em] text-white/38">0{index + 1}</span>
              <span className="text-sm font-medium text-teal-100/80">{step.label}</span>
            </div>
            <div className="mt-4 text-2xl font-semibold tracking-tight text-white">{step.value}</div>
            <p className="mt-3 text-sm leading-6 text-white/64">{step.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
