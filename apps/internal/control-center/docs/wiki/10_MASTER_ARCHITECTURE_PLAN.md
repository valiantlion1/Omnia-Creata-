# OCOS Master Architecture Plan

## Purpose

This page is the canonical integration layer for OCOS scope, architecture, and build order.

Use it when deciding:

- whether a new capability belongs inside OCOS at all
- which OCOS layer should own it
- what must be built before the next layer is allowed in
- whether a proposed feature is real control-plane work or scope drift

Detailed contracts still live in the specialized wiki pages. This page exists to keep them aligned.

## System Sentence

OCOS is the OmniaCreata internal control plane that turns operational signals into bounded action, verified outcomes, escalation context, and reusable operational memory.

## Expanded Operating Loop

The product promise remains:

`detect -> explain -> act -> verify -> escalate`

The architecture loop expands that promise into:

`detect -> explain -> decide -> act -> verify -> escalate -> remember`

- `decide` separates signal detection from safe action policy
- `remember` closes the loop into reports, incident history, and future runbooks

## Hard Scope Boundaries

OCOS must stay:

- internal-only
- operational rather than customer-facing
- hosted even when the operator desktop is offline
- bounded before autonomous
- centered on one shared incident truth

OCOS must not become:

- a public admin or customer analytics portal
- a raw log warehouse
- a generic observability clone
- a replacement for product-native dashboards
- an unattended production self-healing bot in early phases

## Canonical Signal Split

OCOS ingests:

- public probes
- signed service events
- deploy and workflow outcomes
- provider and dependency drift signals
- bounded action results
- verification results

OCOS should not become the primary sink for:

- end-user browsing analytics
- marketing funnel telemetry
- product usage BI
- cookie consent state unless there is an explicit operational need

The rule is simple:

product analytics stay product-native  
operational telemetry feeds OCOS

## Architecture Layers

### 1. Service Registry

Owns:

- the canonical inventory of projects, services, environments, providers, and dependencies
- stable slugs and identifiers that every incident, action, and report can reference
- the mapping between project reality and control-plane reality

Avoids:

- becoming a full infra CMDB clone
- copying every provider object 1:1 without operational meaning

Delivers:

- one shared service graph for Studio first, then other Omnia products

### 2. Detection And Ingress

Owns:

- scheduled probes
- signed `service-event` and `check-result` ingestion
- normalization of external events into OCOS contracts

Avoids:

- ad-hoc app-specific payloads that bypass shared contracts
- direct UI-only truth with no persistent ingest record

Delivers:

- one intake path for public checks, deploy workflows, provider drift, and future service emitters

### 3. Incident And Decision Kernel

Owns:

- fingerprinting
- severity and threshold policy
- dedupe
- state transitions
- ownership
- maintenance windows
- escalation eligibility

Avoids:

- duplicate alert storms
- product-specific incident logic branches that cannot generalize

Delivers:

- one shared incident state machine across every future OCOS surface

### 4. Action And Verification Loop

Owns:

- bounded action recipes such as `recheck`, `verify`, `collect_bundle`, and safe workflow triggers
- mandatory follow-up verification after each action
- explicit action history and outcome tracking

Avoids:

- destructive unattended remediation
- actions that cannot be verified by the system afterward

Delivers:

- safe operator acceleration without pretending the system can repair everything alone

### 5. Operator Workbench

Owns:

- organization dashboard
- project cockpit
- service drilldown
- active incident queue
- action queue
- escalation queue
- report center

Avoids:

- executive vanity dashboards
- decorative card galleries with no decision value
- mega-pages that compress the whole system into stacked boxes

Delivers:

- dense, ERP-like operator surfaces that help humans orient and act fast
- a page tree that grows outward as operational depth increases instead of forcing everything into a few overloaded screens

### 6. Notification And Escalation

Owns:

- Telegram-first routing in v0
- operator attention rules
- escalation bundles for Codex or humans
- notification history tied to incidents and actions

Avoids:

- disconnected alert systems that do not reference incident state
- noisy notification fan-out with no routing policy

Delivers:

- one escalation path from signal to human attention to second-stage investigation

### 7. Reporting And Knowledge

Owns:

- typed reports
- readable summaries
- historical incident memory
- trend views
- artifact linking
- future similarity search

