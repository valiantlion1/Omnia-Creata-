# AGENTS.md - OmniaCreata Studio

## Product identity
OmniaCreata Studio is not a generic AI toy.

It is a premium-feeling creative product with two intentional surfaces:
- `Create` = deterministic image generation surface
- `Chat` = premium multimodal creative copilot

Do not collapse Studio into:
- a generic chatbot
- a random prompt playground
- a provider demo shell
- a UI redesign exercise

Keep the product feeling:
- premium
- controlled
- consistent
- safe

## Non-negotiable product rules
1. `Create` and `Chat` remain distinct surfaces unless explicitly redirected by the user.
2. Backend stability beats feature sprawl.
3. Security, ownership, billing, and runtime behavior are server-authoritative.
4. Free users may be constrained, but must not receive humiliatingly bad product quality.
5. Degraded/fallback behavior must be explicit in backend metadata, never silent magic.
6. Do not redesign the UI unless the user explicitly asks for UI work.

## Current architecture priorities
Completed backend hardening sprints:
- Sprint 1: runtime durability
- Sprint 2: provider routing and quality policy
- Sprint 3: billing, credits, entitlement reconciliation
- Sprint 4: security, ownership, abuse hardening
- Sprint 5: production persistence and data authority
- Sprint 6: premium chat backbone
- Sprint 7: live provider verification and launch hardening

Current next major priority:
- The broad end-to-end review is complete.
- Sprint 8 is now active: deployment and always-on environments.
- Do not drift back into random feature work before the deployment/staging/runtime shape is materially stronger.
- Sprint 6 is complete, but its chat-quality guardrails remain active and should not be eroded by later changes.
- Sprint 7 is complete, but its launch-readiness and smoke-reporting surfaces should be kept honest; do not treat them as vanity status panels.
- Sprint 8 should prefer stable deployment/runtime truth over extra feature surface area; protected staging, real topology, and honest readiness matter more now than another speculative capability spike.
- Keep chat provider health visible and avoid hammering broken premium lanes; degraded chat should fail fast and observably when upstream providers are misconfigured or rate-limited.
- When extending premium chat providers, prefer optional lanes that preserve current defaults and verify the live API shape against official provider documentation before wiring them into Studio.
- When improving chat quality, prefer conversation-aware continuity over one-off cleverness; short follow-up turns should inherit prior generation/edit intent when that makes Studio feel more like a real creative copilot.
- When follow-up refinements target an existing edit/generation direction, preserve the prior blueprint fields that define execution quality (`workflow`, `model`, `size`, `steps`, `cfg`, `output_count`, `reference_mode`) unless the new turn explicitly changes them.
- When premium providers are down, heuristic chat fallback must still feel directional and useful; prefer profile-aware next-pass guidance over generic “provider unavailable” filler.
- When Chat opens Create, preserve assistant-authored execution metadata beyond the main prompt whenever possible, especially `negative_prompt` and any available reference asset linkage for edit/image-guided flows.
- If Chat marks a Create handoff as reference-required, never let Create silently run without that reference; fail loudly and keep the workflow honest.
- For Sprint 6 follow-up edit/image-guided suggestions, do not assume the immediate parent turn still carries the source image; recover the nearest relevant earlier visual user turn before treating the handoff as reference-less.
- For Sprint 6 continuity, prefer carrying `reference_asset_id` forward inside backend-authored `generation_bridge` metadata itself; frontend conversation walking should reinforce that, not replace it.
- For Sprint 6 premium follow-up turns, do not rely on raw chat history alone; inject a concise continuity summary into the live model prompt so short refinement requests stay anchored to the locked visual plan.
- For Sprint 6 premium provider calls, do not dump a flat last-10 message window by default; prefer a compact relevant-history slice that preserves the active visual bridge and linked reference turn.
- For Sprint 6 premium provider history, do not trust visible assistant prose by itself when a turn already carries `generation_bridge`; append a compact visual-plan summary so workflow/model/aspect/reference constraints survive into the live prompt.
- For Sprint 6 direct visual execution from Chat, do not default straight to generic frontend generation settings if the assistant already returned a `generation_bridge`; prefer the backend-authored blueprint for prompt, model, format, and reference requirements.
- For Sprint 6 Chat auto-run behavior, do not trust frontend regex alone after the assistant response exists; prefer backend-authored assistant metadata and `generation_bridge` when deciding whether a turn should actually start visual execution.
- For Sprint 6 reference-guided visual execution inside Chat, do not throw away the latest successful in-chat visual result; if the current assistant blueprint still expects a source image, try the latest conversation visual output as a fallback reference before failing.
- For Sprint 6 in-chat visual presentation, do not show generic placeholder model or aspect-ratio labels once the real execution metadata exists; preserve the backend-authored run details through polling and lightbox display.
- For Sprint 6 follow-up continuity, preserve the creative direction itself as compact memory in addition to workflow/model/reference locks; short refinement turns should still know what established visual idea they are sharpening.
- For Sprint 6 follow-up continuity, preserve prior negative-prompt guardrails as well; short refinement turns must not quietly drop earlier protection clauses that were part of the execution-quality contract.
- For Sprint 6 live provider prompting, surface those preserved negative/exclusion guardrails inside the compact continuity context too; blueprint memory alone is not enough if the active model call still sees a blank safety lane.
- For Sprint 7 launch hardening, prefer explicit blocked/warning/pass checks over vague “healthy enough” prose; if launch confidence depends on auth config, smoke freshness, logs, runtime topology, or provider lanes, expose that directly.

