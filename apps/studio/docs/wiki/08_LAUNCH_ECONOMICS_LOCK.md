# Launch Economics Lock

## Status

- Effective date: `2026-04-15`
- Scope: `Controlled Public Paid Launch`
- This is an internal operations lock, not public marketing copy.
- This lock does not close `provider_economics` by itself. That blocker stays open until exact current-build Runware lane pricing is signed off together with founder/operator approval.

## Locked Commercial Shape

- Public package shape stays:
  - `Free Account`
  - `Creator`
  - `Pro`
  - `Credit Packs`
- Public image quality shape stays:
  - `Fast`
  - `Standard`
  - `Premium`
- `juggernaut-xl` remains an internal or account-gated advanced lane. It is not a public default card for launch messaging.
- `Free Account` keeps `0` bundled image credits, may use Create with wallet credits, and does not unlock Studio chat.
- Free accounts may buy wallet credits.
- No public launch promise should use a simplified `1 USD = X credits` slogan; that ratio changes materially across subscriptions versus packs.

## Repo-Authoritative Package Truth

These values come from the current backend catalog defaults:

| Package | Price | Included Credits | Effective Revenue / Credit |
| --- | ---: | ---: | ---: |
| `Free Account` | `$0` | `0` | n/a |
| `Creator` | `$12` | `400` | `$0.03` |
| `Pro` | `$24` | `1200` | `$0.02` |
| `Credit Pack Small` | `$8` | `200` | `$0.04` |
| `Credit Pack Large` | `$24` | `800` | `$0.03` |

Operational reading:
- `Pro` is the conservative revenue floor at launch: `1 credit = $0.02`.
- `Credit Packs` are healthier per-credit than `Pro` and should remain the main shock absorber for spiky premium image demand.
- `Creator` and `Large Pack` both land at `$0.03 / credit`, which is materially safer than `Pro`.

## Lane Credit Contract

These values are current backend truth from the Studio model catalog and pricing logic:

| Lane | Catalog Model | Min Plan | Quoted Credit Cost | Managed Hold / Settlement | Fallback Hold / Settlement | Worst-Case Revenue Floor (`Pro`) |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| `Fast` | `flux-schnell` | `FREE` | `6` | `6` | `3` | `$0.12` |
| `Standard` | `sdxl-base` | `FREE` | `8` | `8` | `4` | `$0.16` |
| `Premium` | `realvis-xl` | `CREATOR` | `12` | `12` | `6` | `$0.24` |
| `Advanced (internal)` | `juggernaut-xl` | `PRO` | `14` | `14` | `7` | `$0.28` |

Rules behind the table:
- If any managed billable provider candidate exists, reservation and final settlement use the full quoted credit cost.
- If only fallback non-billable providers remain, reservation and final settlement use a 50% discounted hold, rounded up.
- If the route is degraded-only, reservation and settlement are `0`.

## Current Cost Basis

### Verified external anchors

- `Gemini 2.5 Flash-Lite`: `$0.10 / 1M input`, `$0.40 / 1M output` on Google's official pricing page.
- `Gemini 2.5 Flash`: `$0.30 / 1M input`, `$2.50 / 1M output` on Google's official pricing page.
- `Gemini 2.5 Pro`: `$1.25 / 1M input`, `$10.00 / 1M output` on Google's official pricing page.
- `OpenRouter` fallback currently mirrors the same Google model family pricing on the official OpenRouter Google provider page for the selected Gemini lanes.
- `Runware` public pricing confirms `FLUX.1 [schnell]` at `$0.0006 / image` for the listed `512x512 / 4 steps` configuration.
- `OpenAI GPT-image-1.5` official API pricing is `$32.00 / 1M image output tokens`; OpenAI's current price page exposes the model-level output rate and Studio's internal lookup table currently maps that to:
  - square `medium`: about `$0.034 / image`
  - square `high`: about `$0.133 / image`
  - portrait or landscape `high`: about `$0.200 / image`
- `OpenAI GPT-image-1 mini` rescue/draft pricing currently maps to:
  - square `low`: about `$0.005 / image`
  - square `medium`: about `$0.011 / image`
  - square `high`: about `$0.036 / image`

### Current internal lane anchors

These are the economics anchors Studio should use right now:

| Lane | Current Cost Basis | Status | Margin Reading Against `Pro` Revenue Floor |
| --- | --- | --- | --- |
| `Fast` | Runware `FLUX.1 [schnell]` official public quote: `$0.0006 / image` | verified | green |
| `Standard` | current catalog estimate: `$0.008 / image` | internal fallback estimate; exact current public Runware quote for `sdxl-base` is not pinned | green, but still signoff-gated |
| `Premium` | current catalog estimate: `$0.015 / image` for normal Runware-first traffic | internal fallback estimate; safe only while OpenAI is selective | green on Runware-first assumption |
| `Premium` via OpenAI medium | `$0.034 / image` | verified | green |
| `Premium` via OpenAI high square | `$0.133 / image` | verified | risk |
| `Premium` via OpenAI high portrait / landscape | `$0.200 / image` | verified | blocked as a default public lane |
| `Advanced (internal)` | current catalog estimate: `$0.020 / image` | internal fallback estimate | caution if OpenAI high becomes normal |

