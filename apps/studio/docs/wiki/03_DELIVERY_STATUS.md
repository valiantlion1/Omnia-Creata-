# Delivery Status

## Delivery State

### Historical Sprint Chain

- Sprint 1: runtime durability
- Sprint 2: provider routing and quality policy
- Sprint 3: billing, credits, and entitlement hardening
- Sprint 4: security, ownership, and abuse hardening
- Sprint 5: production persistence and data authority
- Sprint 6: premium chat backbone
- Sprint 7: live provider verification and launch hardening
- Sprint 8: deployment and always-on environments
- Sprint 9: provider reliability and economics

Those sprints are no longer the active planning language.
They remain the historical path that got Studio to the current beta-hardening phase.

### Active Now

- `Protected Beta Hardening`

## What "Done" Means

Work is only done when:
- the current build behavior is proven, not inferred
- route-level regressions protect the signed-in shell
- operator artefacts agree on the same build
- staging proof exists for the current build
- wiki, release ledger, maintenance map, and version manifest all tell the same story

## Current Product Reality

Already strong:
- auth and ownership are materially safer
- generation runtime is durable enough for serious local rehearsal
- billing, entitlements, and asset protection are much harder to corrupt
- launch-readiness and owner truth exist as first-class backend/operator surfaces

Still open:
- launch-grade provider proof for protected beta must stay narrow and explicit
- current-build image proof still matters more than provider config alone
- staging closure depends on Docker bring-up, owner verify, and artefact sync staying truthful
- public-paid readiness remains a later stage, not the current acceptance target

## Protected Beta Hardening Outcome So Far

Key outcomes already landed:
- signed-in route contracts are harder to break accidentally
- startup verification, provider smoke, and deployment verification can now be compared as one truth chain
- staging truth no longer depends on reading only one runtime root
- owner verification can inspect the same launch gate humans read from `/v1/healthz/detail`
- protected-beta provider policy is intentionally simplified:
  - chat: `OpenAI` only counts as launch-grade
  - image: `OpenAI gpt-image-1-mini` is the protected-beta default
  - owner-only premium image QA stays explicit and optional
- this protected-beta lane lock is temporary proof policy, not the final public-paid provider strategy
- hidden operator mapping for `surface -> tier -> provider -> model` should now come from `ai_control_plane.surface_matrix`, not scattered notes

## State Language

Use these two state layers deliberately:

- signed-in/library-facing contract:
  - `queued`
  - `running`
  - `ready`
  - `failed`
  - `blocked`
- internal worker/job lifecycle:
  - `queued`
  - `running`
  - `succeeded`
  - `failed`
  - `retryable_failed`
  - `cancelled`
  - `timed_out`

The second layer exists for backend recovery and queue logic.
The first layer is the product contract and should be the default language in UI, planning, and operator summaries unless lower-level debugging is the real topic.

## Readiness Language

Use these terms consistently:
- `local alpha`
  - stable for local rehearsal, but not a deployment proof
- `protected beta`
  - current acceptance target
  - requires truthful local + staging proof on the same build
- `public paid platform`
  - later stage
  - requires stronger resilience and economics than protected beta

## Immediate Planning Rule

Current rule:
- stay inside `Protected Beta Hardening`
- sequence work as `contract -> truth sync -> provider proof -> closure`
- do not open new large backend features until `closure_ready=true`
- treat wiki as strategy memory and operations docs as historical/operator memory
