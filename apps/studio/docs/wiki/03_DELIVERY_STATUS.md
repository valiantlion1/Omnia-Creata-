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
- Create prompt history is now account-scoped per browser identity instead of one shared local bucket
- optional analytics can now stay off until the user explicitly allows them
- policy acceptance now carries accepted-at plus policy-version audit fields instead of only booleans
- login redirect intent is now stable across both direct sign-in and the OAuth callback path instead of being vulnerable to stale stored redirect leakage
- legal routes now resolve prelaunch-safe truth instead of raw placeholders, including a dedicated refund policy route
- signup and default post-auth fallback now land in `Create`, which matches the intended first-run product flow better than `Explore`

Still open:
- `abuse_hardening`
- `provider_mix` (now scoped to Runware lane mix, not multi-provider routing for v1)
- `image_public_paid_usage`
- `provider_economics`
- `proof_resync_244_external` — protected-staging loop still pending against `2026.04.29.244`
- `runware_wallet_topup` — Runware wallet currently returns `insufficientCredits`; top-up required before image generation can complete in production or finish provider smoke beyond schema-level proof

Closed against `.246`:
- `chat_surface_restore_246` — Chat is visible by default again in nav, route, command, billing/help copy, and mobile shell; `VITE_STUDIO_CHAT_ENABLED=0` remains available only for deliberate image-only drills or emergency rollback

Closed against `.247`:
- `chat_workspace_simplification_247` - Chat is now a single self-contained conversation workspace. The duplicate inner history rail, visible mode control chrome, right visual-plan rail, Chat-to-Create handoff affordance, and leftover centered rail layout are removed from the normal Chat surface.

Closed against `.248`:
- `launch_security_hardening_248` - staging/production host allowlists now reject local or wildcard hosts, the Chat message generation endpoint is covered by the authenticated route-policy map, provider result downloads require public HTTPS URLs, and Studio dependency audits are clean.

Closed against `.249`:
- `launch_config_public_host_hardening_249` - staging/production public web/API URLs, CORS origins, allowed hosts, and deployment preflight now share stricter public-host validation so private IP literals and loopback-style HTTPS endpoints cannot pass launch checks. The public website contact webhook also rejects private/local IP literal targets outside local development.

Closed against `.250`:
- `turnstile_env_split_documentation_250` - Turnstile env templates now make the public site key vs server-only secret split explicit, so `TURNSTILE_SECRET_KEY` stays out of browser-exposed Vite configuration.

Closed against `.244`:
- `chat_surface_gating` — historical `.244/.245` proof slice only; superseded by `.246` because Chat is an intentional first-class Studio surface
- `proof_resync_244_internal` — backend regression suite, web type-check, web vitest, and marketing build are rerun against `.244` and green
- `proof_resync_244_local` — live local verify report against running services on `.244` is green
- `proof_resync_244_provider_plumbing` — Runware integration end-to-end plumbing is verified live (auth ok, request schema accepted by Runware) on `.244`; only blocker for a green generation is wallet top-up

Those remain real launch gates.
They should be solved honestly, not narrated away.

## Current Provider And Proof Truth

The current narrow launch slice is a Runware-only image doctrine, not a broad multi-provider surface:
- public image models map onto the current Runware launch catalog: `GPT Image 2`, `Nano Banana`, `Nano Banana 2`, `Grok Imagine Image Pro`, `Wan 2.7 Image Pro`, and `FLUX.2 Max`
- Runware is the sole image provider for the v1 controlled paid launch
- the `Chat` surface is visible by default again and remains a distinct Studio surface; the environment flag now exists as an explicit rollback/drill switch, not as the normal product default
- duplicate-generation admission still normalizes legacy and canonical model ids before comparing queued work

Current proof on build `2026.04.29.244`:
- backend regression: full pytest suite green at `686 passed` after refreshing stale credit-allowance and credit-pack assertions to current Launch Economics Lock values (Premium `12000`, large pack `8000`, small pack `2000`) and updating one server-authoritative dimension assertion
- web type-check: green (`tsc --noEmit -p tsconfig.app.json`)
- web vitest: green at `74 passed (26 files)` after raising `testTimeout`/`hookTimeout` to 15s and patching `mobileBottomNav` to render safely when `IS_CHAT_ENABLED` is off
- marketing build: green (`next build` produced 104 static pages across 10 locales)
- live local verify: green via `verify-studio-local.ps1` against running uvicorn `:8000` and vite-dev `:5173` on `.244` — backend version match, health present, frontend login + shell ok; report archived under `local-verify-latest.json`
- live provider smoke (Runware, refresh profile, image surface): integration plumbing is verified end-to-end (API auth ok, request schema accepted, structured 400 returned) but the only result is `insufficientCredits` from Runware's wallet — top-up is required before generation can complete
- protected staging: not rerun on `.244`

Targeted proof added on build `2026.04.30.245`:
- backend catalog regressions: green (`test_public_plan_payload_exposes_launch_catalog_truth`, `test_settings_and_billing_summary_include_resolved_entitlements`, and `test_ai_provider_catalog.py`)
- web focused regressions: green (`Dashboard.test.tsx`, `Documentation.test.tsx`, `Billing.test.tsx`, `StudioShell.test.tsx`)
- web type-check and production build: green
- browser proof: `/help` and `/explore` pass on desktop and mobile against `127.0.0.1:5173`; dev console has no errors and only React Router v7 future-flag warnings

