# OmniaVault Execution Plan

> Last updated: 2026-03-20
> Purpose: Turn the master blueprint into a practical build sequence
> Audience: founder, coding agent, future contributors

---

## 1. Operating assumption

This plan assumes the founder wants the product to move forward with minimal day-to-day technical intervention.

Default rule:

- the coding agent owns implementation
- the founder only intervenes for external account actions, approvals, and product decisions with real tradeoffs

---

## 2. Working definition of "ready"

The product is considered ready for serious beta only when all of the following are true:

- auth works end-to-end
- local draft saving works
- cloud sync works for signed-in users
- version history works and restore is safe
- capture, library, projects, and editor all feel app-like
- the Android package launches cleanly
- legal pages exist publicly
- release notes exist in-product
- onboarding is understandable
- no major blocker remains in local development or production preview

---

## 3. Current state snapshot

### Already in place

- Next.js app foundation
- Supabase project created
- environment wired to live Supabase URL and publishable key
- schema migrations written
- SQL migrations manually applied
- sign-up and sign-in confirmed on a clean runtime path
- local drafts foundation
- version history foundation
- release notes view
- Android/Capacitor shell bootstrap
- master blueprint documentation

### Still incomplete

- local runtime stability on the default dev port
- end-to-end sync verification against real account data
- UI overhaul on major app screens
- final app-like motion and visual polish
- hardening of settings, onboarding, and home logic
- production monitoring
- final Android release prep

---

## 4. Delivery phases

## Phase A - Stability foundation

Goal:

- make local and account-backed behavior trustworthy

Tasks:

- fix the stuck `3001` local runtime issue
- normalize the primary dev workflow
- verify sign-up, sign-in, sign-out, password reset behavior
- verify `profiles` and `user_preferences` are created correctly
- verify `user_vault_state` row creation/update behavior
- surface sync state clearly in UI
- document common local recovery steps

Definition of done:

- local auth flows work consistently
- clean local startup command works every time
- one test account can create, save, reopen, and persist data

## Phase B - Core product reliability

Goal:

- make the app safe to use every day

Tasks:

- finish cloud state merge testing
- validate draft restore behavior
- validate version restore behavior
- verify no silent data overwrite on repeated edits
- tighten offline queue behavior
- verify project assignment persistence
- verify search and filtering behavior with real user data

Definition of done:

- one real user can trust the app with actual work

## Phase C - UI reset to app quality

Goal:

- remove the remaining web-like feel

Tasks:

- redesign Home into a true app start surface
- redesign Capture into the best screen in the product
- redesign Library for retrieval first
- redesign Projects into a focused workspace view
- redesign Detail/Editor into a reading-first and writing-first surface
- remove dashboard-like admin patterns
- refine shell, spacing, iconography, and hierarchy

Definition of done:

- the product feels like a real app before it feels like a dashboard

## Phase D - Motion and visual system polish

Goal:

- make the app feel premium, modern, and responsive

Tasks:

- full visual foundation pass
- unify token system
- refine card depth and subtle 3D usage
- unify micro-interactions
- refine splash and onboarding transitions
- add reduced-motion support

Definition of done:

- visual polish supports usability instead of distracting from it

## Phase E - Release-readiness and packaging

Goal:

- prepare a testable Android beta package

Tasks:

- verify Capacitor Android shell behavior
- replace placeholder assets
- tighten status bar, splash, and safe-area behavior
- verify install, relaunch, and offline startup behavior
- finalize privacy and terms deployment URLs
- prepare release checklist and listing content

Definition of done:

- the app can be tested as an Android beta by real users

---

## 5. Detailed implementation order

Work in this order unless a blocker forces reprioritization:

1. local runtime fix
2. auth end-to-end
3. cloud sync verification
4. home redesign
5. capture redesign
6. library redesign
7. projects redesign
8. detail/editor redesign
9. motion and visual system pass
10. settings and onboarding polish
11. Android polish
12. monitoring and analytics
13. closed beta packaging

---

## 6. Agent-owned work

These should be treated as implementation tasks the coding agent can drive directly:

- code changes
- refactors
- docs updates
- schema maintenance
- local dev debugging
- UI iteration
- env example maintenance
- release note structure
- Android project wiring
- migration authoring
- feature-flag plumbing
- sync debugging

---

## 7. Founder-owned minimum actions

These are the only categories that should require the founder directly:

- account login in third-party dashboards
- API keys or OAuth grants
- domain DNS changes
- legal/policy final wording approval
- store listing assets and screenshots approval
- payment or billing account setup
- final brand name decisions

If something can be done in code or local setup, it should not be pushed back to the founder unnecessarily.

---

## 8. Environment plan

### Local

Purpose:

- daily development
- auth and sync testing
- UI iteration

Requirements:

- working Supabase URL and publishable key
- stable local runtime

### Preview

Purpose:

- shareable internal QA builds
- design review
- auth behavior validation on a hosted build

### Beta Android

Purpose:

- Play Store internal or closed testing
- real device behavior validation

---

## 9. Quality gates by phase

### Gate 1 - Auth gate

Must pass:

- sign-up
- sign-in
- sign-out
- reset password

### Gate 2 - Data trust gate

Must pass:

- create entry
- edit entry
- save draft
- restore draft
- restore version
- reopen after refresh

### Gate 3 - Retrieval gate

Must pass:

- search
- filter
- project grouping
- favorites
- archive handling

### Gate 4 - App-quality gate

Must pass:

- no screen reads like a website dashboard
- capture is fast and obvious
- mobile interactions feel intentional

### Gate 5 - Distribution gate

Must pass:

- Android package opens
- privacy page exists
- terms page exists
- app survives relaunch

---

## 10. Risks that can block shipping

### Technical blockers

- local runtime instability
- auth cookie misbehavior
- sync merge bugs
- Android shell regressions

### Product blockers

- UI still feels web-like
- capture still not strong enough
- too much complexity on Home or Library

### Operational blockers

- no monitoring
- no privacy URL
- no stable package identity

---

## 11. Current priorities

If there is limited time, the priorities are:

1. auth and sync
2. capture and library UX
3. app-like shell and motion
4. Android beta readiness

Do not spend premium time on:

- marketplace ideas
- team collaboration
- advanced AI features
- non-essential growth features

before the above are stable.

---

## 12. Immediate next checklist

- [ ] fix the broken default local dev instance
- [ ] verify sign-in and sign-up on the same stable runtime
- [ ] verify a signed-in user writes cloud state
- [ ] inspect the `user_vault_state` table with real data
- [ ] reduce remaining web-like UI patterns
- [ ] begin the real capture/editor redesign

---

## 13. Documentation maintenance rule

Whenever one of the following changes, this file must be updated:

- release order
- product scope
- rollout model
- critical blocker
- environment strategy
- founder responsibilities

This document should remain the practical "what happens next" reference under the master [BLUEPRINT.md](./BLUEPRINT.md).
