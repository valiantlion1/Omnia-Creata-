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
