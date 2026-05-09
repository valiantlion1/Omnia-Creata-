# Model Routing And Credit Decision Review

## Status

- Date: `2026-05-02`
- Scope: Studio image/chat economics before public paid launch
- Status: `implemented in build 2026.05.02.245`
- This document is implemented in the backend model catalog, pricing quote path, provider cost estimates, Chat blueprint defaults, Create defaults, and frontend model labels.
- It supersedes the older model-choice and credit-number recommendations in `08_LAUNCH_ECONOMICS_LOCK.md` for Studio image generation economics.
- Live Runware smoke, protected staging, future payment-provider checkout, and Turnstile activation are still separate launch gates.

## Current Repo Truth

Before build `2026.05.02.245`, the checkout exposed the older lane shape:

| Lane | Current model | Current credits | Max output |
| --- | --- | ---: | --- |
| Fast | FLUX.2 Klein | 6 | 1024x1024 |
| Standard | Qwen-Image-2512 | 8 | 1536x1536 |
| Premium | FLUX.2 Max | 12 | 2048x2048 |
| Signature | FLUX.2 Flex | 16 | 2048x2048 |

Build `2026.05.02.245` keeps those ids for compatibility/internal paths, but public model listing now exposes the named modern model set below. `Signature` remains an internal/manual lane name, not a user-facing model or plan.

## Product Rules

1. No final paid generation should be marketed below `1024`.
2. Default paid final output should be `2K`.
3. `4K` should be explicit or model-selected, not silently default for every prompt.
4. Chat image generation uses the same credit engine as Create.
5. Reference images, output count, high resolution, live provider quote, and retry reserve must affect the credit hold.
6. Public model labels should use recognizable names where they help trust.
7. Cheap/internal engines may be used, but should not be the public hero promise.

## Recommended Public Model Set

| Surface | Public model | Job | Default resolution | Credit rule |
| --- | --- | --- | --- | --- |
| Chat brain | Gemini 2.5 Flash | Conversation, prompt help, image understanding | text/vision | monthly chat limit, no image credits |
| Chat brain premium | Gemini 2.5 Pro | Complex creative planning and hard visual analysis | text/vision | Pro/deep-analysis only |
| Chat quick image | Nano Banana | Quick draft/edit inside chat | 1K | 10 credits |
| Chat default image | Nano Banana 2 | Normal make/edit request inside chat | 2K | 20 credits |
| Chat 4K image | Nano Banana 2 | Explicit high-res chat output | 4K | 28 credits |
| Chat multi-reference | Wan 2.7 Image Pro or Seedream 4.5 | Many uploads, fusion, edits | 1536 to 4K | 16-20 credits plus caps |
| Create default | Nano Banana 2 | Everyday paid generation | 2K | 20 credits |
| Create photoreal/cinematic | Grok Imagine Image Pro | Social, lifestyle, cinematic, photoreal | 2K | 16 credits |
| Create premium final | FLUX.2 Max | Product, campaign, editorial final | 2K / 2048 square | 20 credits plus reference MP surcharge |
| Text/logo/design | GPT Image 2 or Ideogram 3.0 | Text in image, labels, poster, logo-ish work | GPT variable / Ideogram 1K | 12-24 credits by live quote |
| Design/vector specialist | Recraft V4 | Graphic assets, icons, vector-like design | 1K | 10 credits |
| Internal preview | Qwen-Image-2512 / FLUX.2 Klein | Preview, draft, non-final checks | 1024-1536 | 4-8 credits or bundled preview policy |
| Hold | FLUX.2 Flex / Signature | Old internal Signature lane | 2K | enterprise/manual only |

## Candidate Economics

The recommended credit numbers assume `Recommended launch Pro` at `$29 / 1200 credits`, merchant-of-record/payment-provider fees, and a reserve. Final implementation should use live provider quote whenever the provider returns exact cost.

| Model | Source cost anchor | Recommended credit | Stress credit | Decision |
| --- | ---: | ---: | ---: | --- |
| GPT Image 2 | from `$0.006` at 1024 plus token-sensitive pricing | 12 | 24 | use for text-heavy/image-faithful jobs with live quote |
| Nano Banana | `$0.039` 1K class | 10 | 10 | use for quick chat image/edit |
| Nano Banana 2 | `$0.10255` 2K / `$0.15295` 4K | 20 | 28 | default paid all-rounder |
| Grok Imagine Image Pro | `$0.07` image / `$0.072` edit | 16 | 16 | photoreal/cinematic route |
| Wan 2.7 Image Pro | `$0.075` | 16 | 20 | multi-reference/edit route |
| FLUX.2 Max | `$0.07` first MP + `$0.03` extra MP + `$0.03` reference MP | 20 | 32 | premium final, dynamic surcharge required |
| Seedream 4.5 | `$0.04` for 2K and 4K | 12 | 14 | strong hidden engine for multi-ref/high-res economics |
| Ideogram 3.0 | `$0.06` 1K | 14 | 14 | text/poster specialist |
| Recraft V4 | `$0.04` 1K | 10 | 10 | design/vector specialist |
| Recraft V4 Pro | about `$0.25` | 34 | 34 | explicit specialist only |
| Qwen-Image-2512 | `$0.0051` per 1024 square class | 8 | 8 | internal/cheap draft |
| FLUX.2 Klein | `$0.00078` per 1024 square class | 4 | 4 | preview only |

## Credit Engine Contract

The backend should not implement one flat image price. Use this shape:

```text
credit_hold =
  model_base_credits
  + resolution_surcharge
  + reference_surcharge
  + output_count_multiplier
  + live_quote_adjustment_when_available
```

Operational rules:

- Do not charge the user for failed final output.
- Keep a platform reserve for retry/provider failure cost.
- If live provider cost would put the request below target margin, require more credits, downshift resolution, or ask for confirmation.
- One prompt that asks for four outputs should cost roughly four outputs, not one.
- Chat may discuss for free within plan message limits, but chat image generation consumes image credits.

## Launch Price Reading

The safer launch set from the finance workbook is:

| Package | Price | Credits | Reason |
| --- | ---: | ---: | --- |
| Creator | `$12` | 400 | simple entry plan |
| Pro | `$29` | 1200 | safer floor for premium usage |
| Small Pack | `$10` | 200 | healthier than sub-$10 pack after fixed payment fee |
| Large Pack | `$29` | 800 | healthier burst/spike absorber |

If future discounts lower the effective Pro revenue per credit, premium and chat image generation need stricter dynamic holds, not a generous flat price.

## Source Workbook

- Finance workbook: `temp/codex-finance-model/outputs/studio-finance-2026-05-02/omnia_studio_finance_model.xlsx`

## External Sources Checked

- Runware GPT Image 2: https://runware.ai/docs/models/openai-gpt-image-2
- Runware Nano Banana 2: https://runware.ai/docs/models/google-nano-banana-2
- Runware Grok Imagine Image Pro: https://runware.ai/docs/models/xai-grok-imagine-image-pro
- Runware Wan2.7 Image Pro: https://runware.ai/docs/models/alibaba-wan2-7-image-pro
- Runware Seedream 4.5: https://runware.ai/docs/models/bytedance-seedream-4-5
- Runware FLUX.2 Max: https://runware.ai/docs/models/bfl-flux-2-max
- Runware Ideogram 3.0: https://runware.ai/docs/models/ideogram-3-0
- Runware Recraft V4: https://runware.ai/docs/models/recraft-v4
- Google Gemini API pricing: https://ai.google.dev/gemini-api/docs/pricing
