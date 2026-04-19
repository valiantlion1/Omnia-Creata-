# OmniaVault Stitch Handoff Pack

> Generated: 2026-03-20
> Purpose: Single-file product, UX, architecture, and release context for external UI generation tools like Google Stitch.
> Recommended use: Upload this file alone first. Only upload additional files if the design tool asks for more detail.

## What This File Is

This is the single combined source-of-truth handoff for OmniaVault.
It combines the planning documents that matter most for redesigning the product UI from scratch.

## What The Design Tool Should Understand

- OmniaVault is a real mobile-first app, not a marketing website or dashboard template.
- The app is for capturing, organizing, revisiting, versioning, and refining ideas, notes, prompts, research fragments, and project thinking.
- The result must feel like a premium installed app, not a web dashboard.
- Home, Capture, Library, Projects, Entry Detail, Version History, Settings, Onboarding, Sync, and Offers are the main surfaces.
- The product should feel calmer and lighter than Notion.
- Version history and restore safety are core product features.
- AI is secondary and assistive, not a chat-first experience.
- Mobile-first clarity matters more than visual drama.

## Included Documents

- BLUEPRINT.md
- EXECUTION-PLAN.md
- FOUNDER-MINIMAL-ACTIONS.md
- PRODUCT.md
- DATA-MODEL.md
- AI.md
- ARCHITECTURE.md
- PWA.md
- PLAY-STORE.md
- I18N.md
- DECISIONS.md

---

# BLUEPRINT.md

# OmniaVault Master Blueprint

> Last updated: 2026-03-20
> Status: Master planning document
> Scope: Product, UX, data, architecture, release, operations
> Source of truth: This file is the top-level planning reference for `apps/prompt-vault`

---

## 1. Purpose Of This Document

This document exists so the product direction does not live only in chat history.

It defines:

- what OmniaVault is
- who it is for
- what we are building first
- what we are not building yet
- how the product should feel
- how the system should be structured technically
- how we release it safely
- how we scale it later

This blueprint should stay durable even if:

- the final brand name changes later
- the UI is redesigned again
- the implementation stack evolves
- new team members join

