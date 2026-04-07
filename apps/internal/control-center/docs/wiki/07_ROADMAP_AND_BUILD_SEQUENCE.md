# OCOS Roadmap And Build Sequence

## Build Philosophy

Build OCOS in layers that compound.

Do not build isolated fancy features that force a rewrite later.

Every phase should strengthen:
- the incident model
- the operator surface
- the report model
- the future intelligence layer

## Phase 1: Core Incident OS

This is the current v0 track.

Deliver:
- hosted PWA
- hosted worker
- CLI
- Studio production and staging monitoring
- incident states and thresholds
- Telegram alerts
- bounded actions
- Codex escalation bundles

This phase creates the nervous system.

## Phase 2: Project-Aware Dashboards

After the incident backbone is stable, add:
- organization dashboard
- project dashboards
- service dashboards
- chart blocks
- timeline blocks
- project-level reports

This phase turns OCOS from a single-service console into a multi-project command center.

## Phase 3: Structured Reporting And Knowledge

Add:
- daily and weekly reports
- project report schema
- chart series storage
- report search
- historical incident similarity
- report-driven AI summaries

This phase makes the system understandable by both operators and machines.

## Phase 4: Automations And Skills

Add:
- recurring audits
- drift digests
- repo-aware project runbooks
- operator memory and domain skills
- service-specific action recipes

This phase gives OCOS repeatable operational behavior instead of ad-hoc prompting.

## Phase 5: Agents

Add:
- bounded investigation agents
- artifact gathering agents
- issue and report drafting agents
- escalation-prep agents

Agents should remain controlled and evidence-first.

## Phase 6: Omnia-Owned AI Runtime

Only after the foundations are strong:
- model gateway
- internal reasoning layer
- policy-aware orchestration
- memory-backed recommendations
- controlled remediation planning

This phase is the brain layer, not the starting point.

## Priority Order

If tradeoffs appear, preserve this order:

1. reliability
2. clarity
3. safety
4. repeatability
5. intelligence
6. polish

## Decision Rule

When unsure what to build next, choose the work that most improves:

- shared operational truth
- operator comprehension
- safe actionability
- future composability

Do not choose the work that is merely the most visually impressive.
