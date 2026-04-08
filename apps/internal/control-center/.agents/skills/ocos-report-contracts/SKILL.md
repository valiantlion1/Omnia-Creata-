---
name: ocos-report-contracts
description: Shape and review OCOS reports so they stay readable for operators and structurally safe for automations, agents, and future AI. Use when Codex needs to add or modify report schemas, materialized report generation, chart blocks, summary fields, metrics, or report-driven cockpit panels inside `apps/internal/control-center`.
---

# OCOS Report Contracts

## Overview

Use this skill whenever a task touches OCOS reports, chart blocks, summary payloads, or report-aware UI.
Treat report contracts as a product surface and a machine contract at the same time.

## Canonical Inputs

Read these first:

- `apps/internal/control-center/docs/wiki/04_DATA_MODEL_AND_REPORTING.md`
- `apps/internal/control-center/docs/wiki/07_ROADMAP_AND_BUILD_SEQUENCE.md`
- `apps/internal/control-center/docs/wiki/09_SPRINT_CAPABILITY_PLAN.md`
- `apps/internal/control-center/packages/contracts/src/types.ts`
- `apps/internal/control-center/web/lib/ocos-reporting.ts`
- `apps/internal/control-center/web/components/report-charts.tsx`

Read this reference for deeper field expectations:

- `references/report-shape-and-charts.md`

## Core Rule

Every OCOS report must satisfy both:

- a human can scan it quickly
- a machine can reason over it without guessing

If one side breaks, the report contract is broken.

## Workflow

1. Confirm report scope.
   Decide whether the change belongs to:
   - `overview`
   - `daily`
   - `weekly`
   - future incident-specific reporting
2. Preserve the canonical block shape.
   Keep these blocks aligned:
   - `headline`
   - `status`
   - `keyFindings`
   - `recommendedActions`
   - `metrics`
   - `charts`
   - `incidents`
3. Prefer normalized labels and stable keys.
   Metrics and charts should use stable ids and predictable labels so future automation and AI can compare runs safely.
4. Keep chart blocks honest.
   A chart should expose the real series data needed for interpretation. Do not add decorative-only chart structures.
5. Make summaries operational.
   `recommendedActions` should point to safe next steps, not abstract management prose.

## Report Contract Rules

- `headline` must be short and operator-readable.
- `status` must match the real project or scope state.
- `keyFindings` should state evidence, not vibes.
- `recommendedActions` should be few, concrete, and safe.
- `metrics` should use stable keys and explicit units where helpful.
- `charts` should use stable ids and explicit series names.
- `incidents` should summarize active or relevant incidents without duplicating the whole incident object.

## When Changing UI

If a cockpit panel consumes reports:

- prefer reading the existing contract instead of inventing a UI-only shape
- avoid adding fields only because a single component wants convenience data
- update the report contract first if the new field is truly canonical

## Reporting Output

End with:

- affected report scopes
- contract changes made
- any compatibility risk for dashboards, automations, or future AI consumers

## Do Not

- Do not let presentation-only components redefine the report schema.
- Do not store unstructured prose where structured fields are expected.
- Do not add charts without machine-usable series data.
- Do not collapse multiple meanings into one vague metric.
