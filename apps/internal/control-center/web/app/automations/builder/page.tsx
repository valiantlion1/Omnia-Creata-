import { NavShell } from "@/components/nav-shell";

const builderSteps = [
  {
    label: "Trigger",
    detail: "Choose whether the playbook starts from a schedule, an incident threshold, a signed event, or an explicit operator launch."
  },
  {
    label: "Scope",
    detail: "Bind the playbook to a project, service, and environment so the action path stays legible."
  },
  {
    label: "Safety class",
    detail: "Declare whether the playbook only observes, dispatches a bounded action, or prepares escalation evidence."
  },
  {
    label: "Verify",
    detail: "Define how OCOS proves the result before the playbook can relax the queue or escalate further."
  }
];

export default function AutomationBuilderPage() {
  return (
    <NavShell eyebrow="Automations Builder">
      <section className="space-y-4">
        <section className="ocos-panel-strong rounded-[16px] p-4">
          <p className="ocos-kicker">Bounded Builder</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-[var(--ocos-ink)]">
            Playbook builder brief
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--ocos-muted)]">
            The full drag-and-drop builder is not live yet. This page anchors the builder doctrine so the future flow
            editor stays typed, safety-aware, and subordinate to verification policy.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
          {builderSteps.map((step, index) => (
            <article key={step.label} className="ocos-panel rounded-[16px] p-4">
              <div className="text-xs uppercase tracking-[0.24em] text-[var(--ocos-soft)]">0{index + 1}</div>
              <h3 className="mt-3 text-lg font-semibold text-[var(--ocos-ink)]">{step.label}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--ocos-muted)]">{step.detail}</p>
            </article>
          ))}
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
          <article className="ocos-panel rounded-[16px] p-4">
            <p className="ocos-kicker">What The Builder Must Produce</p>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--ocos-muted)]">
              <li>A typed trigger definition with explicit scope.</li>
              <li>A bounded path that maps cleanly to allowed OCOS action recipes.</li>
              <li>A verification rule that proves whether the playbook succeeded.</li>
              <li>An operator-readable summary that explains what the playbook will and will not do.</li>
            </ul>
          </article>

          <article className="ocos-panel rounded-[16px] p-4">
            <p className="ocos-kicker">Not In Scope Yet</p>
            <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--ocos-muted)]">
              <li>No arbitrary graph engine.</li>
              <li>No autonomous production mutation.</li>
              <li>No unbounded AI-authored flows.</li>
              <li>No hidden side effects outside the incident and action model.</li>
            </ul>
          </article>
        </section>
      </section>
    </NavShell>
  );
}