- For Sprint 8 deployment work, prefer protected staging topology and stable always-on behavior over local hot-reload convenience. If a script is used for logon/startup, stable mode should be the default and hot reload should be explicit.
- For Sprint 8 review-driven cleanup, do not leave deprecated local-owner or ComfyUI assumptions sounding active in docs or env examples once the runtime no longer supports them.
- For Sprint 8 local operator tooling, prefer explicit readiness checks and a verify script over blind process spawning; if local always-on claims success, backend build, backend health, and frontend shell should all be proven.
- For Sprint 8 local runtime shape, stable mode should prefer a built frontend preview over a hot-reload dev server. Hot reload is for active coding only.
- For Sprint 8 local startup, do not accept a stale backend `bootBuild` after a build bump; stable startup should force one clean backend restart before leaving local verify to fail on an old process.
- For Sprint 8 protected staging work, do not trust `.env.staging` by inspection alone; use deployment preflight to validate public URL, durable store, web/worker split, and required secrets before compose boot.
- For Sprint 8 launch-readiness truth, keep the latest local startup verification report outside the repo under the runtime root and surface it through owner health detail; operator confidence should come from durable reports, not only terminal memory.
- For Sprint 8 log visibility, expose an honest runtime-log snapshot from health detail and keep those logs external; do not drag operational log artifacts back into git.
- For Sprint 8 protected staging bring-up, prefer bounded operator scripts over ad-hoc shell command memory; preflight, compose up, and post-deploy verify should be runnable as a repeatable loop.
- If protected staging bring-up fails before verify can run, do not let that blocker live only in terminal output; persist an external blocked report under the runtime root so Sprint 8 environment blockers remain visible to later operators.
- If protected staging verify itself cannot reach the deployed stack or owner detail cleanly, overwrite the external deployment report with a blocked truth instead of leaving an older success or warning report behind.
- On Windows, protected staging startup should also detect the standard Docker Desktop install path and prepend it to the current process PATH; a fresh Docker install must not look â€œmissingâ€ or lose its credential helper only because the current shell is stale.
- Dockerized Studio web builds must also copy the root `version.json` manifest into the container build context; otherwise staging build/footer truth breaks even when local web builds pass.
- Deployment-facing Python requirement pins must be real publishable versions on Linux, not just whatever happened to exist in a local dev environment. If Docker build fails on `pip install`, treat the pinned version itself as suspect before blaming Docker.
- Deployment-facing Python requirements must also cover direct runtime imports, not only what the local machine already happens to have installed. If a container crashes on `ModuleNotFoundError`, treat the missing package as a requirements truth bug first.
- Sprint 8 protected staging should not keep its runtime truth trapped inside an isolated Docker volume; bind-mount an external host runtime root into `/runtime` so deployment reports and runtime logs can round-trip into owner health detail from the same outside-repo operator path.
- Sprint 8 protected staging verify should default to the host-reachable forwarded URL for local Docker proofs unless the operator explicitly overrides it; do not force the official closure loop to depend on the public staging DNS target already resolving from the same machine.
- For Sprint 8 deployment verification, allow an optional owner bearer token so the operator can inspect `/v1/healthz/detail` honestly, but keep the script usable without that token by reporting a warning instead of pretending the owner-only checks passed.
- For Sprint 8 operator truth, do not let deployment verification reports stop at the terminal; if a protected deploy verify run writes an external report, owner health detail and launch readiness should be able to reflect that report when they share the same runtime root.
- For Sprint 8 closure runs, an owner-token staging verify should enforce `closure_ready=true` as a real gate instead of treating it like a soft note; warnings are only acceptable when the operator intentionally skips closure enforcement.
- For Sprint 8 closure, do not treat a passing local verify as sufficient; the sprint only closes once protected staging verification is run with owner detail and the resulting deployment report says `closure_ready=true`.
- For operator-facing Sprint 8+ truth, keep a single explicit `launch_gate` visible in owner health detail. It should answer four things without extra interpretation: protected-launch safe or not, blocking reasons, warning reasons, and the last verified build.
- When protected staging verification sees that explicit `launch_gate`, prefer it over reconstructing closure truth from raw readiness checks. Closure logic should follow the same operator contract humans see in owner health detail.
- Silent fake image success is not acceptable in Studio. Demo image fallback must stay explicit opt-in only; if real providers are unavailable, fail honestly instead of returning the colorful demo mock as if it were a real generation.
- Legacy demo placeholder outputs must not survive as normal library/share/post assets on truthful surfaces. If a stored asset is marked `provider=demo`, hide it from user-facing galleries and shares instead of presenting it like a real completed render.
- When an in-chat image run fails, prefer a blurred blocked-state card over a bare text-only error. It should feel intentional and premium, but it must still make clear that no real final image exists.
- Bug sweeps must verify real behavior, not only accepted requests. A `202 queued` generation is not “working” unless a real image arrives, and a planned provider label is not the truth if another provider actually failed later in the run.

