# Launch Economics Lock

## Status

- Effective date: `2026-04-18`
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
- `flux-2-flex` remains an internal or account-gated advanced lane. It is not a public default card for launch messaging.
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
| `Fast` | `flux-2-klein` | `FREE` | `6` | `6` | `3` | `$0.12` |
| `Standard` | `qwen-image-2512` | `FREE` | `8` | `8` | `4` | `$0.16` |
| `Premium` | `flux-2-max` | `CREATOR` | `12` | `12` | `6` | `$0.24` |
| `Signature (internal)` | `flux-2-flex` | `PRO` | `16` | `16` | `8` | `$0.32` |

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
- `Runware` public pricing confirms `FLUX.2 [klein] 9B` at about `$0.00078 / 1024x1024 image`.
- `Runware` public pricing confirms `Qwen-Image-2512` at about `$0.0051 / 1024x1024 image`.
- `Runware` public pricing confirms `FLUX.2 [max]` at `$0.07` for the first megapixel plus `$0.03` per extra megapixel.
- `Runware` public pricing confirms `FLUX.2 [flex]` at about `$0.06 / 1024x1024 image`.
- `OpenAI GPT-image` remains a targeted QA/reference lane only; it is not part of the normal public routing doctrine in the current launch lock.

### Current internal lane anchors

These are the economics anchors Studio should use right now:

| Lane | Current Cost Basis | Status | Margin Reading Against `Pro` Revenue Floor |
| --- | --- | --- | --- |
| `Fast` | Runware `FLUX.2 [klein] 9B`: about `$0.00078 / image` | verified | green |
| `Standard` | Runware `Qwen-Image-2512`: about `$0.0051 / image` | verified | green |
| `Premium` | Runware `FLUX.2 [max]`: about `$0.07 / image` at 1MP and `$0.03` per extra MP | verified | caution |
| `Signature (internal)` | Runware `FLUX.2 [flex]`: about `$0.06 / image` | verified | green |
| `OpenAI image QA lane` | variable by size/quality; keep out of normal public routing | targeted QA only | not part of launch margin math |

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

## Route Topology Lock

- Each public image lane should have one explicit primary route only.
- A secondary route is acceptable only when it is still launch-grade for that lane on quality, economics, and current-build smoke.
- Backup routes are resilience lanes, not equal public promises; they should stay visibly managed-backup, fallback-only, or degraded.
- Current target doctrine is:
  - `Fast`: `Runware / FLUX.2 [klein] 9B` primary. Shared provider-level managed secondary stays `fal` when configured and current-build proven. Backup-only lanes stay `pollinations`, `huggingface`, and `demo`.
  - `Standard`: `Runware / Qwen-Image-2512` primary. Shared provider-level managed secondary stays `fal` when configured and current-build proven. Backup-only lanes stay `pollinations`, `huggingface`, and `demo`.
  - `Premium`: `Runware / FLUX.2 [max]` primary. Shared provider-level managed secondary stays `fal` when configured and current-build proven. `OpenAI image` may remain a targeted QA/operator backup, but it is not a normal public launch-grade lane.

## Burn Caps And Stop-Loss

Until one real paid billing cycle proves healthy margin, Studio should use these pre-scale caps:

| Guardrail | Locked Value | Action |
| --- | ---: | --- |
| Monthly billable image spend soft cap | `$25` | keep monitoring; no scale-up until a paid cycle proves stable |
| Monthly billable image spend hard cap | `$60` | block new paid image admissions until manual reset/signoff |
| Monthly managed-backup lane cap | `$15` | if backup-lane image spend crosses this, keep public traffic on Runware primary only until re-signed |

Operational reading:
- Chat cost is not the main burn driver under the current cheap-chat doctrine.
- Image spend is the real stop-loss surface; normal traffic should stay on Runware and backup lanes should stay deliberate.
- These caps are intentionally conservative because launch is still low-burn and pre-scale.

## Where Risk Starts

Risk begins under any of these conditions:
- any non-Runware image lane quietly becomes the default implementation behind the public `Premium` lane.
- backup-lane image traffic starts carrying normal public demand instead of selective overflow or QA usage.
- `Premium` silently expands into higher-megapixel `FLUX.2 [max]` usage without operators watching the spend effect against the current `12-credit` contract.
- `Standard` or `Premium` are promoted as fully economics-closed without the current Runware quote set staying current-build true.
- backup-lane image spend breaches its cap or begins dominating too much of total image spend.
- a package or lane is marketed as generous before the underlying cost path is proven on the current build.

## Locked Conclusions

- Keep `Free Account`, `Creator`, `Pro`, and `Credit Packs`.
- Keep `Fast`, `Standard`, and `Premium` as the only public-facing image quality lanes.
- Keep `Runware-first` as the default normal traffic image doctrine.
- Keep the public image ladder on the current approved set: `flux-2-klein`, `qwen-image-2512`, `flux-2-max`.
- Keep `OpenAI image` out of the normal public routing path; use it only for targeted QA or deliberate operator-only cases.
- Keep `provider_economics` open until the current-build Runware proof, backup-lane doctrine, and founder signoff are all aligned.

## Sources

- Backend catalog and charge logic:
  - [env.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/config/env.py)
  - [model_catalog_ops.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/studio_platform/model_catalog_ops.py)
  - [generation_pricing_ops.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/studio_platform/generation_pricing_ops.py)
  - [billing_ops.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/studio_platform/billing_ops.py)
  - [ai_provider_catalog.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/studio_platform/ai_provider_catalog.py)
- External pricing references checked on `2026-04-18`:
  - [Google Gemini API pricing](https://ai.google.dev/gemini-api/docs/pricing)
  - [OpenRouter Google provider pricing](https://openrouter.ai/google)
  - [Runware pricing](https://runware.ai/pricing)
  - [OpenAI API pricing](https://openai.com/api/pricing/)
