---
name: bounded-remediation-policy
description: Apply OCOS safety rules to decide whether an action may run automatically, should remain manual, or must escalate instead. Use when Codex needs to review or add action recipes, automation behavior, operator quick actions, escalation triggers, or agentic remediation flows inside `apps/internal/control-center`.
---

# Bounded Remediation Policy

## Overview

Use this skill whenever a task touches what OCOS is allowed to do in response to an incident.
Treat action policy as a hard safety boundary, not a convenience layer.

## Canonical Inputs

Read these first:

- `apps/internal/control-center/docs/INCIDENT_POLICY.md`
- `apps/internal/control-center/docs/wiki/06_OPERATIONS_AND_SECURITY.md`
- `apps/internal/control-center/docs/wiki/07_ROADMAP_AND_BUILD_SEQUENCE.md`
- `apps/internal/control-center/docs/wiki/09_SPRINT_CAPABILITY_PLAN.md`
- `apps/internal/control-center/web/lib/ocos-store.ts`
- `apps/internal/control-center/worker/src/index.ts`
- `apps/internal/control-center/packages/contracts/src/types.ts`

Read this reference when deciding action class or automation limits:

- `references/action-matrix.md`

## Core Rule

If an action can change production state, hide evidence, mutate secrets, or create hard-to-reverse consequences, it is outside bounded remediation unless explicitly promoted by a later policy change.

## Workflow

1. Classify the action.
   Put it into one of these buckets:
   - `observe`
   - `verify`
   - `collect`
   - `escalate`
   - `mutate`
2. Prefer the smallest safe class.
   If `observe`, `verify`, or `collect` can answer the problem, do not jump to `mutate`.
3. Check operator reversibility.
   If the action is not easy to understand, audit, and roll back, it should not become an OCOS default action.
4. Separate automation from approval.
   Some actions can be surfaced in UI but still require manual initiation.
5. Escalate when safety is unclear.
   If policy is ambiguous, bias toward evidence gathering and Codex escalation, not extra autonomy.

## Allowed Now

Allowed in the current OCOS foundation:

- `recheck_public_health`
- `trigger_staging_verify`
- `collect_incident_bundle`
- `create_codex_escalation`

These are allowed because they primarily:

- increase truth
- keep blast radius small
- preserve operator review

## Not Allowed Now

Do not allow by default:

- restart production services
- deploy new builds
- rotate secrets automatically
- edit production files
- clear state blindly
- run shell commands with destructive side effects

## Automation Rule

Automation may:

- detect
- verify
- collect evidence
- notify
- prepare escalation

Automation may not:

- invent new remediation paths at runtime
- expand its own permissions
- treat a failed bounded action as permission for a stronger action

## Reporting Output

End with:

- action class
- safety decision
- whether it is automation-safe, manual-only, or forbidden
- what bounded alternative should exist if the proposed action is rejected

## Do Not

- Do not confuse a useful action with a safe action.
- Do not allow production mutation because the operator is in a hurry.
- Do not let future agents bypass the same policy used by UI and worker lanes.