Supporting docs such as [PRODUCT.md](./PRODUCT.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [DATA-MODEL.md](./DATA-MODEL.md), [AI.md](./AI.md), and [PLAY-STORE.md](./PLAY-STORE.md) can be refined under this master plan.

Operational companion docs:

- [EXECUTION-PLAN.md](./EXECUTION-PLAN.md)
- [FOUNDER-MINIMAL-ACTIONS.md](./FOUNDER-MINIMAL-ACTIONS.md)

---

## 2. Product Definition

### One-line definition

OmniaVault is a fast, premium, mobile-first personal idea system for capturing, organizing, revisiting, and improving prompts, ideas, notes, project thoughts, workflows, and research fragments.

### What it is not

OmniaVault is not:

- a generic notes app
- a chat-first AI assistant
- a heavy Notion clone
- a collaborative enterprise workspace
- a prompt marketplace in version one

### Core promise

The user should be able to:

1. capture something fast
2. find it later
3. connect it to a project
4. evolve it over time
5. trust that it will not disappear

### Emotional promise

The product should feel:

- calm
- premium
- fast
- safe
- structured
- less exhausting than large productivity suites

---

## 3. Brand And Naming Posture

### Current working posture

- Umbrella brand: `Omnia Creata`
- Working product name: `OmniaVault`
- Repo path remains: `apps/prompt-vault`

### Naming rule

The final product name may change later, but:

- the product architecture must not depend on the final name
- the public name must remain config-driven
- internal package names may stay `@prompt-vault/*` until renaming is worth the cost

### Brand requirements for the final name

The final name should be:

- short
- easy to pronounce in Turkish and English
- clearly app-like, not fantasy-like
- premium but not cold
- distinctive enough for app store and trademark review

---

## 4. Problem Statement

Users currently lose valuable thinking across too many places:

- chat histories
- note apps
- documents
- screenshots
- temporary drafts
- browser tabs
- private messages to themselves

The current alternatives usually fail in one of these ways:

- too simple and unstructured
- too complex and heavy
- too slow on mobile
- bad at reusing prompts or thought fragments
- weak version history
- poor retrieval

OmniaVault exists to solve the gap between:

- "quick place to capture"
- and
- "serious place to grow work over time"

---

## 5. Target Users

### Primary user cluster

Creators and individual professionals who:

- get ideas while moving
- need to capture quickly
- revisit often
- care about structure without overhead

### Secondary user clusters

- founders
- students
- developers
- marketers
- researchers
- writers

### Anti-targets for version one

- large teams needing permissions and audit-heavy collaboration
- advanced enterprise document systems
- users who want a full Notion replacement on day one

---

## 6. Jobs To Be Done

### Functional jobs

- Save an idea before it is lost.
- Reopen and continue a thought later.
- Keep prompts reusable and searchable.
- Organize work inside projects and categories.
- Restore older versions safely.
- Improve content with AI later, without losing control.

### Emotional jobs

- Feel in control of scattered thinking.
- Trust that valuable work is not being lost.
- Avoid the stress of bloated tools.
- Feel productive without feeling administratively burdened.

### Social jobs

- Look organized and professional.
- Keep creative systems private and intentional.
- Eventually share work from a place that looks polished.

---

## 7. Product Principles

These principles should govern all future decisions.

### 1. Capture first

If capture is not excellent, the product fails.

### 2. Structured, not bloated

The app must help users organize without making them manage a system.

### 3. Mobile is not secondary

The primary feel should work on a phone before it is optimized for desktop.

### 4. Content over chrome

The user content is the hero, not the dashboard decoration.

### 5. Safety by design

Versioning, draft saving, and sync behavior should prevent silent loss.

### 6. AI is an assistant, not the center

AI should improve and organize user thinking, not replace the product identity.

### 7. Premium means clarity

Premium does not mean shiny overload. It means confidence, simplicity, and care.

---

## 8. Product Scope

### Version one foundation

These are required:

- onboarding funnel
- auth
- home
- quick capture
- library
- projects
- detail/editor
- settings
- version history
- local drafts
- local-to-cloud sync
- release notes
- PWA shell
- Android packaging path

### Version one.1

These are likely next:

- AI helper actions
- plan gating
- ads and ad-safe placements
- pricing/paywall
- better analytics and retention loops

### Version two or later

These are intentionally deferred:

- canvas / drawing
- whiteboard thinking
- full collaboration
- team roles and workspaces
- marketplace
- complex sharing permissions
- advanced diff viewer
- desktop-native rewrite

---

## 9. Information Architecture

### Primary navigation

Mobile bottom nav:

- Home
- Library
- Capture
- Projects
- Settings

Desktop shell:

- compact left rail
- content canvas
- no dashboard-style web landing feel

### Home

Purpose:

- orient the user
- reduce first-use confusion
- drive immediate capture
- surface the next logical action

Should contain:

- quick capture hero
- continue where you left off
- active projects
- favorites or pinned items
- small onboarding/help surfaces for new users

Should not contain:

- noisy admin-dashboard metrics
- too many cards
- large marketing-like hero blocks

### Library

Purpose:

- retrieval
- browsing
- filtering
- resurfacing older work

Should prioritize:

- search
- type filters
- project filters
- recency
- readability

### Capture

Purpose:

- the fastest way to get something into the system

Should prioritize:

- title optional
- body first
- type chips
- save confidence
- no complex metadata by default

### Projects

Purpose:

- keep connected entries together
- give context without becoming a workspace monster

Should prioritize:

- project summary
- related entries
- recent updates
- quick add

### Detail / Editor

Purpose:

- read
- refine
- version
- organize

Should prioritize:

- content readability
- safe save flow
- version history
- advanced metadata only when needed

### Settings

Purpose:

- account
- sync state
- plan state
- language/theme
- release notes
- backup/export readiness

---

## 10. UX Blueprint

### First-launch flow

Sequence:

1. Splash
2. Welcome
3. Sign in / Sign up / Skip
4. Offers
5. Home

### Return flow

Sequence:

1. Splash short variant
2. Home or last meaningful route

### Capture flow

1. User opens app
2. Taps capture or starts from Home hero
3. Writes quickly
4. Saves
5. Returns to Home, Detail, or Project

### Resume flow

1. User opens app later
2. Home surfaces draft or recent content
3. User continues from where they left off

### Project flow

1. User creates project
2. User connects entries to project
3. Project becomes a living container for related work

### Version restore flow

1. User opens detail
2. Opens version history
3. Restores an older version
4. System creates a new safe version instead of overwriting history

---

## 11. Design Direction

### Visual positioning

The product should feel like a real premium app, not a premium website.

### Core visual rules

- palette is open and should be chosen for product quality, not habit
- dark-first, neutral, earthy, or softly lit premium directions are all valid
- accent colors should be restrained, intentional, and consistent
- secondary accent only when needed
- premium typography
- strong spacing
- minimal clutter
- reduced visual noise

### Motion rules

- fast
- low-amplitude
- purposeful
- reduce-motion friendly
- no decorative motion that distracts from capture

### 3D and depth rules

- small tilt on key hero surfaces only
- micro-elevation on important cards
- no exaggerated game-like UI depth

### Accessibility rules

- readable contrast
- thumb-friendly touch targets
- visible focus states
- reduced-motion support
- no critical information hidden in decoration

---

## 12. Screen-Level Expectations

### Home

Must answer in under 3 seconds:

- what is this
- what should I do next
- where is my last work

### Library

Must answer in under 5 seconds:

- where is the thing I need
- how do I narrow results
- what changed recently

### Capture

Must feel:

- immediate
- quiet
- safe

### Editor

Must feel:

- focused
- stable
- non-destructive

### Settings

Must feel:

- trustworthy
- operational
- not like a feature graveyard

---

## 13. Domain Model

### Primary entity: Entry

An entry is any saved unit of thinking.

Supported entry types:

- idea
- prompt
- note
- workflow
- research
- project_note

### Supporting entities

- Project
- Category
- Tag
- Draft
- Version
- Activity
- UserPreference
- AIUsage
- AISuggestion
- OfflineMutation

### Important semantic distinction

- Draft = mutable work in progress
- Entry = current saved canonical state
- Version = meaningful historical snapshot

---

## 14. Data Model Expectations

### Entry fields

Minimum fields:

- id
- userId
- title
- body
- type
- status
- createdAt
- updatedAt

Useful optional fields:

- summary
- notes
- resultNotes
- sourceUrl
- sourceLabel
- rating
- isFavorite
- isPinned
- isArchived
- categoryId
- projectId or collection alias
- tags
- variables
- metadata

### Project fields

- id
- userId
- name
- description
- color
- icon
- createdAt
- updatedAt

### Draft fields

- id
- entryId or temporaryKey
- title
- body
- type
- metadata snapshot
- savedAt

### Version fields

- id
- entryId
- versionNumber
- source
- changeSummary
- snapshot
- createdAt

---

## 15. Versioning Blueprint

Versioning is a first-class product feature.

### Rules

- Every entry can evolve over time.
- Drafts do not automatically equal versions.
- Versions are created on meaningful checkpoints.
- Restore creates a new version, never destroys history.
- AI edits must produce preview plus explicit accept behavior.

### Version sources

- manual
- autosave
- restore
- ai_refine
- duplicate
- merge

### User-facing expectations

- users can view history
- users can safely restore
- users can trust their work is recoverable

---

## 16. Sync Blueprint

### Desired behavior

- guest mode works locally
- account mode syncs to cloud
- local data can merge into account state
- offline actions queue safely
- no silent destructive overwrite

### Sync states

- idle
- loading
- saving
- error

### Conflict strategy

Prefer preserve-over-overwrite:

- merge where safe
- create version if ambiguity exists
- never silently destroy newer meaningful content

### Current implementation posture

- local state exists
- remote state table exists
- merge foundation exists
- needs further hardening through real sign-in testing and sync edge-case QA

---

## 17. Authentication Blueprint

### Version one approach

- email/password auth through Supabase
- optional guest mode for preview/onboarding
- user profile auto-created via trigger

### Future options

- magic links
- social providers
- passkeys

### Roles

Current:

- standard authenticated user

Future:

- owner
- admin
- support

These should not be assumed until explicit role logic is implemented.

---

## 18. AI Blueprint

### Positioning

AI is a helper layer, not the product identity.

### Version one AI jobs

- summarize
- improve writing
- suggest title
- classify type
- suggest tags
- suggest project/category

### Non-goals

- full chat replacement
- general chatbot home screen
- auto-rewriting without user approval

### Architecture expectations

- provider abstraction
- backend-only keys
- usage tracking
- graceful provider fallback
- feature flags

### AI rollout rule

Do not turn on AI publicly until:

- sync is stable
- usage limits exist
- failure states are understandable

---

## 19. Monetization Blueprint

### Beta posture

- free
- possibly ad-supported later
- AI off or limited

### Version one posture

- free
- ads for free tier
- pro for no ads and higher limits

### Likely entitlement differences

Free:

- limited entries
- limited projects
- limited AI actions
- ads on non-critical surfaces

Pro:

- higher limits
- no ads
- AI access
- deeper history

Studio:

- reserved for later

### Ad rules

Ads must never:

- interrupt capture
- interrupt editing
- block sign-in
- degrade trust

---

## 20. PWA And Android Strategy

### Current product posture

The product is web-first with PWA capability and Android packaging through Capacitor.

### Why this is the current strategy

- faster iteration
- lower early cost
- one product surface to mature first

### Risks

- can still feel like a website if shell and interactions are weak
- Play Store quality perception may suffer if UI is not app-like

### Launch rule

Do not treat Android packaging alone as success.
The wrapped app must feel intentionally mobile-native.

---

## 21. Technical Architecture

### Frontend

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS
- product-local shared packages

### Backend

- Supabase Auth
- Supabase Postgres
- RLS policies
- optional Edge Functions later

### Runtime layers

- web app
- PWA shell
- Android shell via Capacitor

### Key local packages

- `@prompt-vault/types`
- `@prompt-vault/config`
- `@prompt-vault/i18n`
- `@prompt-vault/validation`

### Architectural direction

- keep the repo monorepo-local
- keep product-specific packages local unless clearly ecosystem-wide
- keep config-driven naming and runtime flags

---

## 22. Security And Privacy Blueprint

### Minimum security posture

- no AI keys in client bundles
- RLS on user-owned tables
- auth-required data access for cloud state
- service role key kept server-only

### Privacy posture

- user content belongs to the user
- guest mode keeps data local until account sync
- release notes and legal pages must be publicly reachable before store submission

### Future security improvements

- admin audit controls
- abuse/rate-limit instrumentation
- export/delete-my-data workflows
- optional encryption posture review

---

## 23. Analytics And Observability

### Product analytics events

Track at minimum:

- app_opened
- entry_created
- entry_saved
- draft_restored
- version_restored
- project_created
- search_used
- sign_up_completed
- sign_in_completed
- sync_success
- sync_failed
- ai_action_requested
- ai_action_applied

### Technical observability

Need:

- client error monitoring
- server error monitoring
- failed auth visibility
- failed sync visibility
- AI request logging

---

## 24. Quality Plan

### Minimum test matrix

- sign-up works
- sign-in works
- sign-out works
- guest mode still works
- local drafts persist
- sync writes to cloud
- version history survives restore
- search works
- project assignment persists
- PWA install path behaves
- Android shell opens and relaunches correctly

### Required environments

- localhost dev
- web production preview
- Android debug build
- at least one real Android device test

### Critical regression areas

- auth cookies
- sync merges
- editor saves
- deep links
- bottom nav behavior

---

## 25. Release Phases

### Phase 0: Foundation hardening

- auth works end-to-end
- sync works end-to-end
- UI no longer feels like a website
- versioning trusted

### Phase 1: Closed beta

- creator/professional core audience
- free
- mobile-first
- installable
- release notes and legal pages live

### Phase 2: Public beta

- stronger onboarding
- more stable Android package
- analytics and error monitoring on
- retention work begins

### Phase 3: V1

- AI helpers on
- plan model on
- pro gating on
- polished Play Store submission

---

## 26. Current Known Gaps

At the time of this document:

- UI still needs major polish on multiple screens
- app still risks reading as web-like in places
- local dev server process handling has been unstable at times
- cloud sync foundation exists but still needs full end-to-end testing
- naming is not final
- MCP setup is partially working but not fully stabilized across all servers

---

## 27. Risks And Mitigations

### Risk: Product becomes too broad

Mitigation:

- keep V1 focused
- defer canvas and collaboration

### Risk: App feels like a wrapped website

Mitigation:

- mobile-first UX
- app-like shell
- no website hero patterns inside product routes

### Risk: Sync loses trust

Mitigation:

- preserve-over-overwrite
- version on restore
- show sync state clearly

### Risk: Naming drags momentum

Mitigation:

- continue with working name
- keep naming config-driven

### Risk: AI complicates launch

Mitigation:

- AI off or heavily limited until core reliability is stable

---

## 28. Implementation Order

Recommended order from this point forward:

1. fix local dev stability
2. complete auth smoke tests
3. verify cloud sync end-to-end
4. simplify and polish Home
5. redesign Capture
6. redesign Library
7. redesign Projects
8. redesign Detail / Editor
9. finalize motion and visual system pass
10. finalize Android app shell polish
11. enable monitoring and analytics
12. prepare closed beta release

---

## 29. Immediate Next Actions

The most practical next actions are:

- stabilize the active local dev process
- finish real account sign-up/sign-in testing against the new Supabase project
- verify `user_vault_state` is being written after login
- continue UI polish with app-like, less web-like patterns
- clean temporary naming inconsistencies after the product direction is stable

---

## 30. Final Standard

OmniaVault is ready for serious release only when all of the following are true:

- a new user can sign up and sign in without friction
- a guest can create work locally and later merge safely
- a signed-in user can save, edit, search, and reopen entries reliably
- version history is safe and understandable
- the app feels like an app, not a dashboard website
- mobile experience is strong
- Android packaging does not feel like a thin wrapper
- core legal, privacy, and operational surfaces exist
- monitoring exists
- naming can still change, but trust and usability cannot be uncertain

---

## 31. Working Summary

In plain language:

We are building a premium personal idea app that must be fast on mobile, easy to trust, and powerful without becoming heavy.

The product wins if it becomes the place where users naturally put their thoughts before they disappear, and return to shape them later.

Everything else is secondary to that.

---

# EXECUTION-PLAN.md

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

---

# FOUNDER-MINIMAL-ACTIONS.md

# OmniaVault Founder Minimal Actions

> Last updated: 2026-03-20
> Purpose: List the smallest possible set of things the founder must personally do

---

## 1. Why this document exists

The product should not stall because the founder is not technical.

This document exists to separate:

- what the coding agent should handle
- and
- what only the founder can realistically do

If a task is not in this file, the default assumption is that the coding agent should try to handle it.

---

## 2. Things only the founder should do

These are external-world actions that usually cannot be completed safely by the coding agent alone.

### Account logins

- log into Supabase
- log into Vercel
- log into domain/DNS provider
- log into Play Console
- log into app store or ad network dashboards

### Secret creation or approval

- generate or approve API keys
- approve OAuth grants
- rotate compromised secrets if needed

### Brand decisions

- choose the final public product name
- approve subtitle and store naming
- approve domain/subdomain mapping

### Legal and business approvals

- confirm privacy policy wording
- confirm terms wording
- choose payment account owner
- accept store agreements

### Final creative approvals

- approve app icon
- approve splash/logo
- approve store screenshots
- approve listing copy

---

## 3. What the founder should not need to do

The founder should not be asked to:

- write code
- manually refactor components
- debug local TypeScript issues
- write SQL migrations from scratch
- maintain design tokens
- manually move files around
- manually rewire every environment file
- architect the data model alone

If these appear, the coding agent should absorb the work whenever possible.

---

## 4. Current minimum action list

At this stage, the founder only needs to be available for:

### Already completed

- create Supabase project
- provide Supabase URL and publishable key
- save auth URL configuration in Supabase

### Likely next

- use the app with a real account once auth flow is stable
- confirm whether the experience feels correct
- approve the next UI direction

### Later

- provide or approve final domain target
- provide Play Console access when Android beta is ready
- approve final store materials

---

## 5. Emergency fallback rule

If the founder is unavailable, work should continue on:

- documentation
- local debugging
- UI improvements
- sync hardening
- Android packaging
- analytics and observability prep

The only things that must wait are external-dashboard or legal/account actions.

---

## 6. Communication rule

When a founder action is required, it should be requested in the smallest possible form:

- one dashboard
- one exact field
- one exact button
- one exact confirmation

The goal is:

- no long technical explanations unless asked
- no "go figure this out" work pushed to the founder

---

## 7. One-line summary

The founder should only handle identity, approvals, accounts, and final decisions.

Everything else should default to the coding agent.

---

# PRODUCT.md

# Product

## Vision

Prompt Vault is a premium cross-platform prompt and idea management system for serious AI users. It is positioned as a smart vault for prompts, ideas, reusable AI instructions, and evolving workflows.

## Core promise

- Save prompts, ideas, workflows, and system instructions in one place
- Organize them by category, tags, collections, language, and platform
- Search them fast
- Reuse them with one tap
- Keep version history instead of destructive overwrites
- Stay mobile-friendly, installable, and ready for cloud sync
- Use AI as an organization assistant, not as a generic chat layer

## Phase 1 blueprint

1. Product shell
   Public site, auth entry points, authenticated app shell, responsive navigation, shared design system, i18n routes.
2. Prompt system
   Prompt records, collections, tags, categories, favorites, archive, export, detail view, editor, version-aware saves.
3. PWA and resilience
   Manifest, icons, service worker registration, local preview persistence, offline-friendly shell behavior.
4. Backend readiness
   Supabase environment layer, auth-ready UI flows, SQL schema, RLS direction, deployment docs.

## Implemented in this repository

- Public pages:
  Homepage, features, how-it-works, pricing, FAQ, sign-in, sign-up, forgot-password
- App pages:
  Dashboard, library, collections, favorites, recent, settings, prompt detail, prompt editor
- Prompt features:
  Search, filters, favorites, archive, duplicate, copy, collections, tags, platforms, variables, version history, exports
- AI features:
  Suggest title, category, tags, platform, summarize long prompts, improve structure, create shorter or more detailed versions, and surface similar prompts
- Data modes:
  Local preview persistence today, Supabase-ready auth and schema for the next integration step

## Honest status

Implemented now:

- Real product shell and information architecture
- Real client-side prompt management flows
- Real version-aware editor logic
- Real export paths
- Real PWA setup
- Real Supabase schema foundation

Planned next:

- Live Supabase CRUD instead of preview-local persistence
- Session-gated protected app routes in production mode
- Full user profile persistence and account settings
- Import pipeline
- Public/private sharing flows
- Billing and plan enforcement

## Audience fit

Prompt Vault is intentionally suitable for:

- AI image and video users
- ChatGPT, Claude, Gemini, and coding assistant users
- Agent builders and automation operators
- Content creators, marketers, and founders
- Power users who need a serious searchable prompt operating system

---

# DATA-MODEL.md

# Data Model

## Core entities

### Profiles

- `profiles`
  User-facing profile record keyed to `auth.users`

### Preferences

- `user_preferences`
  Language, theme, density, default library view, offline cache preference

### Organization

- `categories`
  System categories plus future user-defined categories
- `collections`
  Group prompts by project, domain, or workflow
- `tags`
  Freeform many-to-many labels

### Prompt system

- `prompts`
  Canonical prompt record with latest version metadata and reusable prompt attributes
- `prompt_versions`
  Immutable historical snapshots
- `prompt_tags`
  Join table between prompts and tags
- `prompt_platforms`
  Join table between prompts and target platforms

### Product activity

- `activities`
  User-visible activity feed events
- `exports`
  Export jobs and audit records
- `prompt_shares`
  Placeholder-ready share model for later public/private link distribution
- `ai_requests`
  Request logs, rate-limit visibility, provider usage, and latency tracking
- `ai_suggestion_feedback`
  Optional future persistence for accepted or rejected AI suggestions

## Prompt record shape

Each prompt supports:

- title
- body
- summary
- notes
- result notes
- recommended variations
- type
- language
- category
- collection
- favorite / archive / pinned state
- rating
- variables metadata
- source label / source URL
- latest version pointer
- timestamps

## Versioning model

- Prompts are not treated as overwrite-only notes
- Every meaningful edit can create a new `prompt_versions` row
- `prompts.latest_version_number` makes the current version cheap to read
- Historical versions remain queryable for future diff and compare UI

## Platform model

- `platform_catalog` stores known platforms
- `prompt_platforms` allows many-to-many association
- This keeps the model ready for platform-specific analytics or recommendation logic later

## Sync direction

Current repository behavior:

- Preview mode persists locally in the browser
- The UI and SQL schema are aligned for Supabase-backed per-user sync

Next step:

- Replace preview-only writes with live Supabase writes
- Add server-side reads for authenticated user vault data
- Add storage conflict handling for future offline editing
- Add persistent AI suggestion acceptance and feedback records in live mode

---

# AI.md

# AI Architecture

## Product role

Prompt Vault does not become a chat app.

The AI layer exists only to help users:

- suggest titles
- suggest categories
- suggest tags
- suggest target platforms
- summarize prompts
- rewrite prompts into cleaner structure
- generate shorter or more detailed prompt versions
- detect likely duplicates
- surface related prompts from the user library

## Safety principles

- All provider calls happen on the server only
- Provider API keys never enter client bundles or PWA storage
- Frontend requests only the internal `/api/ai/assist` route
- All request bodies are validated with Zod before execution
- Model outputs are parsed and validated before the route responds
- AI suggestions are kept separate from user content until the user explicitly applies them
- The UI never silently overwrites prompt content

## Backend shape

### Route

- [`../web/src/app/api/ai/assist/route.ts`](../web/src/app/api/ai/assist/route.ts)

This route:

- resolves the acting user or preview actor
- enforces same-origin requests
- applies per-actor rate limiting
- validates input
- runs the provider/service layer
- logs usage
- returns validated suggestion payloads

### Provider abstraction

- [`../web/src/lib/ai/provider-types.ts`](../web/src/lib/ai/provider-types.ts)
- [`../web/src/lib/ai/service.ts`](../web/src/lib/ai/service.ts)

Providers are swappable behind a common interface:

- Preview provider
- OpenRouter provider
- Groq provider
- Together provider

The current active provider is controlled by backend environment variables.

## Fallback strategy

- `find_similar` uses a server-side similarity engine and does not require an external model
- text generation tasks use the configured provider
- if the configured provider is unavailable, the configured fallback provider can take over
- the built-in preview provider offers safe heuristic suggestions when real keys are absent

## Rate limiting and abuse protection

- in-memory per-actor rate limiting is implemented in [`../web/src/lib/ai/rate-limit.ts`](../web/src/lib/ai/rate-limit.ts)
- request logging is implemented in [`../web/src/lib/ai/logging.ts`](../web/src/lib/ai/logging.ts)
- optional persistent logging can use the Supabase service-role path on the server only

## Data handling

- AI suggestions are rendered as reviewable suggestion cards
- applying a body rewrite creates a new prompt version instead of destructive overwrite
- metadata suggestions can be accepted or rejected explicitly
- preview mode stores accepted or pending AI suggestions separately from the prompt body in local product state

## Current limitations

- persistent server-side AI logs require `SUPABASE_SERVICE_ROLE_KEY`
- preview mode uses a server-side heuristic provider by default
- live Supabase-backed prompt retrieval for AI context is not wired yet, so the client sends a minimal library slice to the backend route

## Next recommended AI pass

- add authenticated server-side library reads in Supabase mode
- add persistent AI suggestion feedback storage in the main product flows
- add richer quota enforcement by subscription plan
- add analytics dashboards for AI usage and acceptance rate

---

# ARCHITECTURE.md

# Architecture

## Repo shape

```text
/apps/web
/packages/config
/packages/i18n
/packages/types
/packages/validation
/docs
/supabase/migrations
```

## Application layers

### 1. Shared packages

- `@prompt-vault/types`
  Domain types for prompts, versions, collections, tags, preferences, activities, and auth mode.
- `@prompt-vault/config`
  Brand metadata, navigation, category catalog, platform catalog, and pricing tiers.
- `@prompt-vault/i18n`
  Locale dictionaries and translation helpers.
- `@prompt-vault/validation`
  Zod schemas for prompt and collection writes.

### 2. Next.js app

- `src/app`
  Route tree, metadata routes, locale wrappers, and PWA routes.
- `src/components`
  Shared UI primitives, marketing shell, app shell, and app views.
- `src/providers`
  Theme, locale, toast, and vault state providers.
- `src/lib`
  Environment detection, preview dataset, export helpers, formatting, locale helpers, and Supabase clients.

## Runtime modes

### Preview mode

- Trigger:
  Missing Supabase public environment variables.
- Data:
  Seed dataset plus local browser persistence.
- Goal:
  Keep the product usable and evaluable without pretending live auth is complete.

### Supabase mode

- Trigger:
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present.
- Data:
  Auth flows become live through Supabase clients.
- Goal:
  Transition from preview-local state to account-backed sync.

## App route model

- `/{locale}`
  Public homepage
- `/{locale}/features`
- `/{locale}/how-it-works`
- `/{locale}/pricing`
- `/{locale}/faq`
- `/{locale}/sign-in`
- `/{locale}/sign-up`
- `/{locale}/forgot-password`
- `/{locale}/app`
  Dashboard
- `/{locale}/app/library`
- `/{locale}/app/library/{promptId}`
- `/{locale}/app/editor/new`
- `/{locale}/app/editor/{promptId}`
- `/{locale}/app/collections`
- `/{locale}/app/favorites`
- `/{locale}/app/recent`
- `/{locale}/app/settings`

## State flow

1. `VaultProvider` loads preview data from local storage or falls back to the seeded dataset.
2. App views derive filtered lists and dashboard summaries from the shared dataset.
3. Prompt saves validate through `@prompt-vault/validation`.
4. Saves create a new version record instead of overwriting history.
5. Dataset changes persist back to local storage in preview mode.

## AI layer

- Server route:
  `/api/ai/assist`
- Provider abstraction:
  OpenRouter, Groq, Together, and a preview heuristic provider
- Server-only security:
  Provider secrets stay in environment variables and never cross into client code
- Abuse controls:
  same-origin enforcement, per-actor rate limiting, validated input, validated output, request logging
- Product boundary:
  AI is scoped to organization and improvement tasks only, not freeform chat

## Design system approach

- Tailwind v4 with product-specific CSS variables
- Shared primitives for buttons, inputs, surfaces, badges, section headings, and empty states
- One consistent visual language across marketing and product surfaces
- Mobile-first app shell with desktop sidebar and mobile bottom navigation

---

# PWA.md

# PWA

## Implemented

- Web app manifest at [`../web/src/app/manifest.ts`](../web/src/app/manifest.ts)
- Generated app icons at [`../web/src/app/icon.tsx`](../web/src/app/icon.tsx) and [`../web/src/app/apple-icon.tsx`](../web/src/app/apple-icon.tsx)
- Service worker registration at [`../web/src/components/shared/service-worker-register.tsx`](../web/src/components/shared/service-worker-register.tsx)
- Shell caching service worker at [`../web/public/sw.js`](../web/public/sw.js)
- Responsive desktop + mobile navigation
- Installable standalone launch behavior

## Offline behavior

What works now:

- Shell routes can be cached
- Preview dataset persists locally in the browser
- The app remains usable for browsing cached preview content

What is not claimed yet:

- Full bidirectional offline sync with Supabase
- Background conflict reconciliation
- Guaranteed offline writes for authenticated cloud-backed accounts

## Wrapper readiness checklist

Current UI/UX readiness for Capacitor or similar Android packaging:

- Manifest colors aligned with the current app theme (`theme_color`, `background_color`); final palette may change during redesign
- Maskable icon route available for launcher compatibility
- `viewport-fit=cover` enabled for standalone safe-area handling
- Mobile bottom navigation and quick drawers respect safe-area insets
- Core taps normalized to ~44px minimum targets across primary actions
- Locale-aware offline fallback (`/en/app` and `/tr/app`) in service worker navigation handling

Still to validate during native wrapper packaging:

- Android status bar style per wrapper config
- Splash screen timing and branding per wrapper config
- Native back-button behavior in deep app routes
- Store package QA across real devices and OS versions

## Why this matters

Prompt Vault is intended to feel app-like on:

- desktop browser
- mobile browser
- installed PWA
- future Android wrapper packaging

This repository intentionally lays that groundwork without pretending the hard sync problems are already complete.

---

# PLAY-STORE.md

# Vault Play Store Readiness

## Current package identity
- App name: `Vault`
- Android application ID: `com.omniacreata.vault`
- Brand: `Omnia Creata`
- Primary hosted runtime URL: `https://vault.omniacreata.com`

## Repo-side work completed
- Capacitor dependencies installed in `web/package.json`
- Android bootstrap scripts added to root and web workspaces
- Capacitor config updated for the current dark-first runtime, status bar, splash, keyboard resize, and server allowlist
- Privacy and terms public pages added for store listing support
- Manifest theme/background currently set to a dark background and portrait orientation

## Commands
- Install deps: `npm install`
- Create Android project: `npm run android:add`
- Sync web shell into Android project: `npm run android:sync`
- Open Android Studio project: `npm run android:open`
- Build debug APK after Android project exists: `npm run android:build:debug`

## Play Store checklist
- Generate the Android project and commit the `web/android` folder once the bootstrap succeeds
- Replace placeholder app icons and splash assets with final store branding
- Add signing config for release builds in Android Studio / Gradle
- Verify privacy policy URL uses the deployed `/privacy` page
- Verify terms URL uses the deployed `/terms` page
- Fill Play Console listing text, screenshots, category, contact email, and content rating
- Complete the Data safety form based on actual enabled runtime flags
- Test guest mode, offline capture, app relaunch, deep links, and install prompt behavior on a real Android device

## Data safety guidance for beta
- Core user content: entries, projects, preferences, version history
- Local-first beta: content may remain on-device if the user stays in guest mode
- AI is disabled by default in beta
- Ads may be enabled later; update the Data safety form before turning on a real ad network
- Sync and account collection depend on Supabase runtime configuration

## Store-risk warnings
- A thin web-wrapper experience can still be rejected even with Capacitor; UI must continue to feel native and app-like
- Ads must never interrupt capture/editor flows
- Privacy and terms pages should be deployed publicly before submission
- Final release should use real app icons, screenshots, feature graphic, and store copy rather than beta placeholders

---

# I18N.md

# I18N

## Current locale strategy

- Primary locale:
  English (`en`)
- Secondary locale:
  Turkish (`tr`)
- Routing:
  Locale-prefixed App Router URLs such as `/en/app` and `/tr/app`

## Implementation

- Locale definitions live in [`../packages/types/src/index.ts`](../packages/types/src/index.ts)
- Shared dictionaries live in [`../packages/i18n/src/index.ts`](../packages/i18n/src/index.ts)
- Locale providers are mounted in [`../web/src/app/[locale]/layout.tsx`](../web/src/app/[locale]/layout.tsx)
- Locale switching is handled by [`../web/src/components/shared/language-switcher.tsx`](../web/src/components/shared/language-switcher.tsx)
- Proxy-based locale redirects are handled in [`../web/src/proxy.ts`](../web/src/proxy.ts)

## Why this structure

- Public and authenticated pages share the same locale architecture
- Locale selection is compatible with future user preference storage
- Route-level locale segments are straightforward to deploy across marketing and app domains

## Current coverage

- Shared navigation and key app labels are translated through the shared dictionary
- Homepage hero content is localized
- Turkish route coverage exists across the whole app surface

## Next i18n pass

- Expand dictionary coverage for all editorial marketing copy
- Expand dictionary coverage for every remaining app-side field label
- Move page-specific copy blocks into dedicated locale modules once content stabilizes

---

# DECISIONS.md

# Decisions

## Monorepo with one app and shared packages

Chosen because Prompt Vault needs shared domain contracts, config, and i18n across a growing Omnia Creata ecosystem.

## Next.js App Router

Chosen for:

- public marketing + authenticated app in one product
- route-level metadata and PWA support
- future SSR data loading for authenticated user vaults

## Tailwind v4 with custom tokens

Chosen for:

- fast product iteration
- custom premium styling without template lock-in
- clean shared primitives

## Supabase as backend direction

Chosen for:

- auth
- row-level security
- practical SaaS velocity
- scalable account-backed sync

## Preview mode fallback

Important assumption:

- The user asked to keep building without blocking on secrets.
- Real Supabase credentials are not available inside this session.
- Therefore the app runs honestly in preview mode while remaining auth-ready and schema-ready.

## Locale-prefixed routing

Chosen because it supports:

- `/en` and `/tr` public pages
- shared locale strategy across marketing and app surfaces
- future product expansion under multiple Omnia Creata surfaces

## Server-only AI assistance

Chosen because Prompt Vault needs:

- secret-safe provider access
- backend-controlled rate limiting
- request logging and usage tracking
- swappable providers without rewriting UI logic
- a strong product boundary that keeps AI focused on organization and improvement

---

