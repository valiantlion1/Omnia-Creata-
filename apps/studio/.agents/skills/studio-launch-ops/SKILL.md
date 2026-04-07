---
name: studio-launch-ops
description: Operate OmniaCreata Studio launch and release routines using the repo's existing operator scripts and source-of-truth docs. Use when Codex needs to assess local always-on health, verify protected staging or live deployment, inspect runtime reports and logs, audit version and release bookkeeping, or produce a Studio ops brief for `apps/studio`.
---

# Studio Launch Ops

## Overview

Use Studio's existing operator surfaces before inventing new checks. Favor bounded scripts, repo-native source-of-truth docs, and external runtime reports over ad-hoc shell memory.

## Canonical Inputs

Read these files first when orienting:

- `apps/studio/AGENTS.md`
- `apps/studio/version.json`
- `apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md`
- `apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md`
- `apps/studio/deploy/README.md`
- `apps/studio/docs/wiki/README.md`

Treat these runtime paths as live operator truth when they exist:

- `%LOCALAPPDATA%\\OmniaCreata\\Studio\\reports\\local-verify-latest.json`
- `%LOCALAPPDATA%\\OmniaCreata\\Studio\\reports\\provider-smoke-latest.json`
- `%LOCALAPPDATA%\\OmniaCreata\\Studio\\reports\\deployment-verify-*.json`
- `%LOCALAPPDATA%\\OmniaCreata\\Studio\\logs\\*`

## Mode Selection

Match the task to one of these modes:

- `local-verify`: verify the local always-on stack or summarize the latest local report
- `staging-verify`: verify protected staging or the live deployment against the public URL
- `release-audit`: check build and release bookkeeping drift after Studio changes
- `ops-brief`: summarize launch hardening, blockers, and next actions
- `provider-smoke`: intentionally run or inspect live provider smoke status

## Preferred Commands

For local readiness:

```powershell
powershell -ExecutionPolicy Bypass -File apps/studio/ops/verify-studio-local.ps1
```

For staging preflight:

```powershell
python apps/studio/backend/scripts/deployment_preflight.py --env-file apps/studio/deploy/.env.staging
```

For protected staging verification:

```powershell
powershell -ExecutionPolicy Bypass -File apps/studio/deploy/verify-studio-staging.ps1
```

For protected staging bring-up:

```powershell
powershell -ExecutionPolicy Bypass -File apps/studio/deploy/start-studio-staging.ps1
```

For manual-gated live provider smoke:

```powershell
$env:ENABLE_LIVE_PROVIDER_SMOKE = "true"
python apps/studio/backend/scripts/provider_smoke.py --provider all
```

If owner-only deployment truth is needed, prefer `STUDIO_HEALTH_DETAIL_TOKEN` or an explicit bearer token over inventing a new auth path.

## Workflow

1. Establish scope and prerequisites.
   Determine whether the task is local, staging, bookkeeping, ops briefing, or live smoke. If staging verification is needed, look for `apps/studio/deploy/.env.staging`, `PUBLIC_WEB_BASE_URL`, and `STUDIO_HEALTH_DETAIL_TOKEN` or an explicit owner bearer token.
2. Prefer bounded scripts and existing reports.
   Use the repo's `*.ps1` and backend scripts before hand-assembling HTTP requests. If a fresh external report already exists and the task is an audit or brief, read it before rerunning expensive checks.
3. Report operator truth, not vibes.
   Always include the current build, the runtime surface, and the strongest available proof source. Distinguish `blocked`, `warning`, and `pass`. If health is degraded but script checks still passed, say both.
4. Respect Sprint 8 closure rules.
   Never claim Sprint 8 is closed from local verify alone. Protected staging verification with owner detail must report `closure_ready=true`. When deployment verification ran, surface `closure_summary` and `closure_gaps`.
5. Handle provider smoke carefully.
   Treat live smoke as manual-gated, cost-bearing, and credential-dependent. Only run it when the task explicitly asks for it or the automation prompt says to. If `ENABLE_LIVE_PROVIDER_SMOKE` is off or provider credentials are missing, report that clearly instead of improvising.
6. Audit release discipline explicitly.
   For bookkeeping tasks, compare Studio code changes against `version.json`, the release ledger, the maintenance map, and the wiki when product direction, architecture, standards, or planning changed. Prefer flagging drift over inventing release prose unless the user asked for file updates.

## Reporting Checklist

End with:

- current Studio build
- latest local verify result
- latest deployment verification result or the missing prerequisite
- provider smoke freshness or state
- top blocked items
- next highest-leverage operator action

## Do Not

- Do not redesign the UI during ops work.
- Do not move runtime logs or reports back into git.
- Do not claim launch-safe or closure-ready without explicit supporting proof.
- Do not run expensive live provider checks by default.