Avoids:

- narrative-only reporting with no structured schema
- charts or metrics that cannot be reconstructed from stored data

Delivers:

- the `remember` layer that makes future reasoning better than one-off prompting

### 8. Governance And Policy

Owns:

- RBAC
- audit trails
- action approval gates
- secrets boundaries
- operator accountability

Avoids:

- silent mutation surfaces
- unclear ownership over who ran what and why

Delivers:

- trustable internal operations instead of a powerful but opaque ops toy

### 9. Codex And Future AI Layer

Owns:

- second-stage escalation
- evidence gathering
- report drafting
- bounded investigation support
- future recommendation and orchestration layers

Avoids:

- becoming the always-on backbone
- bypassing policy, action gates, or verification steps

Delivers:

- expert assistance on top of a working hosted control plane rather than instead of one

## Surface Model

Every OCOS interface should resolve to one of these surfaces:

- `organization dashboard`
  What is broken, degraded, assigned, or escalating across Omnia right now?
- `project cockpit`
  What is happening inside one product such as Studio?
- `service drilldown`
  Which service, environment, provider, or dependency is the actual problem?
- `incident detail`
  What happened, what changed, what was tried, and what remains unresolved?
- `action queue`
  Which safe actions are pending, running, verified, failed, or blocked?
- `report center`
  Which daily, weekly, project, or incident summaries define the current story?
- `CLI`
  How does the same truth stay available in terminal workflows?
- `worker and ingest layer`
  How do signals enter and keep moving when no operator is watching the UI?

## Navigation Rule

OCOS should prefer many focused workbench pages over a small number of overloaded dashboards.

The rule is:

- overview pages orient
- queue pages triage
- detail pages explain
- action pages execute
- report pages summarize

If a screen starts accumulating unrelated boxes just to keep everything on one route, the page tree should expand instead.

## Build Order

Translate the architecture into implementation order like this:

1. `Control plane backbone`
   Service registry, ingest, shared contracts, Supabase truth, worker bridge.
2. `Incident and action kernel`
   Incident state machine, thresholds, dedupe, bounded actions, verification loop.
3. `Operator workbench`
   Dense org, project, service, and queue surfaces.
4. `Notification and escalation`
   Telegram routing, incident-linked notifications, Codex bundle handoff.
5. `Reporting and knowledge`
   Typed reports, history, searchable summaries, incident memory.
6. `Automations and bounded agents`
   Recurring audits, drift digests, artifact gatherers, escalation-prep agents.
7. `Omnia-owned reasoning layer`
   Policy-aware recommendations and later orchestration on top of a hardened base.

## Current Execution Lock

Right now the next safe OCOS wave should stay narrow:

- keep `Studio` as the only live tracked project
- make `service-event` and `check-result` real first-class emitters
- harden `ingest -> incident -> action -> verify`
- stabilize the operator workbench around dedicated queue, detail, and cockpit surfaces instead of mega-dashboards
- add historical reports only after the first end-to-end loop is trustworthy
- add bounded agents only after the report and policy layers exist

## Decision Rule

When a new feature is proposed, place it in exactly one bucket:

- core control-plane layer
- project integration or emitter
- operator convenience surface
- future intelligence layer

If it does not fit one bucket cleanly, it is probably scope drift.

## Detailed References

Use these pages for the deeper contracts behind this plan:

- [Product North Star](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/01_PRODUCT_NORTH_STAR.md)
- [System Architecture](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/02_SYSTEM_ARCHITECTURE.md)
- [Control Surfaces And Dashboards](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/03_CONTROL_SURFACES_AND_DASHBOARDS.md)
- [Data Model And Reporting](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/04_DATA_MODEL_AND_REPORTING.md)
- [Automations, Skills, Agents, And AI](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/05_AUTOMATIONS_SKILLS_AGENTS_AND_AI.md)
- [Operations And Security](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/06_OPERATIONS_AND_SECURITY.md)
- [Roadmap And Build Sequence](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/07_ROADMAP_AND_BUILD_SEQUENCE.md)
- [Codex Capability Stack](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/08_CODEX_CAPABILITY_STACK.md)
- [Sprint Capability Plan](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/09_SPRINT_CAPABILITY_PLAN.md)
