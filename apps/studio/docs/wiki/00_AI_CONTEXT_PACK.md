# AI Context Pack

This file exists so another AI model, coding IDE assistant, or future maintainer can get useful Studio context fast without reading the whole repo first.

Use it as the low-token entrypoint before wider code exploration.

## What Studio Is

OmniaCreata Studio is a premium-feeling creative product.

It has two intentional surfaces:
- `Create`
- `Chat`

It is not:
- a generic chatbot
- a random prompt playground
- a provider demo shell
- a throwaway UI experiment

## Current Working Frame

The active frame is:
- `Protected Beta Hardening`

This means:
- backend and ops truth matter more than new feature sprawl
- contract stability matters more than speculative rewrites
- staging proof matters more than local-only confidence
- public-paid expansion is later, not the current acceptance target

Historical sprints still matter for background, but they are no longer the active planning language.

## Read In This Order

### Fast Orientation

If you need the shortest useful path, read:
1. [Wiki Index](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/README.md)
2. [Product North Star](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/01_PRODUCT_NORTH_STAR.md)
3. [Delivery Status](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/03_DELIVERY_STATUS.md)
4. [Roadmap And Planning](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/06_ROADMAP_AND_PLANNING.md)

### Backend Or Ops Work

If the task is backend, deploy, cost, provider, or staging work, then read next:
1. [Studio Agent Rules](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/AGENTS.md)
2. [System Architecture](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/02_SYSTEM_ARCHITECTURE.md)
3. [Operations And Releases](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/05_OPERATIONS_AND_RELEASES.md)
4. [Version Manifest](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/version.json)
5. [Release Ledger](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md)
6. [Maintenance Map](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md)

### UI Or Product Flow Work

If the task is UI, product language, or user flow work, then also read:
1. [Engineering Standards](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/04_ENGINEERING_STANDARDS.md)
2. nearest page/component files after the wiki pass

## What Is Stable Right Now

Treat these as stable unless the task explicitly changes them:
- `Create` and `Chat` are distinct product surfaces
- server authority controls auth, billing, entitlement, protection, and runtime truth
- current acceptance target is protected beta, not broad public paid launch
- route contract freeze matters for signed-in surfaces
- operational truth comes from manifest plus release/maintenance docs, not from memory

## Current Security Guardrails

Treat these as active guardrails, not optional implementation details:
- deleted authenticated sessions must fail closed with `401`, not silently downgrade to guest and not recreate identity state
- protected routes should bootstrap and verify a real identity, not rely on raw auth presence alone
- share creation must target exactly one thing: a project or an asset, never both
- blocked/demo/deleted assets are not truthful public share targets
- project or asset share truth must die with the underlying project/asset truth instead of lingering as a half-alive public surface
- billable provider spend guardrails must apply to fallback candidates too; a later managed provider that is already blocked cannot stay in the generation fallback chain as a silent paid escape hatch

## What Is Still Open

These are still strategic decisions, not final permanent locks:
- long-term provider mix for public-paid launch
- exact public pricing and subscription packaging
- final hosting/provider economics for scale
- broader redundancy policy beyond protected beta

Do not mistake temporary protected-beta policy for permanent public-live product strategy.

## Important Vocabulary

### Product-Facing State

Use this language by default in UI, planning, and product docs:
- `queued`
- `running`
- `ready`
- `failed`
- `blocked`

### Internal Worker State

Use this lower-level language only when the real topic is queue, recovery, or worker internals:
- `queued`
- `running`
- `succeeded`
- `failed`
- `retryable_failed`
- `cancelled`
- `timed_out`

Do not mix these two layers casually.

## Hidden Operator Truth

If you need the real hidden backend map for:
- `surface -> tier -> provider -> model -> fallback -> cost`

use owner health detail:
- `ai_control_plane`
- especially `ai_control_plane.surface_matrix`
- and `ai_control_plane.contract_freeze` for the canonical state/field vocabularies

Do not reconstruct that map from scattered docs, guesses, or stale terminal memory.

