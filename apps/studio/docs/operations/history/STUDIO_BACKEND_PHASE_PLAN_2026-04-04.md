# Studio Backend Phase Plan (2026-04-04)

## Purpose

This document defines the backend completion plan for Studio as a phased program.
Backend is **not considered done** until the phases below are complete with their exit criteria met.

This plan is grounded in:

- the current repository shape
- the current product lock that `Chat` and `Create` are separate first-class surfaces
- the current billing decision to use `Lemon Squeezy`
- the current provider decision to roll out `fal.ai` first, keep `Runware` as the managed fallback, keep `Pollinations` as development/degraded fallback only, and treat Hugging Face routing as optional evaluation/control-plane tooling
- the current reality that the codebase is closer to `Supabase + Redis + Python/FastAPI` than to the longer-term `R2 + separate AI services` target

## Locked Product Rules

These are treated as hard constraints for backend design:

- `Create` is the direct generation surface. It should feel queue-aware, deterministic, and cost-controlled.
- `Chat` is the premium creative copilot surface. It should support long-running multimodal context, analysis, prompt writing, edit planning, and guided generation.
- `Chat` and `Create` must remain behaviorally separate even if they share internal infrastructure.
- Free users should not get the full premium chat experience.
- Abuse controls, queue fairness, and cost protection are backend responsibilities, not UI responsibilities.
- Provider choice is an explicit backend policy decision, not a random per-request guess.

## Repo-Grounded Reality Check

Current repo reality:

- Runtime is a single FastAPI app with in-process orchestration.
- State still centers on the JSON store.
- Asset storage is currently implemented for `local` and `supabase`.
- Rate limiting exists and already supports Redis.
- Lemon Squeezy is already integrated and is now the locked billing direction.
- The codebase already has a provider abstraction, so vendor strategy can be changed without rewriting every generation route.
- Domain extraction has started, but `service.py` remains the main orchestration hotspot.

This means the fastest realistic path is:

1. finish the backend on top of `Supabase + Redis + Lemon + current Python service`
2. make it durable and safe
3. optionally move media storage or queueing to `R2 / Cloudflare / separate AI services` later

## Definition Of Backend Done

Backend is only considered complete when all of the following are true:

- domain boundaries are clear enough that `service.py` is no longer the system dump
- generation jobs survive restarts and do not depend on fragile in-process fire-and-forget tasks
- plan entitlements, quotas, credits, and chat access rules are enforced server-side
- provider capabilities are explicit and safe across `t2i`, `i2i`, `i2t`, and edit flows
- moderation, abuse throttling, and queue fairness exist at the platform layer
- storage and access controls are production-safe
- operational visibility exists for failures, cost spikes, webhook issues, and stuck jobs

## Phase 0: Contract Lock And Domain Map

### Goal

Freeze the backend contracts so the rest of the work stops drifting.

### Repo focus

- `apps/studio/backend/studio_platform/models/`
- `apps/studio/backend/studio_platform/router.py`
- `apps/studio/backend/studio_platform/service.py`
- `apps/studio/web/src/lib/studioApi.ts`

### Deliverables

- final request/response models for chat, generation, billing, assets, shares, and projects
- explicit `surface` separation for `chat` vs `create`
- capability vocabulary for `think`, `vision`, `edit`, `t2i`, `i2i`, `i2t`
- one authoritative plan matrix for `free`, `credit-only`, `pro`, future higher tiers
- one authoritative cost/quota vocabulary for credits, monthly allotment, premium chat access, queue priority, and feature flags

### Exit criteria

- no new backend route or internal helper invents ad-hoc payload fields
- the same capability/plan names are used across backend models, routes, and frontend client types
- `STUDIO_MAINTENANCE_MAP.md` and this file reflect current reality

### Notes

This phase prevents more spaghetti.
If this phase is skipped, every later phase will leak logic across files.

## Phase 1: Service Extraction Until Orchestration Is Honest

### Goal

Reduce `service.py` to orchestration and policy, not raw business logic.

### Repo focus

- `apps/studio/backend/studio_platform/service.py`
- extracted ops/services modules

### Deliverables

- finish extracting remaining `profile`, `billing`, `share`, `asset`, `conversation`, `chat`, and `generation` responsibilities
- move side-effect heavy code into dedicated modules with small public functions
- keep `service.py` responsible only for workflow ordering, permission checks, and cross-domain decisions

### Exit criteria

- `service.py` no longer directly performs large data mutations inline
- each major backend domain has a dedicated module with tests
- new contributors can locate a behavior by domain instead of by searching one giant file

### Non-goals

- no visual/frontend redesign
- no premature microservice split

## Phase 2: Durable Persistence Layer

### Goal

Stop treating the JSON store as the long-term backend core.

### Repo focus

- `apps/studio/backend/studio_platform/store.py`
- new repository layer
- Supabase/Postgres integration layer

### Deliverables

