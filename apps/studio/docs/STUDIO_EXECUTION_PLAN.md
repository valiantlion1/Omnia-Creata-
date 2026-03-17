# OmniaCreata Studio Execution Plan

Last updated: 2026-03-17

## Product North Star

OmniaCreata Studio is the flagship creative product for `studio.omniacreata.com`.

V1 target:

- Single creator first
- Image-first production workflow
- Cloud-first generation pipeline
- Premium, cinematic interface
- Clean path from browse -> sign in -> project -> create -> history -> media -> billing

Primary user flow:

1. Home
2. Dashboard
3. Project
4. Create Canvas
5. History / Media Library

## Repo Alignment Notes

- This document is a product execution plan, not a repo taxonomy override.
- Studio remains an in-place product and continues under incremental cleanup.
- Hosting, billing, and provider notes here describe production-facing direction, not guaranteed free-tier assumptions.
- Open business values such as free credit amounts and Pro limits stay open until explicitly decided.

## Recommended Defaults

These assumptions should remain active unless the product direction changes.

- Identity model: one Omnia identity across products
- Public launch scope: image generation only
- Video/audio: backend contracts only, no public UI in V1
- Prompt handling: attached to each generation record, not a separate prompt library product
- Default compute: managed cloud provider
- Local runtimes: optional future integration, not part of the core product path
- Binary storage: Cloudflare R2
- Metadata + auth + permissions: Supabase
- Billing: Paddle-first with adapter boundary for future fallback
- Progress UX: polling in V1

## Research-Aligned Platform Choices

### Why Supabase for control plane

- Auth, relational data, and row-level security match Studio's ownership model
- Storage access control and RLS patterns make it a strong fit for project/job/asset metadata
- Good default for `users`, `workspaces`, `projects`, `generations`, `assets`, `credits`, and `shares`

### Why R2 for binary media

- Better fit for image-heavy workloads than putting all asset binaries into the app database path
- Lower storage overhead and egress-friendly delivery for generated image assets
- Clean separation between metadata and binary files

### Why managed generation first

- Reliable product UX matters more than local tinkering for launch
- Local ComfyUI-style paths create setup friction and support burden
- Provider adapters still allow future fallback or hybrid routing

### Why Paddle behind an adapter

- Subscription + one-off credit top-up can live behind one billing interface
- Merchant-of-record helps with tax/compliance overhead
- Approval and operations risk should not leak into product code, so the billing module must remain provider-agnostic

## Current Architecture Direction

### Web

- React route-driven shell
- Premium landing and product marketing surfaces
- Auth-aware product surfaces
- Typed API client only
- No browser-side provider secrets

### Backend

- FastAPI as the single Studio BFF
- Auth/session-aware application layer
- Job orchestration, project access rules, billing summary, share link creation
- Polling-based generation status for V1

### AI Services

- Provider adapter contract
- Runware-first managed image path
- Demo/local fallback only for development or temporary degraded mode
- Clear output contract for every generation job

### Workspace

Core entities:

- OmniaIdentity
- StudioWorkspace
- Project
- GenerationJob
- GenerationOutput
- ShareLink

### Media Library

- Every successful output becomes an asset
- Asset metadata stays queryable by project, model, date, prompt, favorite, and share status
- History and Media Library must use the same asset source of truth

### Integrations

- Supabase Auth + Postgres + RLS
- Cloudflare R2
- Runware
- Paddle

## Refactor Priorities

### Remove or isolate

- Legacy Studio pages that no longer belong to the active route shell
- Old store-driven parallel UI paths
- Local-engine-first assumptions
- Half-connected prompt-suite patterns that exceed V1 scope

### Keep and strengthen

- Existing route shell
- New dashboard/project/create/history/media product flow
- Typed API client approach
- Clean backend BFF boundary
- Visual identity and premium CTA direction

## Product Requirements for V1

### Guest

- Can browse Home and limited marketing/product previews
- Can inspect dashboard-style demo states
- Cannot create real projects or generations

### Free

- Can sign in
- Has monthly starter credits
- Limited model catalog and lower generation limits
- Access to personal history and media

### Pro

- Higher limits and fuller model access
- Full history/media/project continuity
- Share links
- Credit top-ups

## Execution Milestones

### Milestone 1: Stabilize the shell

Goal:

- Studio feels coherent, polished, and navigationally complete

Tasks:

- Audit active routes vs legacy pages
- Remove or archive dead page entry points from the main product path
- Upgrade `CreateCanvas` visual quality to match Home and Dashboard
- Upgrade `Billing` and `Project` experience to premium product quality
- Ensure guest, signed-in, and empty states feel intentional

Exit criteria:

- No broken or placeholder-looking primary pages
- Topbar and navigation reflect the final V1 IA

### Milestone 2: Real data backbone

Goal:

- Replace local-only persistence with real identity and storage foundations

Tasks:

- Add Supabase schema for identities, workspaces, projects, generations, assets, credits, and shares
- Add RLS policies for every user-owned table
- Add Supabase-backed repository layer
- Add R2 upload/save pipeline for generated assets
- Keep local JSON store as dev fallback only

Exit criteria:

- Refresh-safe project/history/media continuity using real persistence
- Asset URLs resolve from managed object storage

### Milestone 3: Production image vertical slice

Goal:

- A signed-in user can create, generate, save, and revisit work

Tasks:

- Harden `POST /v1/generations` contract
- Add provider capability map and model catalog
- Route generation requests through Runware adapter
- Persist prompt snapshot, parameters, cost, status, and outputs
- Surface generation states clearly in UI

Exit criteria:

- Image generation works without provider secrets in the browser
- Failed jobs are visible and understandable

### Milestone 4: Billing and quota enforcement

Goal:

- Monetization and cost control work before scale

Tasks:

- Add subscription plan state
- Add credit ledger with debits and top-ups
- Add checkout creation endpoint
- Add webhook ingestion and plan/credit sync
- Gate generation by tier, limits, and remaining credits

Exit criteria:

- Free users stop at quota
- Pro users continue with correct credit accounting

### Milestone 5: Prepare second-phase expansion

Goal:

- Keep the system extensible without bloating V1

Tasks:

- Define provider contract extensions for video and audio
- Keep video/audio hidden from the public shell
- Add capability-based UI configuration
- Separate integration adapters cleanly

Exit criteria:

- Adding a second media modality does not require reworking the core app

## Overnight Work Queue

Recommended implementation order if working continuously:

1. Finish premium UI pass for:
   - Create Canvas
   - Billing
   - Project
   - History / Media empty states
2. Audit and isolate legacy pages:
   - Landing
   - Studio
   - Gallery
   - Models
   - Profile
3. Introduce a Studio design system layer:
   - shared section shells
   - stat cards
   - CTA panels
   - premium empty states
   - page headers
4. Add backend repository interface for future Supabase migration
5. Define Supabase schema draft and RLS ownership rules
6. Define R2 asset key strategy and signed delivery policy
7. Add billing adapter interface and webhook DTOs

## Task Backlog

### P0

- Polish `CreateCanvas` into a true production workspace
- Polish `Billing` into a credible plan and credit purchase experience
- Audit all legacy page/component entry points and remove route ambiguity
- Add repository abstraction so persistence can move from JSON store to Supabase without rewriting service logic

### P1

- Add project cover image, status, and updated-at driven sorting
- Add favorite/archive behavior for assets
- Add richer generation card metadata in History and Media
- Add provider capability registry for model availability and cost lookup
- Add empty states and guided CTA states for guest/free/pro

### P2

- Add share link management UI
- Add brand preset packs and style starter recipes
- Add admin spend visibility
- Add hidden feature flags for video/audio contracts

## Open Product Decisions

These do not block current stabilization work, but should be confirmed soon.

- Final Studio brand name if rebrand replaces "Studio"
- Whether guest users should see interactive fake generations or only static previews
- Exact free monthly credit amount
- Exact Pro limits and included credits
- Whether teams/collaboration are V1.5 or later
- Whether brand style packs launch in V1 or immediately after V1

## Success Criteria

Studio is ready for serious iteration when:

- The UI feels premium, intentional, and brand-aligned
- The active pages all support one coherent creator journey
- Backend ownership, auth, and persistence rules are clear
- Managed generation is the default happy path
- Asset continuity works across refreshes and sessions
- Billing and credits control cost before growth

## Source Notes

Reference sources used for these decisions:

- Runware pricing and product docs: https://runware.ai/pricing/
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase Storage access control: https://supabase.com/docs/guides/storage/security/access-control
- Cloudflare R2 pricing: https://developers.cloudflare.com/r2/pricing/
- Paddle developer docs: https://developer.paddle.com/