Margin band policy:
- `green`: provider cost is `<= 25%` of the `Pro` revenue floor for that lane
- `caution`: provider cost is `> 25%` and `<= 50%`
- `risk`: provider cost is `> 50%` and `<= 80%`
- `blocked`: provider cost is `> 80%` or the route depends on an unquoted premium default that would exceed the public lane promise

## Operational Capacity Snapshot

Worst-case capacity if a user spends all included credits at the quoted managed credit rate:

| Package | `Fast` Jobs | `Standard` Jobs | `Premium` Jobs |
| --- | ---: | ---: | ---: |
| `Creator` | `66` | `50` | `33` |
| `Pro` | `200` | `150` | `100` |
| `Credit Pack Small` | `33` | `25` | `16` |
| `Credit Pack Large` | `133` | `100` | `66` |

Interpretation:
- `Credit Packs` are the correct way to absorb bursty premium image demand.
- `Pro` is intentionally aggressive on per-credit value, so all lane safety should be judged against `Pro` first.
- Public packaging should not imply unlimited premium generations.

## Admission And Hold Rules

These are now the operating rules for launch:

1. `Free Account` gets no bundled image generation.
2. Any image job must have enough included allowance or wallet balance to cover the reservation hold before queue admission.
3. Managed lanes reserve the full quoted credit cost.
4. Fallback-only lanes reserve the half-cost discounted hold.
5. Degraded-only lanes reserve `0`, but they must remain visibly degraded in product truth.
6. If provider billing, quota, runtime capacity, or spend guardrails are not safe, generation admission returns `blocked`.
7. If an expected provider cost for a public lane exceeds `50%` of that lane's conservative `Pro` revenue floor, Studio should not admit that route automatically for broad public traffic.
8. If an expected provider cost exceeds `80%` of the lane's conservative `Pro` revenue floor, Studio should treat that route as blocked for default public usage unless founder/operator signoff explicitly overrides it for a narrow case.

## Burn Caps And Stop-Loss

Until one real paid billing cycle proves healthy margin, Studio should use these pre-scale caps:

| Guardrail | Locked Value | Action |
| --- | ---: | --- |
| Soft monthly variable AI spend cap | `$25` | keep monitoring; no scale-up |
| Hard monthly variable AI spend cap | `$60` | block new paid image admissions until manual reset/signoff |
| Monthly OpenAI image sub-cap | `$15` | disable new OpenAI-backed public image routes; keep Runware-first only |
| OpenAI share of monthly image spend | `25%` caution / `40%` block | if above `40%`, public premium OpenAI usage must stop until re-signed |

Operational reading:
- Chat cost is not the main burn driver under the current Gemini doctrine.
- Image spend, especially selective OpenAI image use, is the real stop-loss surface.
- These caps are intentionally conservative because launch is still low-burn and pre-scale.

## Where Risk Starts

Risk begins under any of these conditions:
- `OpenAI high` becomes the default implementation behind the public `Premium` lane.
- portrait or landscape `high` OpenAI output is admitted broadly under the current `12-credit` public premium contract.
- `Standard` or `Premium` are promoted as fully economics-closed without an exact current-build Runware quote or founder signoff.
- monthly OpenAI image spend breaches its sub-cap or dominates too much of total image spend.
- a package or lane is marketed as generous before the underlying cost path is proven on the current build.

## Locked Conclusions

- Keep `Free Account`, `Creator`, `Pro`, and `Credit Packs`.
- Keep `Fast`, `Standard`, and `Premium` as the only public-facing image quality lanes.
- Keep `Runware-first` as the default normal traffic image doctrine.
- Keep `OpenAI` selective for draft rescue, edit/reference-critical work, and narrow premium paths only.
- Do not let `OpenAI high` become the default public `Premium` lane under the current credit contract.
- Keep `provider_economics` open until exact Runware normal-lane pricing and founder signoff are both current-build true.

## Sources

- Backend catalog and charge logic:
  - [env.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/config/env.py)
  - [model_catalog_ops.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/studio_platform/model_catalog_ops.py)
  - [generation_pricing_ops.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/studio_platform/generation_pricing_ops.py)
  - [billing_ops.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/studio_platform/billing_ops.py)
  - [ai_provider_catalog.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/studio_platform/ai_provider_catalog.py)
- External pricing references checked on `2026-04-15`:
  - [Google Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
  - [OpenRouter Google provider pricing](https://openrouter.ai/google)
  - [Runware pricing](https://runware.ai/pricing)
  - [OpenAI API pricing](https://openai.com/api/pricing/)