## Backend Spine Modules

Do not assume `service.py` still owns every backend policy.

For current protected-beta hardening, the key backbone modules are:
- `contract_catalog.py` for canonical state and field vocabularies
- `bootstrap_contract_ops.py` for canonical signed-in shell bootstrap payload assembly
- `model_catalog_ops.py` for Studio model registry, lookup, validation, and identity-facing serialization
- `services/shell_service.py` for signed-in shell/bootstrap ownership and model catalog assembly used by `/v1/settings/bootstrap`
- `operator_control_plane_ops.py` for hidden operator model catalog and `surface_matrix` assembly
- `owner_health_ops.py` for owner health/detail assembly, security summary, and launch-truth lifting
- `services/project_service.py` for project CRUD, draft-project ownership, and generation-project recovery
- `services/library_service.py` for asset serialization, library actions, style persistence, prompt-memory payloads, and export/trash flows
- `services/public_service.py` for public feed behavior, share resolution, public profile-facing payloads, and post mutations
- `services/health_service.py` for top-level `/v1/healthz/detail` orchestration

Treat `StudioService` as an orchestrator first, not the only source of truth.

## Audit Guardrails

The current protected-beta hardening baseline also expects these rules to stay true:
- owner health/detail must degrade honestly under partial helper failure; missing telemetry or readiness artefacts should become explicit fallback truth, not a route crash or a fake `ready`
- public shares must die with asset truth; if an asset is deleted, trashed, demo-only, blocked from public delivery, or otherwise no longer eligible, the share route should fail closed
- public post interaction must respect showcase truth too; hidden internal/demo or otherwise non-showcase public posts should fail closed for like/unlike mutations instead of remaining directly mutable by id
- public profile payloads must not leak private defaults or owner-only settings just because the viewer can resolve a public identity
- owner or root-only routes should bootstrap identity from auth/session truth before enforcing higher privileges; do not rely on stale token flags alone
- permanently deleted identities must leave behind a local tombstone; a surviving authenticated token must fail closed with `401` instead of silently recreating the account through bootstrap or other signed-in routes
- blocked assets must not keep clean-export rights just because a clean variant still exists on disk or in storage
- checkout misconfiguration must fail closed outside local development; staging or production must never silently fall back to demo billing mutations
- demo auth must be development-only by default, and unauthenticated demo login must not mint Pro access outside local development even if an operator explicitly toggles the demo lane on
- project-bound public shares must also die with project truth; if the project is gone or no share-eligible assets remain, public share lookup and old project-share delivery tokens should fail closed
- billable fallback providers that are blocked by spend guardrails should be pruned out at both generation admission and runtime execution; do not rely on only the first selected provider being checked
- trust-preserving UI fixes are allowed during hardening, but only when they protect interpretation, accessibility, or basic usability without redesigning the product

## Planning Rules For AI Assistants

- Prefer small, verifiable backend/ops improvements over large speculative rewrites.
- Do not open a new major backend feature while `Protected Beta Hardening` is still open.
- If docs and code conflict, fix the conflict explicitly instead of silently choosing one side.
- Keep UI untouched unless the user explicitly asks for UI work.
- Treat version/build bookkeeping as required Studio hygiene, not optional cleanup.

## Token-Efficient Working Style

To save tokens and still stay accurate:
- read the context pack first
- read the nearest wiki pages second
- read the exact touched files third
- run the smallest relevant verification last

Do not start by reading the whole repo.

## When To Go Beyond The Wiki

The wiki gives direction and constraints.
The code and tests still decide what is actually true.

If a task depends on runtime truth, also check:
- current `version.json`
- latest verify artefacts
- current tests around the touched backend surface

## Why This File Exists

Studio is large enough that repeated full-repo re-reading is wasteful.

This file is the compact handoff layer for:
- Codex
- Claude
- ChatGPT
- Cursor or IDE assistants
- future teammates

It is here to reduce context cost, reduce drift, and help another model enter the repo with the right mental map fast.
