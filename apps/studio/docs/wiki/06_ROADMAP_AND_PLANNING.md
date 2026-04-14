# Roadmap And Planning

## Planning Philosophy

Studio should now be planned around launch doctrine and current-build proof, not endless sprint renaming.

Each planning step should answer:
- what product contract is being tightened
- what launch blocker is being reduced
- what server-authoritative truth is being exposed
- what proof is still missing on the current build

## Active Track

### Controlled Public Paid Launch

Sequence:
- `catalog truth`
- `surface completion`
- `provider truth`
- `proof sync`

Purpose:
- ship Studio as a paid global product without pretending resilience that does not exist yet
- keep `Create` and `Chat` under one commercial contract
- keep pricing, entitlement, and usage truth server-authored
- preserve protected-beta closure while moving the product story forward

## Near-Term Order

### 1. Catalog Truth

- keep public plans and top-up packaging server-authoritative
- use stable package ids: `starter`, `pro`, `top_up`
- keep exact price and credit amounts in backend/catalog truth, not hardcoded UI copy
- make Billing the canonical user-facing place to read current commercial truth

### 2. Surface Completion

- keep `Create -> result -> library/project -> share` stable
- keep `Chat -> in-chat generation -> create handoff -> result persistence` stable
- ensure Chat and Create feel like one product with two surfaces, not two unrelated apps
- keep degraded and blocked states honest in user-facing copy

### 3. Provider Truth

- treat `OpenAI` as the current launch-grade primary lane
- only promote backup or secondary providers when they are truly proven
- do not let optional provider config masquerade as resilience
- keep `provider_mix`, `image_public_paid_usage`, and `provider_economics` visible until they are actually closed

### 4. Proof Sync

- keep `version.json`, release ledger, and maintenance map on the same build
- keep local verify, provider smoke, and staging verify aligned to that build
- preserve `closure_ready=true` for the protected-beta baseline while public-paid gates remain explicit

## Market And Pricing Direction

Official pricing snapshot checked on `2026-04-14`:
- [Midjourney Plans](https://docs.midjourney.com/docs/plans): `Basic $10`, `Standard $30`, `Pro $60`, `Mega $120`
- [Adobe Firefly Plans](https://www.adobe.com/products/firefly/plans.html): entry paid starts around `Standard $9.99`, then `Pro $19.99`, then higher enterprise-style tiers
- [Ideogram Pricing Guide](https://ideogram.ai/help/articles/ideogram-pricing-guide): `Plus $20`, `Pro $60`, team pricing above that, with credit top-ups
- [Runway Pricing](https://runwayml.com/pricing): `Standard $15`, `Pro $35`, `Unlimited $95` before annual discounts
- [Leonardo Pricing](https://leonardo.ai/pricing): entry paid starts around `Apprentice $12`, then `Artisan $30`, then `Maestro $60`
- [Krea Pricing](https://www.krea.ai/pricing): `Basic $10`, `Pro $35`, `Max $105` before annual discounts
- [OpenAI API Pricing](https://openai.com/api/pricing/): current official source for Studio's OpenAI-first chat and image economics

Implications for Studio:
- do not compete on `unlimited generations`
- do not compete on `cheapest prompt box`
- compete on premium execution continuity and product trust
- keep top-ups as the main shock absorber for spiky premium image usage
- treat `Pro $18` as an aggressive launch price, not a forever assumption

Current economics reading:
- current `Pro` positioning is below many serious creator tiers in the market
- current top-up pricing is materially stronger than the monthly plan on a per-credit basis
- current `Starter` package only makes sense if it stays draft-limited, tightly bounded, or is converted into a paid entry offer later
- if higher-cost final OpenAI lanes become the default for broader traffic, package math should be re-signed before scale

Recommended next commercial decisions:
1. decide whether `Starter` is a truly free draft-only funnel or a low-cost paid entry plan
2. keep `Pro` as the main `Chat + Create` paid contract for launch
3. use top-ups, not fake unlimited promises, to absorb premium render demand
4. do not close `provider_economics` until the current-build dossier and founder signoff match the real launch defaults

Recommended next product/engineering order:
1. make lane-quality and cost truth more visible before submit
2. keep premium/final usage explicitly gated by plan, credits, or both
3. finish `Chat -> in-chat generation -> create handoff -> result persistence`
4. close current-build economics truth honestly instead of smoothing it over in copy

## What Not To Do

- do not open new top-level Studio surfaces in this wave
- do not build OCOS inside Studio scope
- do not turn public-launch planning into a fake enterprise theater story
- do not hide provider weakness behind vague premium copy
- do not let frontend packaging drift away from backend catalog truth

## Historical Note

The older sprint chain and `Protected Beta Hardening` work still matter as history.

Use them for:
- understanding why Studio hardened the way it did
- reading old operator and backend decisions
- tracing closure-proof logic

Do not use them as the current product planning language.

## Rules

1. Prefer one current truth source over several overlapping summaries.
2. Public product copy should speak in launch terms, not stale protected-beta framing.
3. If a blocker depends on provider or economics truth, keep it explicit rather than smoothing it over in docs.
4. A passing test shard is not enough on its own; build and operator proof still matter.
5. `Create + Chat` stay together as the launch-critical Studio surface until public paid exit is stronger.

## Backlog Shape

### Before Public Paid Exit

- commercial catalog truth
- Create and Chat launch chain completion
- honest provider and economics truth
- current-build proof sync

### After Public Paid Exit

- broader resilience promotion
- richer commercial packaging
- deeper analytics and operator workflows

### Later

- wider modality expansion
- more advanced collaboration
- future OCOS integration points outside current Studio scope
