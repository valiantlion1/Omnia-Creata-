# Delivery Status

## Delivery State

### Historical Baseline

- `Protected Beta Hardening` is closed as the baseline that got Studio here.
- That closure still matters operationally because current-build proof must preserve it.
- It is no longer the main planning target for product direction.

### Active Now

- `Controlled Public Paid Launch`

This is the current working frame for Studio.

## What "Done" Means Now

Work is only done when:
- the current build behavior is proven, not inferred
- `Create` and `Chat` still share one commercial and ownership contract
- account, entitlement, and billing truth come from the server, not frontend guesses
- provider truth stays honest about what is truly launch-grade versus merely configured
- wiki, operations docs, and the current build manifest tell the same story

## Current Product Reality

Already strong:
- auth, ownership, and export paths are materially safer
- generation runtime, asset persistence, and project/library surfaces are real product behavior
- billing and entitlement summaries are first-class backend payloads
- launch-readiness, provider smoke, and staging verification exist as operator truth surfaces

Still open:
- `provider_mix`
- `image_public_paid_usage`
- `provider_economics`

Those remain real launch gates.
They should be solved honestly, not narrated away.

## Current Launch Doctrine

Studio is now described as:
- Omnia Creata's flagship product
- a premium creative product, not a generic chatbot
- two linked surfaces: `Create` and `Chat`
- a controlled public paid launch, not a waitlist-first beta shell

Commercial defaults:
- `Starter`
- `Pro`
- `Credit Top-up`

Exact plan pricing and package values must come from the backend catalog.
The frontend should present that truth, not invent its own packaging story.

## Public Paid Exit Criteria

Studio is not considered ready for public paid exit until all of the following are true:
- `Create -> result -> library/project -> share` feels stable and honest
- `Chat -> in-chat generation -> create handoff -> result persistence` stays stable
- degraded or blocked provider states are visible instead of hidden behind premium-sounding copy
- current-build artefacts stay aligned on the same build number
- public plan and entitlement truth is server-authoritative

## State Language

Use these product-facing states by default:
- `queued`
- `running`
- `ready`
- `failed`
- `blocked`

Use these release stages deliberately:
- `local alpha`
  stable enough for local rehearsal
- `protected beta`
  closed baseline that still must remain true on current builds
- `public paid platform`
  current active exit target

## Immediate Planning Rule

Current rule:
- stay inside `Controlled Public Paid Launch`
- sequence work as `catalog truth -> surface completion -> provider truth -> proof sync`
- do not open new large product surfaces until the launch-critical chain is tighter
- treat protected-beta closure as preserved baseline proof, not as the active story the product tells
