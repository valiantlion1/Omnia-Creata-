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

## Market And Economics Reality

As of `2026-04-14`, official market pricing clusters roughly like this:
- entry creator plans: about `$10-$15/month`
- serious prosumer plans: about `$20-$35/month`
- premium/pro plans: about `$60+/month`

Current Studio package assumptions in the economics dossier:
- `Starter`: `60` credits, currently modeled as `$0`
- `Pro`: `1200` credits for `$18/month`
- `Top-up`: `200` credits for `$8`
- `Top-up`: `800` credits for `$24`

Interpretation:
- `Pro` is currently priced below much of the serious prosumer band
- `Starter` only stays economically sane if it remains visibly limited and cost-safe
- top-ups are currently the healthiest margin instrument in the package mix

Current tension:
- the product doctrine says Studio is a controlled paid launch, not a broad free playground
- the current dossier still models `Starter` as free
- that tension should be resolved deliberately before broad public-paid exit, not ignored in copy

Current cost caveat:
- OpenAI-first image costs are manageable on draft lanes
- higher-cost final lanes can compress margin quickly if they become default for low-revenue or free traffic
- founder signoff is still required before `provider_economics` can close

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
