# AI Context Pack

This file is the fastest Studio handoff layer for Codex, Claude, ChatGPT, IDE assistants, and future maintainers.

Use it before wider code exploration.

## What Studio Is

OmniaCreata Studio is a premium creative product.

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
- `Controlled Public Paid Launch`

Important background:
- `Protected Beta Hardening` is closed as the baseline that got Studio here
- protected-beta closure still matters as historical proof
- but it is no longer the main acceptance target for planning language in current docs

This means:
- launch-critical product truth matters more than speculative new features
- server-authoritative billing, entitlement, and checkout truth matter more than marketing copy
- Create and Chat must feel like one product contract, not two unrelated apps
- operator truth still has to stay honest about launch blockers

## Read In This Order

### Fast orientation

1. [Wiki Index](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/README.md)
2. [Product North Star](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/01_PRODUCT_NORTH_STAR.md)
3. [Delivery Status](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/03_DELIVERY_STATUS.md)
4. [Roadmap And Planning](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/06_ROADMAP_AND_PLANNING.md)
5. [Launch Economics Lock](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/08_LAUNCH_ECONOMICS_LOCK.md)

### Backend, billing, provider, or ops work

1. [Studio Agent Rules](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/AGENTS.md)
2. [System Architecture](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/02_SYSTEM_ARCHITECTURE.md)
3. [Operations And Releases](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/05_OPERATIONS_AND_RELEASES.md)
4. [Version Manifest](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/version.json)
5. [Release Ledger](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md)
6. [Maintenance Map](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md)

### Product flow or UI work

1. [Engineering Standards](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/04_ENGINEERING_STANDARDS.md)
2. touched page/component files
3. billing/plan payloads if the change touches commercial truth

## Stable Truth Right Now

Treat these as stable unless the task explicitly changes them:
- `Create` and `Chat` stay distinct product surfaces
- auth, billing, entitlement, moderation, and runtime truth are server-authoritative
- Studio is a global product, not a narrow creator-only beta toy
- the live packaging shape is `Free Account`, `Creator`, `Pro`, and `Credit Packs`
- the public image quality shape is `Fast`, `Standard`, and `Premium`
- exact package numbers come from the backend public-plan catalog
- `OCOS` is future internal operating-system work, not current Studio scope

## Current Open Launch Gaps

The main public-paid blockers still visible in operator truth are:
- `abuse_hardening`
- `provider_mix`
- `image_public_paid_usage`
- `provider_economics`

Do not claim public-paid readiness while those remain unresolved on the current build.

## Product and Commercial Contract

Current doctrine:
- Studio launches as one creative account contract
- `Create` and `Chat` share the same billing and entitlement system
- real generation requires an account and entitlement truth
- wide free-play behavior is not the product strategy
- self-serve access is the intended direction; waitlist dependency is not the core story

## Hidden Operator Truth

If the task depends on current operator truth, read:
- `version.json`
- release ledger
- maintenance map
- latest external runtime artefacts under `%LOCALAPPDATA%\\OmniaCreata\\Studio\\...`

For provider and launch-readiness truth, the backend owner-health surfaces remain the durable source.

## Planning Rules For AI Assistants

- Prefer launch-critical fixes over speculative platform expansion
- Prefer server-authoritative truth over guessed frontend copy
- Do not silently treat historical protected-beta docs as the active frame
- Keep `Create -> result -> library/project -> share` and `Chat -> in-chat generation -> create handoff -> result persistence` as the main product chain
- Keep version/build bookkeeping honest for every meaningful Studio wave

## Why This File Exists

Studio is large enough that full-repo rereads are wasteful.

This file exists so another assistant can understand:
- what Studio is
- what phase it is in
- what is actually blocked
- what source of truth to trust first

within 15-20 minutes instead of re-deriving the whole repo from scratch.
