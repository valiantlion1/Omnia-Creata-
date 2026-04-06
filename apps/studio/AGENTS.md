# AGENTS.md - OmniaCreata Studio

## Product identity
OmniaCreata Studio is not a generic AI toy.

It is a premium-feeling creative product with two intentional surfaces:
- `Create` = deterministic image generation surface
- `Chat` = premium multimodal creative copilot

Do not collapse Studio into:
- a generic chatbot
- a random prompt playground
- a provider demo shell
- a UI redesign exercise

Keep the product feeling:
- premium
- controlled
- consistent
- safe

## Non-negotiable product rules
1. `Create` and `Chat` remain distinct surfaces unless explicitly redirected by the user.
2. Backend stability beats feature sprawl.
3. Security, ownership, billing, and runtime behavior are server-authoritative.
4. Free users may be constrained, but must not receive humiliatingly bad product quality.
5. Degraded/fallback behavior must be explicit in backend metadata, never silent magic.
6. Do not redesign the UI unless the user explicitly asks for UI work.

## Current architecture priorities
Completed backend hardening sprints:
- Sprint 1: runtime durability
- Sprint 2: provider routing and quality policy
- Sprint 3: billing, credits, entitlement reconciliation
- Sprint 4: security, ownership, abuse hardening

Current next major priority:
- Sprint 5: production persistence and data authority

## Version and build discipline
Every meaningful Studio change must update all of the following:
- `apps/studio/version.json`
- `apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md`
- `apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md`

Rules:
- Keep `version` aligned with product maturity.
- Bump `build` for every meaningful Studio change in `YYYY.MM.DD.NN` format.
- Treat missing build bumps as a process bug.
- The visible footer version/build in the app must continue to reflect `version.json`.

Current UI sources that expose version/build:
- `apps/studio/web/src/lib/appVersion.ts`
- `apps/studio/web/src/components/StudioPrimitives.tsx`
- `apps/studio/web/src/components/StudioShell.tsx`

## Auth and login regression rules
If you touch auth, session, login, logout, bootstrap, or `/auth/me`, you must verify:
- backend auth path still works
- frontend does not falsely log users out on transient failures
- local snapshot fallback does not mask real expired-session failures forever

Minimum verification after auth-related work:
- `python -m pytest -q`
- `npm run type-check`
- `npm run build`
- browser check of:
  - `/login`
  - Google OAuth return path completes and does not silently bounce back to idle `/login`
  - successful signed-in navigation to a protected route
  - footer still showing current version/build

## Backend safety rules
When changing backend behavior:
- do not bypass repository/service boundaries casually
- do not weaken moderation or ownership checks
- do not let revoked/deleted/public/share scope checks drift apart
- do not silently change billing semantics without updating tests and ledger

## Source-of-truth files
Use these first when orienting:
- `apps/studio/version.json`
- `apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md`
- `apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md`
- `apps/studio/backend/studio_platform/service.py`
- `apps/studio/backend/studio_platform/router.py`
- `apps/studio/backend/tests/`

## Done criteria
A Studio task is not done because code changed.

A Studio task is done only if:
- the main flow works
- tests are updated or verified
- version/build bookkeeping is updated
- user-visible regressions are checked when relevant
- the change does not quietly undermine product consistency
