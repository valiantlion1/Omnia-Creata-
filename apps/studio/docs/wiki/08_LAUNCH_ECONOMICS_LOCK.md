# Launch Economics Lock

## Status

- Effective date: `2026-04-18`
- Scope: `Controlled Public Paid Launch`
- This is an internal operations lock, not public marketing copy.
- This lock does not close `provider_economics` by itself. That blocker stays open until exact current-build Runware model pricing is signed off together with founder/operator approval.

## Locked Commercial Shape

- Public package shape stays:
  - `Free`
  - `Essential`
  - `Premium`
  - `Credit Packs`
- Public model shape follows the current Runware-only launch catalog:
  - `GPT Image 2`
  - `Nano Banana`
  - `Nano Banana 2`
  - `Grok Imagine Image Pro`
  - `Wan 2.7 Image Pro`
  - `FLUX.2 Max`
- `Free` keeps `0` bundled image credits, may use Create with wallet credits, and does not unlock Studio chat.
- Free accounts may buy wallet credits.
- Internal entitlement ids stay stable as `free`, `creator`, and `pro`; public labels are `Free`, `Essential`, and `Premium`.
- No public launch promise should use a simplified `1 USD = X credits` slogan; that ratio changes materially across subscriptions versus packs.

## Repo-Authoritative Package Truth

These values come from the current backend catalog defaults:

| Package | Price | Included Credits | Effective Revenue / Credit |
| --- | ---: | ---: | ---: |
| `Free` | `$0` | `0` | n/a |
| `Essential` | `$12` | `4000` | `$0.003` |
| `Premium` | `$24` | `12000` | `$0.002` |
| `Credit Pack Small` | `$8` | `2000` | `$0.004` |
| `Credit Pack Large` | `$24` | `8000` | `$0.003` |

Operational reading:
- `Premium` is the conservative revenue floor at launch: `1 credit = $0.002`.
- `Credit Packs` are healthier per-credit than `Premium` and should remain the main shock absorber for spiky premium image demand.
- `Essential` and `Large Pack` both land at `$0.003 / credit`, which is materially safer than `Premium`.

## Model Credit Contract

These values are current backend truth from the Studio model catalog and pricing logic:

| Model | Provider Catalog Key | Public Min Plan | Internal Min Plan | Quoted Credit Cost | Managed Hold / Settlement | Fallback Hold / Settlement | Worst-Case Revenue Floor (`Premium`) |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| `GPT Image 2` | `openai:gpt-image@2` | `Free` | `FREE` | `80` | `80` | `40` | `$0.16` |
| `Nano Banana` | `google:4@1` | `Free` | `FREE` | `140` | `140` | `70` | `$0.28` |
| `Nano Banana 2` | `google:4@3` | `Essential` | `CREATOR` | `220` | `220` | `110` | `$0.44` |
| `Grok Imagine Image Pro` | `xai:grok-imagine@image-pro` | `Essential` | `CREATOR` | `220` | `220` | `110` | `$0.44` |
| `Wan 2.7 Image Pro` | `alibaba:wan@2.7-image-pro` | `Premium` | `PRO` | `240` | `240` | `120` | `$0.48` |
| `FLUX.2 Max` | `bfl:7@1` | `Premium` | `PRO` | `240` | `240` | `120` | `$0.48` |

Rules behind the table:
- If any managed billable provider candidate exists, reservation and final settlement use the full quoted credit cost.
- If only fallback non-billable providers remain, reservation and final settlement use a 50% discounted hold, rounded up.
- If the route is degraded-only, reservation and settlement are `0`.

## Current Cost Basis

### Verified external anchors

- `Runware` model page anchor for `openai:gpt-image@2` / `GPT Image 2`: from about `$0.006 / image`.
- `Runware` model page anchor for `google:4@1` / `Nano Banana`: from about `$0.039 / image`.
- `Runware` model page anchor for `google:4@3` / `Nano Banana 2`: from about `$0.069 / image`.
- `Runware` model page anchor for `xai:grok-imagine@image-pro` / `Grok Imagine Image Pro`: from about `$0.070 / image`.
- `Runware` model page anchor for `alibaba:wan@2.7-image-pro` / `Wan 2.7 Image Pro`: from about `$0.075 / image`.
- `Runware` model page anchor for `bfl:7@1` / `FLUX.2 Max`: from about `$0.070 / image`.

### Current internal model anchors

These are the economics anchors Studio should use right now:

| Model | Current Cost Basis | Status | Margin Reading Against `Premium` Revenue Floor |
| --- | --- | --- | --- |
| `GPT Image 2` | Runware `openai:gpt-image@2`: from about `$0.006 / image` | model page anchor | green |
| `Nano Banana` | Runware `google:4@1`: from about `$0.039 / image` | model page anchor | green |
| `Nano Banana 2` | Runware `google:4@3`: from about `$0.069 / image` | model page anchor | green |
| `Grok Imagine Image Pro` | Runware `xai:grok-imagine@image-pro`: from about `$0.070 / image` | model page anchor | green |
| `Wan 2.7 Image Pro` | Runware `alibaba:wan@2.7-image-pro`: from about `$0.075 / image` | model page anchor | green |
| `FLUX.2 Max` | Runware `bfl:7@1`: from about `$0.070 / image` | model page anchor | green |

Margin band policy:
- `green`: provider cost is `<= 25%` of the `Premium` revenue floor for that model
- `caution`: provider cost is `> 25%` and `<= 50%`
- `risk`: provider cost is `> 50%` and `<= 80%`
- `blocked`: provider cost is `> 80%` or the route depends on an unquoted premium default that would exceed the public model promise