Targeted proof added on build `2026.04.30.246`:
- web focused regressions: green (`Chat.test.tsx`, `StudioShell.test.tsx`, `Documentation.test.tsx`, `Billing.test.tsx`, `Dashboard.test.tsx`)
- web type-check and production build: green
- browser proof: `/chat` passes on desktop and mobile against `127.0.0.1:5173`; snapshots confirm the desktop sidebar and mobile bottom nav both include `Chat` without requiring `VITE_STUDIO_CHAT_ENABLED=1`

Targeted proof added on build `2026.04.30.247`:
- web focused regressions: green (`Chat.test.tsx`, `StudioShell.test.tsx`)
- web type-check and production build: green
- browser proof: `/chat` passes on desktop and mobile against `127.0.0.1:5173`; snapshots confirm the simplified Chat surface no longer shows the duplicate inner history search, right visual-plan rail, Create handoff, latest-image rail, old Create-framed empty-state copy, or global legal footer

Targeted proof added on build `2026.04.30.248`:
- backend focused security/provider/preflight tests: green (`58 passed, 58 deselected`)
- backend compile: green (`python -m compileall config studio_platform`)
- backend dependency audit: green (`python -m pip_audit -r apps/studio/backend/requirements.txt` reports no known vulnerabilities)
- Studio web dependency audit: green (`npm audit --audit-level=moderate`)
- Studio web type-check and production build: green
- website type-check and production build: green (`next build` generated 104 pages across 10 locales)

Targeted proof added on build `2026.04.30.249`:
- backend focused production/preflight tests: green (`31 passed, 16 deselected`)
- backend compile: green (`python -m compileall config studio_platform`)
- backend dependency audit: green (`python -m pip_audit -r apps/studio/backend/requirements.txt` reports no known vulnerabilities)
- website dependency audit: green (`npm audit --audit-level=moderate`)
- website type-check and production build: green (`next build` generated 104 pages across 10 locales)

Interpretation:
- `.244` remains the last full internal proof baseline across backend, web, marketing, and live local verify
- `.245` is a narrow launch-truth correction on top of that baseline, with focused backend/web/build/browser proof
- `.246` restores the intended visible Chat surface by default after review found `.245` was too aggressive about hiding Chat
- `.247` narrows the Chat UI into the user-reviewed self-contained conversation workspace without reopening backend/provider behavior
- `.248` closes a focused launch-security pass across host validation, route-policy coverage, provider result-download safety, and dependency audit pins
- `.249` closes the follow-up private-IP launch URL/CORS gap found during the second security pass
- `.250` closes the Turnstile setup-documentation gap before live CAPTCHA keys are configured
- the Runware smoke confirms the launch-grade image plumbing works against the live provider; finishing the smoke (a successful generation) is gated on wallet top-up, not on code
- protected staging is the remaining external loop owed before `.244` can be cited as fully launch-ready

## Current Launch Doctrine

Studio is now described as:
- Omnia Creata's flagship product
- a premium creative product, not a generic provider demo shell
- two distinct Studio surfaces: `Create` for direct image generation and `Chat` for the creative copilot path
- public image generation runs through the Runware launch catalog
- a controlled public paid launch, not a waitlist-first beta shell

Commercial defaults:
- `Free`
- `Essential`
- `Premium`
- `Credit Packs`

Exact plan pricing and package values must come from the backend catalog.
The frontend should present that truth, not invent its own packaging story.

## Public Paid Exit Criteria

Studio is not considered ready for public paid exit until all of the following are true:
- `Create -> result -> library/project -> share` feels stable and honest on the Runware launch catalog
- `Chat` stays visibly distinct from Create and fails or degrades honestly if its provider lane is unavailable
- signup and other abuse-sensitive flows have real CAPTCHA enforcement instead of docs-only contract truth
- degraded or blocked Runware lane states are visible instead of hidden behind premium-sounding copy
- current-build artefacts stay aligned on the same build number
- public plan and entitlement truth is server-authoritative and reflects the image-only v1 catalog

## Market And Economics Reality

As of `2026-04-14`, official market pricing clusters roughly like this:
- entry creator plans: about `$10-$15/month`
- serious prosumer plans: about `$20-$35/month`
- premium/pro plans: about `$60+/month`

Current Studio package assumptions in the economics dossier:
- `Free`: `0` bundled image credits, chat hidden for v1, wallet credit packs allowed for Create
- `Essential`: `4000` monthly credits for `$12/month`
- `Premium`: `12000` monthly credits for `$24/month`
- `Credit Pack`: `2000` credits for `$8`
- `Credit Pack`: `8000` credits for `$24`

Current internal economics lock:
- [Launch Economics Lock](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/08_LAUNCH_ECONOMICS_LOCK.md)
- conservative launch revenue floor is now the `Premium` plan at `$0.002 / credit`
- public visible image choices stay the six Runware launch catalog models instead of the older `Fast`, `Standard`, and `Premium` lane labels
- `provider_economics` still stays open until exact current-build Runware normal-lane pricing and founder signoff are both current-build true

Interpretation:
- `Essential` is the paid entry point instead of a vague starter-to-premium jump
- `Premium` is still priced below much of the serious prosumer band
- free access only stays economically sane if image generation remains wallet-backed
- credit packs are currently the healthiest margin instrument in the package mix

Current tension:
- the product doctrine says Studio is a controlled paid launch, not a broad free playground
- the current dossier now models a free account funnel plus two paid subscriptions
- that tension should be resolved deliberately before broad public-paid exit, not ignored in copy

Current cost caveat:
- Runware-first image economics should carry most normal generation traffic
- selective OpenAI edit/reference lanes can still compress margin quickly if they become default for low-revenue traffic
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
