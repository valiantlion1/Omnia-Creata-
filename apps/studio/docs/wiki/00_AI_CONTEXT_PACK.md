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
