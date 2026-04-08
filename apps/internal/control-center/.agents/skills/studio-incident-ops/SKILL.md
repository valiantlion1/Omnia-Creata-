---
name: studio-incident-ops
description: Handle Studio incidents inside OCOS using the project-aware cockpit, bounded actions, Studio-specific operator signals, and Codex escalation rules. Use when Codex needs to triage a Studio incident from `apps/internal/control-center`, interpret Studio health or verify signals inside OCOS, choose a safe bounded action, or prepare Studio-specific escalation guidance without treating Studio as a generic service.
---

# Studio Incident Ops

## Overview

Use this skill when the task is about `Studio inside OCOS`.
Treat it as the OCOS-facing memory layer for Studio incidents, not as the Studio product implementation skill itself.

## Canonical Inputs

Read these first when orienting:

- `apps/internal/control-center/docs/INCIDENT_POLICY.md`
- `apps/internal/control-center/docs/wiki/07_ROADMAP_AND_BUILD_SEQUENCE.md`
- `apps/internal/control-center/docs/wiki/09_SPRINT_CAPABILITY_PLAN.md`
- `apps/internal/control-center/web/lib/ocos-store.ts`
- `apps/internal/control-center/web/lib/ocos-reporting.ts`
- `apps/internal/control-center/packages/contracts/src/types.ts`
- `apps/studio/.agents/skills/studio-launch-ops/SKILL.md`

Read this reference when deeper Studio incident interpretation is needed:

- `references/studio-incident-lanes.md`

## Mode Selection

Choose one mode before doing anything else:

- `queue-triage`
  Use for active incident review in `/projects/studio/operations`.
- `signal-interpretation`
  Use for public probe, deployment verify, provider drift, or report freshness analysis.
- `bounded-action-choice`
  Use for selecting recheck, verify, bundle, or Codex escalation.
- `escalation-prep`
  Use for deciding whether the incident should remain bounded or move to Codex.

## Workflow

1. Confirm that the scope is OCOS-side Studio operations.
   If the task is about Studio product code, deployment details, or release routines themselves, use the Studio product ops memory instead of keeping everything inside this skill.
2. Read the incident in context.
   Start from project, incident, severity, environment, last action, and latest report. Do not reason from the incident title alone.
3. Interpret the signal lane.
   Distinguish:
   - `public shell / login`
   - `health status`
   - `version drift`
   - `deployment verify`
   - `provider drift`
   - `bookkeeping/report staleness`
4. Keep the next action bounded.
   Prefer the smallest safe action that increases truth:
   - `recheck_public_health`
   - `trigger_staging_verify`
   - `collect_incident_bundle`
   - `create_codex_escalation`
5. Escalate only when policy says so.
   If a bounded action failed and the incident is still unhealthy, or if the incident is prolonged P1/P2, prepare the Codex path instead of improvising new remediation behavior.

## Studio Heuristics Inside OCOS

- Production hard-down public probe is `P1`.
- Production degraded health is usually `P2`.
- Staging or bookkeeping noise is usually `P3` unless it blocks release truth.
- `public_probe` tells you whether the shell and public surfaces are alive.
- `deployment_verify` tells you whether the release path is healthy enough for closure.
- `incident_bundle` is evidence collection, not a fix.
- `provider drift` should bias toward evidence gathering and verify, not blind retries.

## Reporting Output

End with:

- current Studio incident state
- strongest evidence lane
- safest next bounded action
- whether Codex escalation is premature, ready, or required

## Do Not

- Do not confuse Studio-as-product ops with Studio-inside-OCOS incident handling.
- Do not invent restart or deploy actions.
- Do not claim release-safe from a single degraded or stale signal.
- Do not skip the current report and action history when an incident already exists.