- repository interface for identities, conversations, messages, projects, assets, generations, shares, and ledger entries
- Postgres-backed implementation for core metadata
- JSON store downgraded to local-dev fallback only
- migration path from existing JSON state into the persistent store
- idempotent write patterns for webhook processing and job updates

### Exit criteria

- restart does not depend on a single JSON file being the source of truth
- core entities live in a real persistent store
- tests cover repository behavior and migration edge cases

### Research basis

- Supabase strongly centers on Postgres + RLS for application data: [RLS docs](https://supabase.com/docs/guides/database/postgres/row-level-security)
- Supabase Storage access is policy-driven and fits the current repo better than inventing a new storage model immediately: [Storage access control](https://supabase.com/docs/guides/storage/security/access-control)

## Phase 3: Durable Job Runtime And Queueing

### Goal

Replace fragile in-process generation execution with a queue-backed job runtime.

### Repo focus

- `apps/studio/backend/studio_platform/services/generation_runtime.py`
- `apps/studio/backend/studio_platform/service.py`
- queue worker module(s)
- Redis or database-backed queue state

### Deliverables

- persisted job lifecycle states: `queued`, `running`, `succeeded`, `failed`, `cancelled`, `timed_out`
- worker loop or consumer process separate from the request-response path
- retry strategy, timeout handling, stuck-job detection, and dead-letter logic
- recovery on service restart
- queue priority fields for `plan`, `surface`, and future `fast-hour` logic

### Exit criteria

- generation work no longer relies on `asyncio.create_task` inside the web request path
- deploy/restart does not orphan a live generation job without detection
- queue state can be inspected and repaired

### Research basis

- FastAPI’s own docs advise using heavier tools such as Celery for work that should not stay tied to the same process: [FastAPI background tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/)
- Celery is a common queue choice, but its own docs explicitly say they do not support Microsoft Windows, which matters for local development in this repo: [Celery introduction](https://docs.celeryq.dev/en/stable/getting-started/introduction.html)
- Because of that, the repo-friendlier path is likely `Redis-backed worker runtime` or `Supabase/Postgres queue primitives` first, then cloud queueing later if needed

## Phase 4: Provider Capability Matrix And Create Runtime

### Goal

Make `Create` a reliable generation surface with explicit provider contracts.

### Repo focus

- `apps/studio/backend/studio_platform/providers.py`
- `apps/studio/backend/studio_platform/services/generation_runtime.py`
- generation models and tests

### Deliverables

- provider strategy lock:
  - `fal.ai` primary production provider for `Create` and premium chat handoff
  - `Runware` secondary managed fallback for supported capability classes
  - `Pollinations` development/degraded fallback only
  - `Hugging Face Inference Providers` optional router/evaluation layer, not the primary source of truth for paid production generation
- capability matrix per provider: `t2i`, `i2i`, `analysis`, `edit`, `upscale`, `control/reference`
- reference-image support as a first-class contract, not an optional hack
- provider normalization for prompt, seed, size, steps, safety, timeout, and cost metadata
- fallback and degradation rules when a requested capability is unsupported
- create-surface queue policy and credit cost calculation

### Exit criteria

- provider selection is policy-driven, not guess-driven
- `Create` always knows whether a request is valid before a provider call starts
- primary provider rollout can degrade safely to fallback providers without silently changing capability semantics

### Notes

This is where `Midjourney-like Create` becomes operationally trustworthy.

### Research basis

- fal.ai supports async queue-style inference and webhook-friendly job flows, which fits the repo's Phase 3 direction better than purely synchronous image endpoints: [fal queue docs](https://fal.ai/docs/documentation/model-apis/inference/queue)
- Runware has strong FLUX editing and image-to-image support, making it a good managed fallback for capability-specific gaps: [Runware FLUX tools](https://runware.ai/docs/image-inference/flux-tools)
- Hugging Face Inference Providers can route requests to fal and other providers behind one client surface, but is better treated here as optional routing/evaluation infrastructure than as the primary billing/runtime truth: [HF pricing and billing](https://huggingface.co/docs/inference-providers/en/pricing), [HF text-to-image provider docs](https://huggingface.co/docs/inference-providers/en/tasks/text-to-image)

## Phase 5: Premium Chat Runtime

### Goal

Turn chat into the premium Studio copilot instead of a generic chat wrapper.

### Repo focus

- `apps/studio/backend/studio_platform/chat_ops.py`
- `apps/studio/backend/studio_platform/llm.py`
- conversation/message models
- chat entitlement and quota logic

### Deliverables

- system role locked to Studio use cases
- long-context policy for multimodal conversation
- explicit separation between analysis-only turns and generation-triggering turns
- attachment lifecycle that preserves references cleanly across multiple turns
- premium chat access gating by plan
- server-side message limits, rolling windows, and future reset-hour hooks
- stronger prompt/tool policy for prompt writing, edit planning, brand-safe critique, and generation handoff

### Exit criteria

- chat does not accidentally behave like create
- chat can analyze, plan, prompt, and hand off to generation intentionally
- premium chat rules are enforced entirely server-side

## Phase 6: Lemon Billing, Entitlements, Credits, And Promotions

### Goal

Make monetization trustworthy before growth polish.

### Repo focus

- `apps/studio/backend/studio_platform/billing_ops.py`
- billing models
- webhook processing
- plan enforcement points

### Deliverables

- final Lemon checkout flows for subscriptions and credit top-ups
- webhook verification, idempotency, replay protection, and reconciliation jobs
- entitlement snapshots on the identity/account model
- plan-aware chat access, queue priority, credit ceilings, and monthly resets
- support for onboarding discounts and campaign codes
- support for future seasonal promotions without rewriting entitlement logic

### Exit criteria

- subscription upgrades, cancellations, renewals, and top-ups mutate entitlements correctly
- billing state can be recomputed from webhooks and stored records
- no premium-only capability relies on frontend-only hiding

### Research basis

- Lemon supports discount codes with fixed or percentage discounts, schedules, and redemption limits: [Creating discount codes](https://docs.lemonsqueezy.com/help/orders/creating-discount-codes)
- Lemon’s subscription model is already compatible with variants and recurring products, which fits the current repo better than changing provider direction again: [Subscriptions](https://docs.lemonsqueezy.com/help/products/subscriptions)

## Phase 7: Abuse Prevention, Moderation, Queue Fairness

### Goal

Protect the platform from cost abuse, API abuse, moderation abuse, and queue starvation.

### Repo focus

- rate limit layer
- generation admission control
- moderation hooks
- audit logging

### Deliverables

- route-specific rate limits for chat, generation, upload, webhook, and auth-sensitive flows
- queue admission rules by plan, burst history, and current concurrency
- duplicate/spam detection for repeated generation attempts
- moderation/flag pipeline for disallowed prompts and repeated NSFW abuse attempts
- temporary block and manual-review states
- credit reservation before expensive generation starts

### Exit criteria

- one abusive user cannot starve the queue
- suspicious behavior is visible and enforceable
- cost spikes can be traced to users, providers, or routes

### Research basis

- the repo already has an in-memory/Redis rate limiter foundation; this phase extends it into business-level policy
- Supabase auth and edge-function documentation also supports structured rate-limit patterns if later needed: [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits), [Rate limiting examples](https://supabase.com/docs/guides/functions/examples/rate-limiting)

## Phase 8: Storage Safety, Access Policies, And Media Lifecycle

### Goal

Make binary media safe, policy-controlled, and maintainable.

### Repo focus

- `apps/studio/backend/studio_platform/asset_storage.py`
- asset ingestion and cleanup flows
- signed URL / access policy layer

### Deliverables

- private/public asset rules by surface and ownership
- signed access for protected media
- consistent lifecycle for uploads, temporary attachments, generation outputs, deletions, and retention cleanup
- policy-safe storage layout for user-owned assets and shared/public assets
- optional path for later `R2` migration if scale or cost requires it

### Exit criteria

- media access is policy-driven rather than path-driven
- deletion and retention behavior are deterministic
- storage backend can change without rewriting every asset call site

### Research basis

- current repo is closer to Supabase Storage than R2 today
- R2 remains a valid future option if egress economics or scale make it worthwhile: [Cloudflare R2](https://developers.cloudflare.com/r2/)

## Phase 9: Ops, Observability, And Launch Hardening

### Goal

Give the backend an operator view so launch does not become blind firefighting.

### Repo focus

- backend logging and metrics
- admin/ops endpoints or internal dashboard data feeds
- CI and smoke tests

### Deliverables

- structured logs with request ids, job ids, user ids, provider ids
- dashboards or at least queryable feeds for failed jobs, stuck jobs, billing mismatches, moderation flags, and queue depth
- webhook replay tooling
- health checks for providers and storage backends
- launch smoke tests for auth, chat, create, billing webhook, and asset access

### Exit criteria

- a failed generation can be traced without reading random console logs
- a broken webhook or provider outage is visible quickly
- deployment confidence does not depend on manual luck

## Phase Order Policy

Recommended order:

1. Phase 0
2. Phase 1
3. Phase 2
4. Phase 3
5. Phase 4
6. Phase 5
7. Phase 6
8. Phase 7
9. Phase 8
10. Phase 9

Important nuance:

- `Phase 7` should not wait until the absolute end if cost abuse appears early
- `Phase 8` and `Phase 9` can partially overlap with late `Phase 6` if the domain contracts are already stable

## What Can Wait Until After Backend 99 Percent

These are valuable, but they should not block backend completion:

- advanced promo experiments
- exotic queue classes beyond basic premium priority
- full mobile-specific API tuning
- provider marketplace expansion just for variety
- cosmetic admin tooling beyond the minimum operator needs

## What Must Exist Before Calling Backend “Almost Done”

- persistent metadata store
- durable generation runtime
- premium chat entitlements
- Lemon billing lifecycle correctness
- provider capability matrix
- queue fairness and abuse controls
- storage access safety
- operational visibility

If even one of these is missing, backend is still in-progress, not nearly finished.