## Operational Capacity Snapshot

Worst-case capacity if a user spends all included credits at the quoted managed credit rate:

| Package | `GPT Image 2` Jobs | `Nano Banana` Jobs | `Nano Banana 2 / Grok` Jobs | `Wan / FLUX.2 Max` Jobs |
| --- | ---: | ---: | ---: | ---: |
| `Essential` | `50` | `28` | `18` | `16` |
| `Premium` | `150` | `85` | `54` | `50` |
| `Credit Pack Small` | `25` | `14` | `9` | `8` |
| `Credit Pack Large` | `100` | `57` | `36` | `33` |

Interpretation:
- `Credit Packs` are the correct way to absorb bursty premium image demand.
- `Premium` is intentionally aggressive on per-credit value, so all model safety should be judged against `Premium` first.
- Public packaging should not imply unlimited premium generations.

## Admission And Hold Rules

These are now the operating rules for launch:

1. `Free` gets no bundled image generation.
2. Any image job must have enough included allowance or wallet balance to cover the reservation hold before queue admission.
3. Managed routes reserve the full quoted credit cost.
4. Fallback-only routes reserve the half-cost discounted hold.
5. Degraded-only routes reserve `0`, but they must remain visibly degraded in product truth.
6. If provider billing, quota, runtime capacity, or spend guardrails are not safe, generation admission returns `blocked`.
7. If an expected provider cost for a public model exceeds `50%` of that model's conservative `Premium` revenue floor, Studio should not admit that route automatically for broad public traffic.
8. If an expected provider cost exceeds `80%` of the model's conservative `Premium` revenue floor, Studio should treat that route as blocked for default public usage unless founder/operator signoff explicitly overrides it for a narrow case.

## Route Topology Lock

- Each public image model should have one explicit primary route only.
- A secondary route is acceptable only when it is still launch-grade for that model on quality, economics, and current-build smoke.
- Backup routes are resilience paths, not equal public promises; they should stay visibly managed-backup, fallback-only, or degraded.
- Current target doctrine is:
  - `GPT Image 2`: `Runware / openai:gpt-image@2` primary.
  - `Nano Banana`: `Runware / google:4@1` primary.
  - `Nano Banana 2`: `Runware / google:4@3` primary.
  - `Grok Imagine Image Pro`: `Runware / xai:grok-imagine@image-pro` primary.
  - `Wan 2.7 Image Pro`: `Runware / alibaba:wan@2.7-image-pro` primary.
  - `FLUX.2 Max`: `Runware / bfl:7@1` primary.
  - Non-Runware providers are not public default routes for this launch wave unless an operator explicitly re-signs the route.

## Burn Caps And Stop-Loss

Until one real paid billing cycle proves healthy margin, Studio should use these pre-scale caps:

| Guardrail | Locked Value | Action |
| --- | ---: | --- |
| Monthly billable image spend soft cap | `$25` | keep monitoring; no scale-up until a paid cycle proves stable |
| Monthly billable image spend hard cap | `$60` | block new paid image admissions until manual reset/signoff |
| Monthly managed-backup route cap | `$15` | if backup-route image spend crosses this, keep public traffic on Runware primary only until re-signed |

Operational reading:
- Chat cost is not the main burn driver under the current cheap-chat doctrine.
- Image spend is the real stop-loss surface; normal traffic should stay on Runware and backup routes should stay deliberate.
- These caps are intentionally conservative because launch is still low-burn and pre-scale.

## Where Risk Starts

Risk begins under any of these conditions:
- any non-Runware image route quietly becomes the default implementation behind public paid generation.
- backup-route image traffic starts carrying normal public demand instead of selective overflow or QA usage.
- `Premium` silently expands into higher-megapixel usage without operators watching the spend effect against the current model credit contract.
- current launch models are promoted as fully economics-closed without the current Runware quote set staying current-build true.
- backup-route image spend breaches its cap or begins dominating too much of total image spend.
- a package or model is marketed as generous before the underlying cost path is proven on the current build.

## Locked Conclusions

- Keep `Free`, `Essential`, `Premium`, and `Credit Packs`.
- Keep `Runware-first` as the default normal traffic image doctrine.
- Keep the public image ladder on the current approved set: `GPT Image 2`, `Nano Banana`, `Nano Banana 2`, `Grok Imagine Image Pro`, `Wan 2.7 Image Pro`, and `FLUX.2 Max`.
- Keep `provider_economics` open until the current-build Runware proof, backup-route doctrine, and founder signoff are all aligned.

## Sources

- Backend catalog and charge logic:
  - [env.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/config/env.py)
  - [model_catalog_ops.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/studio_platform/model_catalog_ops.py)
  - [generation_pricing_ops.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/studio_platform/generation_pricing_ops.py)
  - [billing_ops.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/studio_platform/billing_ops.py)
  - [ai_provider_catalog.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/studio_platform/ai_provider_catalog.py)
- External pricing references refreshed on `2026-04-29`:
  - [Runware GPT Image 2 model page](https://runware.ai/models/openai-gpt-image-2)
  - [Runware Nano Banana docs](https://runware.ai/docs/models/google-nano-banana)
  - [Runware Nano Banana 2 docs](https://runware.ai/docs/models/google-nano-banana-2)
  - [Runware Grok Imagine Image Pro docs](https://runware.ai/docs/models/xai-grok-imagine-image-pro)
  - [Runware Wan 2.7 Image Pro model page](https://runware.ai/models/alibaba-wan2-7-image-pro)
  - [Runware FLUX.2 Max model page](https://runware.ai/models/bfl-flux-2-max)
