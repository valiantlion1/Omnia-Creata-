# OCOS Automations, Skills, Agents, And AI

## Expansion Principle

OCOS should become smarter in layers.

Do not jump straight to autonomous AI repair.

The correct growth path is:

1. deterministic rules
2. bounded automations
3. reusable skills and runbooks
4. agentic investigation
5. Omnia-owned AI runtime

## 1. Automations

Automations are recurring or event-driven routines that run without needing the full operator dashboard.

Examples:
- scheduled audits
- stale verify checks
- weekly ops briefs
- project summary generation
- drift detection digests

Automations should:
- open inbox items
- operate on typed incident/report data
- never bypass bounded action policy

## 2. Skills

Skills are operational memory blocks.

They should encode:
- how a service is checked
- what safe action is allowed
- how success is verified
- when Codex or a human takes over

Skills make OCOS and Codex share the same operational playbook.

## 3. Agents

Agents should come after reports, incidents, and runbooks are mature.

Their role is not to replace operators.

Their role is to:
- investigate bounded scopes
- synthesize findings
- gather artifacts
- recommend or prepare actions

Early agent policy:
- read-heavy first
- bounded write scopes only
- never bypass incident or action policy

## 4. AI Layer

OCOS should eventually include an Omnia-controlled AI layer.

But that layer must stand on:
- structured events
- structured reports
- shared contracts
- known runbooks
- knowledge from prior incidents

The AI layer should eventually support:
- incident summarization
- anomaly explanation
- action recommendation
- similarity matching to prior incidents
- report drafting
- escalation package generation

## What "Smart" Actually Means

OCOS is smart when it can:
- recognize important change
- compress noise into one meaningful incident
- explain probable impact
- choose between safe next steps
- know when to stop and escalate

It is not smart just because an LLM is present.

## Escalation Hierarchy

Use this default ladder:

1. detect
2. summarize
3. bounded action
4. verify
5. Codex escalation
6. operator intervention
7. future advanced agent or AI runtime

## Memory Rule

Every major automation, skill, or future agent behavior should be documented in this wiki and linked to concrete code or runbook files.

If the behavior lives only in prompt memory, it will drift.
