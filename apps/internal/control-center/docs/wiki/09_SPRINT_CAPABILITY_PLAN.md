# 09. Sprint Capability Plan

## Purpose

This document translates the OCOS roadmap into concrete sprint lanes for Codex capabilities.

Use it to decide:

- what gets built now
- what waits for a later sprint
- which Codex skill or plugin belongs to which maturity phase

## Assumption

OCOS capability work starts after the project-aware foundation landed.

Use this sprint sequence:

- `Sprint 9` = project-aware foundation closeout
- `Sprint 10` = capability kernel
- `Sprint 11` = service-aware operator memory
- `Sprint 12` = automations and bounded agents
- `Sprint 13+` = Omnia-owned AI runtime work

## Sprint 9: Project-Aware Foundation Closeout

Goal:
- finish `organization -> project -> service` structure
- persist project reports
- move home to org cockpit

Deliver:
- org home
- project cockpit routes
- report persistence
- project-aware API
- project-aware CLI

Status:
- complete

## Sprint 10: Capability Kernel

Goal:
- give Codex a repo-native OCOS operating memory
- create the first internal plugin surface for future OCOS-native tooling

Deliver:
- `ocos-operator-core` custom skill
- `ocos-api` read-only plugin bridge
- capability stack documentation
- sprint capability plan documentation

Status:
- in progress

Exit criteria:
- OCOS has one canonical internal skill for product and ops reasoning
- the repo has a real read-only plugin lane for OCOS-native tools
- future capability work is planned by sprint, not by ad-hoc prompting

## Sprint 11: Service-Aware Operator Memory

Goal:
- teach Codex how individual Omnia services behave inside OCOS

Deliver:
- `studio-incident-ops` skill for OCOS-side Studio handling
- `ocos-report-contracts` skill
- `bounded-remediation-policy` skill
- first report and escalation references for future agents

Notes:
- `apps/studio/.agents/skills/studio-launch-ops` remains the Studio product ops skill
- Sprint 11 adds the OCOS-facing memory layer that consumes Studio inside the control plane

Status:
- scaffolded

Scaffolds now present:
- `studio-incident-ops`
- `ocos-report-contracts`
- `bounded-remediation-policy`

Next to finish this sprint:
- connect the new skills to active OCOS workflows and future automation prompts
- add service-aware references for more Omnia apps as they join OCOS

## Sprint 12: Automations And Bounded Agents

Goal:
- move repeated operator work into safe recurring behavior

Deliver:
- recurring project report audits
- recurring drift review prompts
- bounded artifact gathering agent patterns
- escalation preparation agent patterns

Guardrails:
- evidence first
- no destructive autonomy
- all automation must honor bounded action policy

## Sprint 13+: Omnia-Owned AI Runtime

Goal:
- add the brain layer only after the control plane is stable

Deliver:
- model gateway
- memory-backed recommendation layer
- policy-aware orchestration
- AI-native operator surfaces

Do not start this sprint before:

- reports are stable
- incident contracts are stable
- action safety is stable
- automations are trustworthy

## Current Build Rule

When deciding what to implement next:

1. prefer the current sprint
2. if blocked, prepare the next sprint's scaffolding
3. do not pull future AI work forward if current capability memory is weak

## Current Decision

Right now OCOS should behave as if:

- foundation is implemented
- capability kernel is established enough for read-only plugin access
- service-aware memory scaffolds are landing
- bounded automation is the next major lane

That means the correct immediate work is:

- custom OCOS skills
- internal plugin bridges
- sprint-aware docs

Not:

- random connector sprawl
- premature autonomous remediation
- premature model-runtime work