## Version and build discipline
Every meaningful Studio change must update all of the following:
- `apps/studio/version.json`
- `apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md`
- `apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md`

Rules:
- Keep `version` aligned with product maturity.
- Bump `build` for every meaningful Studio change in `YYYY.MM.DD.NN` format.
- Treat missing build bumps as a process bug.
- The visible footer version/build in the app must continue to reflect `version.json`.
- Backend `/v1/version` must also reflect the current manifest truth instead of freezing stale build metadata at startup.
- Runtime and error logs must live outside the repo; prefer `%LOCALAPPDATA%\OmniaCreata\Studio\logs` on Windows.

Current UI sources that expose version/build:
- `apps/studio/web/src/lib/appVersion.ts`
- `apps/studio/web/src/components/StudioPrimitives.tsx`
- `apps/studio/web/src/components/StudioShell.tsx`

## Auth and login regression rules
If you touch auth, session, login, logout, bootstrap, or `/auth/me`, you must verify:
- backend auth path still works
- frontend does not falsely log users out on transient failures
- local snapshot fallback does not mask real expired-session failures forever

Minimum verification after auth-related work:
- `python -m pytest -q`
- `npm run type-check`
- `npm run build`
- browser check of:
  - `/login`
  - Google OAuth return path completes and does not silently bounce back to idle `/login`
  - successful signed-in navigation to a protected route
  - footer still showing current version/build

## Backend safety rules
When changing backend behavior:
- do not bypass repository/service boundaries casually
- do not weaken moderation or ownership checks
- do not let revoked/deleted/public/share scope checks drift apart
- do not silently change billing semantics without updating tests and ledger

## Source-of-truth files
Use these first when orienting:
- `apps/studio/docs/wiki/README.md`
- `apps/studio/version.json`
- `apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md`
- `apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md`
- `apps/studio/backend/studio_platform/service.py`
- `apps/studio/backend/studio_platform/router.py`
- `apps/studio/backend/tests/`

## Done criteria
A Studio task is not done because code changed.

A Studio task is done only if:
- the main flow works
- tests are updated or verified
- version/build bookkeeping is updated
- user-visible regressions are checked when relevant
- the change does not quietly undermine product consistency
