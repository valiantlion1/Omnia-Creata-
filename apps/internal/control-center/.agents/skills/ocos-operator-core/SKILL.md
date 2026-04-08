---
name: ocos-operator-core
description: Operate and evolve OCOS using the repo's canonical architecture, incident policy, project-aware cockpit model, and bounded-action rules. Use when Codex needs to work on the internal OCOS product in `apps/internal/control-center`, assess organization or project incident state, review reports, plan safe operator actions, shape dashboards, or prepare Codex escalations.
---

# OCOS Operator Core

## Overview

Use this skill whenever the task is about OCOS itself.
Treat OCOS as OmniaCreata's internal incident operating system, not as a public admin panel and not as `Omnia Watch`.

## Canonical Inputs

Read these first when orienting:

- `apps/internal/control-center/README.md`
- `apps/internal/control-center/docs/PRODUCT.md`
- `apps/internal/control-center/docs/ARCHITECTURE.md`
- `apps/internal/control-center/docs/INCIDENT_POLICY.md`
- `apps/internal/control-center/docs/wiki/README.md`
- `apps/internal/control-center/docs/wiki/07_ROADMAP_AND_BUILD_SEQUENCE.md`
- `apps/internal/control-center/docs/wiki/08_CODEX_CAPABILITY_STACK.md`
- `apps/internal/control-center/docs/wiki/09_SPRINT_CAPABILITY_PLAN.md`

For live implementation truth, prefer these paths:

- `apps/internal/control-center/web/`
- `apps/internal/control-center/worker/`
- `apps/internal/control-center/cli/`
- `apps/internal/control-center/packages/contracts/`
- `apps/internal/control-center/supabase/`

## Operating Modes

Choose the mode that best matches the task:

- `org-triage`
  Use for company-wide incident posture, project comparisons, and escalation priority.
- `project-cockpit`
  Use for project overview, services, operations, and reports surfaces.
- `report-review`
  Use for human + AI readable report contracts, chart blocks, and reporting persistence.
- `bounded-action`
  Use for safe operator controls such as recheck, verify, bundle, and Codex escalation.
- `capability-planning`
  Use for sprint planning, skills, plugins, automation, agents, and future AI layers.

## Workflow

1. Orient on the right level first.
   Decide whether the task belongs to organization, project, service, incident, or capability layer. Do not jump straight into a service-level fix if the real problem is in the org or project model.
2. Preserve the OCOS hierarchy.
   Keep the system model aligned as `organization -> project -> service -> environment -> incident -> report -> action -> escalation`.
3. Prefer shared truth over local invention.
   If product meaning, architecture, report contracts, or sprint direction changed, update the wiki and roadmap docs instead of leaving the decision only in chat memory.
4. Keep actions bounded.
   OCOS may suggest, dispatch, and verify safe actions. It should not invent destructive production behavior or blur the line between monitoring and uncontrolled remediation.
5. Write for operators and future machines.
   When adding surfaces, reports, or state, make them readable to humans and structured enough for future AI, automations, and agents.

## Design Rules

- Keep the home surface `incident-first` and `project-aware`.
- Keep reports dual-purpose: readable by operators, parseable by systems.
- Keep Codex as an expert escalation layer, not the always-on backbone.
- Keep OCOS internal-only.
- Keep `Omnia Watch` separate as a customer product.

## Bounded Action Rules

Allowed v0 and foundation-safe actions:

- public recheck
- staging verify
- incident bundle collection
- Codex escalation bundle creation

Do not introduce by default:

- blind deploys
- secret mutation
- destructive shell actions
- production file edits triggered automatically

## Reporting Output

When summarizing OCOS state, end with:

- current scope
- strongest evidence source
- active risks
- safe next action
- whether the task belongs to current sprint or a later sprint

## Do Not

- Do not treat OCOS like a generic dashboard project.
- Do not collapse project-aware work back into service-only thinking.
- Do not solve capability gaps by installing random skills without documenting why.
- Do not let sprint intent live only in prompts; write it into the repo.
