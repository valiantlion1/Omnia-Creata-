# Studio Release Ledger

`apps/studio/version.json` is the single source of truth for the current Studio app build.

Use this ledger for human-readable release history:
- what changed
- why it changed
- when it shipped
- which build carried it

## Rules

- Every meaningful Studio release or internal build promotion updates `apps/studio/version.json`.
- Every build change gets a matching entry here.
- Semver-like app version tracks product maturity.
- `build` tracks the concrete shipped snapshot in `YYYY.MM.DD.NN` format.
- Backend API compatibility can evolve separately; current API version is exposed from `/v1/version`.

## Current Build

### `0.6.0-alpha` / build `2026.04.19.160`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.159` closed a real signed-session Settings regression, but Studio still had two launch-facing truth gaps: moderation on image prompts was too blunt for normal adult fashion/glamour requests, and the current build bookkeeping was lagging behind what the backend and web gates could actually prove.
- What:
  `.160` replaces the old one-note image prompt blocking with a layered moderation path. Explicit sexual content, minor sexualization, and exploitative abuse still hard-stop, but reviewable adult-adjacent requests such as swimwear, lingerie styling, sensual editorial framing, cleavage-focused styling, or clothing-color edits now flow through a stricter review lane instead of being auto-killed at Studio's own gate. Generation jobs now persist the moderation tier/reason, provider execution can forward provider-aware moderation hints, public posts can be reported, moderation appeals and owner-side moderation case queues now exist, owner health exposes moderation summary counts, and provider truth now publishes an explicit `engine_matrix` that marks launch lanes as `required`, `optional`, or `disabled`.
  Verification on `.160` is now source-and-runtime honest. From `apps/studio/backend`, targeted pytest slices covering moderation cases, provider truth, launch readiness, owner health spine, router moderation routes, and the earlier moderation/security/provider suites pass. From `apps/studio/web`, `npm run type-check`, `npm run build`, and `npm run test:ci -- src/pages/__tests__/Dashboard.test.tsx src/pages/__tests__/Documentation.test.tsx` pass. Runtime proof was refreshed too: `ops/start-studio-local.ps1` rebuilt the local stack and wrote a passing `.160` `local-verify-latest.json`; live provider smoke refreshed on `.160` and kept the real blocker visible (`runware` fails with `insufficientCredits`, `fal` is not configured in this environment, while `openrouter` and `openai` chat probes pass); protected staging rebuilt and verified on `.160`, but without an owner bearer token that staging report remains `warning` with `closure_ready=false`.

### `0.6.0-alpha` / build `2026.04.19.159`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.158` kept Studio's premium image doctrine honest, but the rebuilt signed-session account/security pass immediately exposed one narrower live UX break on mobile-height settings surfaces: the `Credentials` and `Active sessions` dialogs were still vertically centered even when their content exceeded the viewport, which pushed the title and close affordance above the visible screen in a real signed-in browser session.
- What:
  `.159` makes those two Settings security dialogs behave like the already-compacted profile editor. On narrow viewports the overlays now anchor from the top with viewport-bounded panel height plus internal scrolling, so the header, close control, and first actionable content stay reachable instead of rendering above the viewport. No account-surface redesign was needed; the same signed-session wave also rechecked `/account` featured-artwork state plus the inline signed-in sidebar footer shortcuts on the current build.
  Verification on `.159` is frontend-scoped and live-session honest. Studio web targeted `Settings` tests pass, including a new modal-shell regression assertion for the top-anchored mobile layout. A real signed-in Playwright pass on build `.159` confirms `/settings` `Credentials`, `Active sessions`, and the compact profile editor on desktop plus narrow viewport, and confirms the signed-in `/account` footer shortcuts still navigate correctly. The current signed account had `0` published items, so there was no live featured-artwork lightbox opening path to verify in this session. Studio web `type-check` and production `build` are still blocked by an unrelated existing syntax error in `src/pages/MediaLibrary.tsx`.

### `0.6.0-alpha` / build `2026.04.19.158`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.157` restored backend regression truth, but the image-lane doctrine still had one obvious gap: `Premium` was marketed like the flagship lane while the actual canonical model still pointed at `FLUX.2 Pro`. With `Fast` already modernized to `FLUX.2 [klein] 9B` and `Standard` already moved to `Qwen-Image-2512`, leaving `Premium` on the older `Pro` lane meant Studio's public image ladder still stopped short of the strongest premium Runware path we could reasonably justify.
- What:
  `.158` promotes the public `Premium` lane to `FLUX.2 [max]`. The canonical premium model id now resolves to `flux-2-max`, older `flux-2-pro` plus legacy premium aliases still normalize forward for compatibility, Runware premium AIR ids now target `bfl:7@1`, and backend premium cost estimation now follows the official `$0.07` first-megapixel plus `$0.03` per extra-megapixel basis. The launch-economics lock also stops being vague about the image matrix: `Runware` remains the shared primary execution provider, `fal` is the managed secondary only when configured and current-build proven, and `OpenAI image` plus fallback-only providers remain explicitly outside the normal public launch-grade path.
  Verification on `.158` is targeted backend proof. Provider routing/pricing tests, provider-truth tests, generation-pricing tests, and backend spine tests pass from `apps/studio/backend`. This wave did not re-run local verify, provider smoke, or protected staging, so runtime proof outside targeted backend tests still belongs to the last fresh environment artifact set.

### `0.6.0-alpha` / build `2026.04.19.157`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.156` moved the public `Standard` lane onto `Qwen-Image-2512`, but PR #8 had also left one explicit backend-only follow-up undone: rerun the broad Studio backend regression pass after the auth-hardening and active `studio_platform/*` wave settled. When that backend sweep was finally rerun from the correct `apps/studio/backend` workspace, it exposed a smaller but real cluster of fallout around wallet-backed managed-lane previews, explicit OpenAI image QA routing, and one brittle identity-deletion assertion that was checking a stale in-memory object instead of persisted store truth.
- What:
  `.157` closes that deferred backend regression sweep with the smallest backend/test changes needed to make the suite honest again. Wallet-backed free accounts now stay on managed lanes when those lanes are actually available, but still fall back to the development zero-cost route when managed lanes are absent. Explicit premium-QA-capable OpenAI image providers are again represented in the paid and wallet-backed preview/forecast paths without reopening the default development cost-safe OpenAI lane as a normal routing target. The identity-deletion regression now asserts against saved snapshot state, which is where the cleanup truth actually lives.
  Verification on `.157` is backend-only and full-coverage. A monolithic `python -m pytest -q` run from `apps/studio/backend` still exceeded the single-process timeout window, so the full backend suite was rerun there as four pytest shards and all of them passed: `test_service_regressions.py` (`85 passed`), `test_router_security.py + test_launch_readiness.py` (`95 passed`), `test_billing_ops.py + test_providers.py + test_llm_gateway.py + test_router_generation.py + test_chat_ops.py` (`142 passed`), and the remaining backend modules (`219 passed`). That gives current backend proof of `541 passed` on `.157` without falsely claiming a one-shot monolithic pass that did not complete in time.

### `0.6.0-alpha` / build `2026.04.19.156`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.155` finished the lingering billing-honesty contract, but the public `Standard` image lane was still mapped to `FLUX.2 Dev`. That left Studio's current model doctrine in an awkward spot: `Fast` was intentionally cheap and modern, `Premium` was already positioned as the hero lane, yet `Standard` still leaned on a more prototype/research-flavored default that was pricier than needed for everyday output.
- What:
  `.156` moves the public `Standard` lane to `Qwen-Image-2512`. The canonical Studio model id now resolves to `qwen-image-2512`, legacy `flux-2-dev` and `sdxl-base` names still normalize forward for compatibility, Runware text/reference AIR ids now point at Alibaba's Qwen image route, and the backend's fallback economics dossier plus launch-economics lock all use the cheaper `$0.0051` anchor instead of the older `$0.0096` FLUX Dev basis. This wave also explicitly locks the lane-topology doctrine in product docs: one real primary per lane, secondary only when launch-grade, backup lanes treated as resilience rather than equal public promises.
  Verification on `.156` is targeted backend proof. Provider routing/pricing tests, provider-truth tests, generation-pricing tests, and backend spine tests pass from `apps/studio/backend`. This wave did not re-run local verify, provider smoke, or protected staging, so current runtime proof outside targeted backend tests still belongs to the last fresh environment artifact set.

### `0.6.0-alpha` / build `2026.04.19.155`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.154` improved the public Explore gallery, but the older `.143` billing-honesty contract was still leaking back through the API layer. Even though the current UI no longer rendered plan resolution promises, shared auth/billing/public-plan payloads plus the web fixtures still carried `max_resolution`, which meant unfinished capability claims could quietly re-enter the product through mocks, types, or future UI reuse.
- What:
  `.155` finishes that contract at the backend and fixture boundary. Public-facing Studio plan payloads no longer expose `max_resolution` on `/v1/auth/me`, `/v1/billing/summary`, or `/v1/public/plans`, and the internal usage-cap serializer no longer carries it either. The shared Studio web plan typings were tightened to match the slimmer API contract, and the billing/settings/account fixtures plus MSW handlers were cleaned so automated coverage stops rehearsing a promise the product intentionally does not make.
  Verification on `.155` is targeted and explicit. Backend pytest passes for public-plan payload truth, auth-me payload truth, and the settings-plus-billing-summary regression slice. Studio web targeted Billing/Settings/Account tests pass, `type-check` passes, and production `build` passes. This wave did not require a fresh browser smoke because it changes the contract and fixtures behind already-honest UI surfaces rather than the rendered billing/settings layout itself.

### `0.6.0-alpha` / build `2026.04.19.154`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.153` cleaned up Help and the manual, but Explore's `Showcase` shelf still felt too mechanical. The layout was technically using a masonry-style wall already, yet because every square asset was being pushed through a simple modulo-based crop pattern, the result still read like a bland tile dump instead of a curated public gallery.
- What:
  `.154` turns `Showcase` into a deliberately curated aspect-ratio wall. Each featured reference now carries an editorial display profile (`hero`, `landscape`, `portrait`, `soft portrait`, or `detail`) plus a crop focus so the gallery can present the same square source set with more natural rhythm. The old column-based modulo layout is gone; `Showcase` now uses a denser responsive editorial grid with larger hero pieces, calmer supporting tiles, and accessible open actions for every image.
  Verification on `.154` is targeted and explicit. A new Dashboard regression test passes, Studio web `type-check` passes, production `build` passes, and public browser smoke on `/explore` confirms the Showcase tab now renders a varied aspect-ratio wall instead of a rigid equal-tile arrangement. This wave was browser-smoked on the public Explore route only, not through the user's live signed-in IAB session.

### `0.6.0-alpha` / build `2026.04.19.153`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.152` fixed the oversized Settings edit modal, but Help and the long-form Studio manual were still visually over-designed for their job. The manual in particular kept presenting almost every chunk of content as a rounded card, which made a serious documentation surface feel more like a dashboard mosaic than something users could actually sit and read for a while.
- What:
  `.153` strips that documentation surface back into something calmer and more honest. The dead `Shortcuts` section is removed from the manual navigation, the old `Operate the app` group is replaced by `Tips & hints`, and both Help plus `/learn/*` now render as flatter article-style sections instead of card piles. The sidebar grouping is simpler, examples read more like editorial callouts than product cards, and the overall page now leans into long-form documentation instead of trying to decorate every paragraph.
  Verification on `.153` is targeted and explicit. The Documentation regression suite passes, Studio web `type-check` passes, production `build` passes, and public browser smoke on `/help#publishing` plus `/learn/publishing` confirms that `Shortcuts` no longer appears in the manual navigation while `Tips & hints` does. This wave was browser-smoked on public routes only, not through the user's live signed-in IAB session.

### `0.6.0-alpha` / build `2026.04.19.152`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.151` stabilized the signed-in shell footer, but the Settings profile editor still looked inflated and awkward in real use. The dialog relied on multiple oversized cards and a tall split layout, so on shorter laptop-height screens it read less like a focused edit surface and more like a blown-up sheet that barely fit inside the viewport.
- What:
  `.152` compacts the Settings profile editor into a denser, cleaner modal. The oversized left summary card is smaller, the editable fields and privacy defaults now live inside one tighter main form card, and the dialog itself respects viewport height with internal scrolling instead of forcing the whole sheet to feel too tall. The action model stays the same: users still edit display name, bio, and default visibility from the same modal, but the surface now fits the job better and reads more like a real account editor than a stack of giant tiles.
  Verification on `.152` is targeted and explicit. The Settings regression suite passes, Studio web `type-check` passes, and production `build` passes. This auth-gated `/settings` edit modal was not browser-smoked through the user's live signed-in IAB session in this wave, so final signed-session behavior remains source/test/build-verified rather than live signed-session browser-verified.

### `0.6.0-alpha` / build `2026.04.19.151`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.150` improved the Account surface itself, but the signed-in shell footer could still expose an ugly floating shortcut cluster near the profile row. The content looked clipped, redundant, and visually disconnected from the rest of the sidebar, especially on the Account route where it read more like a broken overflow panel than a deliberate control.
- What:
  `.151` removes that awkward floating-footer behavior and keeps the sidebar footer stable. The lower profile area is now treated as a single controlled identity block, with any needed signed-in shortcuts rendered inline under the profile name instead of leaking out as a detached panel. The footer also now clips unexpected overflow, which keeps the sidebar composition cleaner on dense screens while preserving the existing main nav and sign-out affordance.
  Verification on `.151` is targeted and explicit. StudioShell regression coverage now includes the signed-in footer shortcut layout as well as the guest Settings login-intent rule. Studio web `type-check` passes and production `build` passes. This signed-in shell behavior was not browser-smoked through the user's live IAB session in this wave, so final signed-session behavior remains source/test/build-verified rather than live signed-session browser-verified.

### `0.6.0-alpha` / build `2026.04.19.150`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.149` cleaned up the duplicate Settings button in the shell, but the signed-in `Account` surface still felt unfinished. The hero area could go visually empty, the left profile slab did not communicate a useful editing model, and gallery cards on the page did not open through the shared lightbox even though users reasonably expect account artwork to be previewable there.
- What:
  `.150` turns `Account` into a more coherent creator profile surface. Users can now choose one of their own Studio renders as featured profile artwork, which fills the header with a real piece instead of leaving an abstract empty band. The profile column was rebuilt into calmer, more useful setup surfaces, and gallery cards now open through the shared lightbox so image preview behavior matches the rest of Studio without introducing a second modal system. The profile API contract now persists a selected featured asset, and help copy was updated so the shell is honest about what can be edited today.
  Verification on `.150` is targeted and explicit. Backend regression coverage now includes the featured-asset profile update flow and the self-service profile route contract. Frontend Account tests cover choosing profile artwork and opening gallery work in the shared lightbox. Studio web `type-check` passes and production `build` passes. This auth-gated `/account` surface was not browser-smoked through the user's live signed-in IAB session in this wave, so final signed-session behavior remains source/test/build-verified rather than live signed-session browser-verified.

### `0.6.0-alpha` / build `2026.04.19.149`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.148` fixed the dead Favorites shelf, but the signed-in shell still had an obvious navigation blemish: `Settings` rendered as both the normal row and a second trailing gear shortcut in the expanded sidebar, which made the lower utility rail feel inconsistent and visually noisy compared with the rest of the shell.
- What:
  `.149` simplifies that rail back to one clean `Settings` entry. The expanded sidebar no longer shows a duplicate open-settings gear; instead, the row behaves like a normal nav item again. Guest routing stays honest by sending the Settings nav through the existing login intent instead of exposing a dead duplicate shortcut. Targeted StudioShell regression coverage was updated for the new single-item behavior, and Studio web `type-check` plus production `build` pass on this build.
  This sidebar fix was not browser-smoked through the user's live signed-in IAB session in this wave, so the verification level remains source/test/build-verified rather than live signed-session browser-verified.

### `0.6.0-alpha` / build `2026.04.19.148`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.147` cleaned up failed-generation noise in `My images`, but `Library -> Favorites` was still an obvious broken surface. The route existed in the shell, yet it never queried the actual like data and always collapsed to a static empty state, which meant users could press the heart on public work and then find nothing when they opened the page that was supposed to collect those saved references.
- What:
  `.148` turns Favorites into a real library shelf. Studio now exposes a dedicated authenticated favorites endpoint backed by liked public posts, and the `Favorites` route renders those saved references in both grid and list modes with search, open-preview behavior, prompt reuse, creator navigation, and remove-from-favorites actions that actually work. The new preview flow is also honest about ownership: it keeps useful reference actions while avoiding owner-only controls like moving, deleting, or changing visibility on content that belongs to someone else.
  Verification on `.148` is targeted and explicit. Backend regression coverage now includes liked-post listing and the new favorites route rate-limit contract. Frontend MediaLibrary tests cover the Favorites shelf plus grid/list and remove actions. Studio web `type-check` passes and production `build` passes. This auth-gated `/library/likes` surface was not browser-smoked through the user's live signed-in IAB session in this wave, so final signed-session behavior remains source/test/build-verified rather than live signed-session browser-verified.

### `0.6.0-alpha` / build `2026.04.19.147`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.146` improved Chat feedback, but the image library still handled failed generations in a noisy and slightly dishonest way. Unrendered jobs were showing up directly in the main image surface with loud `FAILED` copy and a text CTA, even though the product already had a dedicated `Processing` lane. At the same time, the backend already released reserved credits on non-success outcomes, but the shell was not surfacing that truth clearly when a generation died because of moderation or provider/runtime failure.
- What:
  `.147` moves failed and safety-blocked generation jobs into the `Processing` lane and gives them calmer, more useful controls: retry is now icon-only, failed processing jobs can be removed directly from the lane, and the main `All` gallery is no longer interrupted by unrendered placeholders. The same wave also adds passive bottom notifications that explain whether a generation was stopped by safety review or by a provider/system issue, and those notices explicitly communicate credit return when the held credits were released. Backend-side, generation payloads now expose `error_code`, safety-like provider rejects are classified more honestly, and failed unrendered jobs can be deleted through a dedicated generation delete path without touching completed assets.
  Verification on `.147` is targeted but multi-layer. Backend tests pass for safety-block credit release, failed-generation deletion, generation error-code serialization, and the generation delete route. Frontend MediaLibrary regression tests pass, web `type-check` passes, and production `build` passes. This auth-gated `/library/images` flow was not browser-smoked through the user's live signed-in IAB session in this wave, so final signed-session behavior remains source/test/build-verified rather than live signed-session browser-verified.

### `0.6.0-alpha` / build `2026.04.19.146`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.145` made Styles honest and reusable, but the Chat surface still had one obvious interaction gap during live use: after sending a message, the conversation could sit visually still until the assistant response landed. The send button spinner helped a little, but it did not place that waiting state inside the conversation itself, so the product felt more inert than a premium copilot surface should.
- What:
  `.146` adds an in-thread assistant reply placeholder to Chat. While Studio is waiting on a message response, the timeline now shows a calm animated typing bubble with moving dots, so users get immediate conversational feedback in the same area where the answer will appear. The existing post-response text reveal remains intact; this wave specifically fills the silent gap before the assistant message arrives.
  Verification on `.146` is frontend-scoped and explicit. A targeted `ChatBubble` test now covers the reply placeholder, Studio web `type-check` passes, and production `build` passes. The auth-gated `/chat` surface was not browser-smoked through the user's live signed-in IAB session in this wave, so final in-app behavior is source/test/build-verified rather than live signed-session browser-verified.

### `0.6.0-alpha` / build `2026.04.19.145`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.144` fixed the Settings profile-editing route hop, but `Elements > Styles` was still underselling itself and partly behaving like a dressed-up prompt note list. The page copy implied reusable looks, yet the actual save path from Create mostly captured raw prompt text, `My Styles` did not expose real edit or removal controls, and the difference between “use this as a full preset” versus “only add the text direction” was not obvious enough for a product surface that already looked finished.
- What:
  `.145` turns Styles into a real reusable preset shelf. Styles saved from Create and Project history now persist more than prompt text: they can carry negative prompt guardrails plus preferred model, aspect ratio, steps, guidance, and variation defaults. `Elements > My Styles` now presents that truth more explicitly, lets users reopen Create with the full saved preset or inject only the text direction, and adds an in-place style editor with removal flow so saved styles are actually manageable from the same surface that advertises them.
  Verification on `.145` is targeted and honest. Backend style-service and router-security tests pass for the new blueprint/edit/delete contract, frontend `Elements` tests pass, and Studio web `type-check` plus production `build` were rerun on the new build. This auth-gated `/elements/styles` surface was not browser-smoked through a real signed-in Playwright session in this wave, so final UI behavior remains source/test/build-verified rather than live signed-session browser-verified.

### `0.6.0-alpha` / build `2026.04.19.144`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.143` tightened billing honesty, but the top-level Settings account card still had one UX seam that felt obviously wrong in use. `Edit Profile` looked like it should open editable fields right there, yet it navigated away to `/account`, while the actual in-shell edit capability was hiding under `Privacy & Security > Credentials` behind copy that mixed profile editing and sign-in management together.
- What:
  `.144` is a narrow Settings navigation and profile-editing wave. The main `Edit Profile` action in General Account now opens a real in-place profile editor lightbox with editable display name, bio, and default visibility plus a top-right save action. At the same time, the old Credentials dialog has been narrowed to what it actually owns: sign-in provider review and password management. That keeps profile editing in the account surface where users expect it and makes the security surface read more honestly.
  Verification on `.144` is frontend-scoped and explicit: targeted Settings tests pass, Studio web `type-check` passes, and production `build` passes. This auth-gated Settings flow was not browser-smoked through a real signed-in Playwright session in this wave, so final UI behavior is test/build-verified rather than live session browser-verified.

### `0.6.0-alpha` / build `2026.04.19.143`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.142` improved several major frontend surfaces, but the subscription catalog was still promising more specificity than the current product contract could safely support. Plan cards and comparison copy were exposing concrete render resolutions even though Studio's real output story still depends on provider-native limits, future upscale policy, and whether dedicated post-processing lanes become part of the shipped offering.
- What:
  `.143` is a narrow billing-honesty wave. Subscription cards now advertise recurring credits without appending `up to ...` resolution promises, and the public comparison table no longer presents `Max resolution` as if that were a settled launch guarantee. The same pass also aligns local mock/test catalog copy with that tighter contract so demo and regression surfaces stop reintroducing resolution marketing language that the real product is intentionally avoiding for now.
  Verification on `.143` is intentionally frontend-scoped: Studio web `type-check` passes, the targeted Billing page test passes, production `build` passes, and a browser smoke on `/subscription` confirms the plan grid no longer shows concrete resolution labels.

### `0.6.0-alpha` / build `2026.04.19.142`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.141` made the Settings security area real, but several high-visibility frontend surfaces still read like unfinished product scaffolding. `Projects` did not explain its job well, its top-right action was too opaque, the shell rail toggle looked alive but could lose pointer capture at the edge, and Help had grown into one long mixed document that was trying to be public onboarding, account FAQ, legal orientation, and deep product manual all at once. The signup consent copy also still linked outward in a thin inline way instead of opening a readable contract surface where a user could actually inspect the policies.
- What:
  `.142` is the frontend clarity and documentation split wave. `Library -> Projects` now behaves much more like `My images`: users get richer grid and list cards, a clearer project purpose, real create/edit/continue/export actions, and empty states that point back into Create instead of leaving the surface ambiguous. Help is now split into a public `Help center` and a separate long-form `Studio manual` route, with sticky navigation on the public side and route-based deep guides for prompt craft, workflows, publishing, shortcuts, and troubleshooting. Signup now opens Terms, Privacy, and Acceptable Use inside a centered embedded legal reader with a document-style layout, while embedded legal routes intentionally bypass the Studio shell so the modal reads like a standalone agreement instead of a mini app inside an iframe.
  The same wave also tightens shell feel and operator truth. The desktop sidebar edge toggle now has a more reliable hover/reveal pattern and no longer loses clickability behind main content. Verification on `.142` is frontend-focused and honest: targeted Documentation, Legal, Signup, and StudioShell tests pass, Studio web `type-check` passes, production `build` passes, and Playwright browser smoke confirms the public `/help`, `/learn/prompt-craft`, and `/signup` flows plus the embedded legal reader and sidebar collapse interaction. Auth-gated `/library/projects` was not browser-smoked with a signed-in session from Playwright, so the live render of that protected surface remains source/test/build-verified rather than session-level browser-verified in this wave.

### `0.6.0-alpha` / build `2026.04.19.141`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.140` made `Credentials` real, but the next row down in the same security area was still an obvious fake. `Active Sessions` looked like a user security feature while only repeating that session management was unavailable, which meant Settings was still overstating what Studio could help users review after sign-in. The product story also needed a cleaner explanation for why browser storage and recent-access data exist at all: not for vague analytics theater, but for keeping sessions secure and giving users an understandable device-review surface.
- What:
  `.141` turns that row into a real account-security surface. Studio now records recent account access snapshots keyed to the current auth session, carries that session truth through `/v1/auth/me` and `/v1/settings/bootstrap`, and exposes a user-facing `Active sessions` dialog in Settings that shows the current device, recent browsers or installed-app sessions, when they were last active, and the network or host label we can safely show. The shell can now keep the current device active while signing out other Studio sessions, and the Help/account copy was updated so the account surface describes the new behavior honestly instead of talking like the feature does not exist yet.
  Verification on `.141` is targeted to the changed account/session contract. Backend spine, router-security, and service-regression tests now cover `active_sessions` in bootstrap plus the new sign-out-others path; Settings frontend tests cover the recent-device dialog and the sign-out-others action; Studio web `type-check` and production `build` were rerun on the new build. Full environment-level local/provider/staging proof has not been rerun on `.141`, so the last live runtime artefacts still belong to `.137` until that proof loop is refreshed.

### `0.6.0-alpha` / build `2026.04.19.140`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.139` had already tightened development-side image routing, but Settings was still carrying one obvious fake account surface: `Credentials` looked like a real privacy/security control while actually doing nothing. The same seam also exposed a deeper truth bug behind the placeholder. Studio could save a new display name, but a later auth refresh could still pull older sign-in metadata back over it, which made the profile story feel shakier than the UI suggested.
- What:
  `.140` turns that Settings area into a real account-management surface. `Credentials` now opens a live `Profile and sign-in` dialog that keeps the public `@username` immutable, allows the visible display name to change, and makes the active sign-in provider explicit instead of hiding behind a generic pill. Email/password accounts can now update their password directly from Settings, while Google and other OAuth accounts are handled honestly as provider-managed credentials with the right guidance instead of a dead row.
  The backend truth moved with the UI. `/v1/auth/me` now carries provider context into the frontend payload, display-name updates are filtered through the deterministic moderation layer, and existing identities no longer let incoming auth metadata quietly overwrite a locked username or the locally chosen display name during refresh. Targeted backend regressions and frontend Settings tests were added for the new source-of-truth behavior and the provider-aware credentials flow. Live local/provider/staging runtime artefacts have not been rerun on `.140`, so the last environment-level proof still belongs to `.137`.

### `0.6.0-alpha` / build `2026.04.19.139`
- Date: `2026-04-19`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.138` moved Studio onto the right modern model doctrine, but local development still had one expensive and frustrating operator seam: the new `Fast` lane would keep aiming at billable Runware-first traffic even on a machine where Runware credits were not actually funded yet. In practice that meant local testing could burn time hitting a provider that was expected to fail before Studio fell back, which is the opposite of what a tight cash-safe development loop should feel like.
- What:
  `.139` is a narrow development safety wave for `Fast`. In local/development only, `Fast` text-to-image now prefers zero-cost standard fallback lanes first and records that honestly as `development_zero_cost_fast_route`, so route previews, created jobs, and health metadata all say the same thing. This does not rewrite the real launch doctrine: outside development, Studio still treats Runware FLUX.2 as the normal public image path.
  Verification on `.139` is backend-contract scoped and intentionally modest. Targeted provider-routing regressions, service regressions for wallet-backed free plus zero-cost fast routing, generation-pricing regressions, and backend spine contract tests all pass on the new build. Live local verify, provider smoke, and protected staging have not been rerun on `.139`, so the last runtime proof artefacts still belong to `.137`.

### `0.6.0-alpha` / build `2026.04.18.138`
- Date: `2026-04-18`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.137` had the public surface and current proof story in a healthier place, but the actual provider doctrine was still split across legacy catalog ids, OpenAI-image-era docs, and a Runware mapping layer that mostly collapsed old Studio model names onto one generic AIR id. That left the user-facing quality ladder looking more modern than the backend truth really was, and it also left one quiet admission bug in place: a stored legacy job and a new canonical request could slip past duplicate-generation protection because their model ids no longer compared equal.
- What:
  `.138` is the provider-doctrine realignment wave. Studio image routing now treats Runware as the normal public image path and maps the public `Fast / Standard / Premium / Signature` ladder onto the modern FLUX.2 family: `flux-2-klein`, `flux-2-dev`, `flux-2-pro`, and `flux-2-flex`. OpenAI image remains available only as a targeted QA lane instead of a normal launch route, while chat env defaults and docs now point at an intentionally cheaper `OpenRouter primary + OpenAI fallback` stack with the tighter Studio-only role prompt. The same wave also closes a real backend regression: duplicate-generation admission now normalizes legacy and canonical model ids before comparing queued work, so older stored jobs cannot bypass duplicate protection after the catalog rename.
  Current-build verification on `.138` is code-and-build scoped, not overstated runtime proof. Targeted backend suites for generation pricing, chat ops, backend spine, prompt engineering, AI provider catalog, provider routing, router generation, generation runtime, and the touched service-regression slices all pass. Studio web `type-check` and production `build` also pass. The last live local/provider/staging artefacts have not been rerun after the `.138` bump yet, so `.138` does not claim refreshed smoke or staging proof.

### `0.6.0-alpha` / build `2026.04.18.137`
- Date: `2026-04-18`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.136` had already cleaned up the highest-visibility launch seams and tightened secret hydration, but a few last-mile polish details still lived outside that proof pass. Billing and legal copy could still read too much like an environment note, the legal placeholder resolver needed a cleaner founder-operated disclosure contract, and the proof chain itself needed to be refreshed again so the current build was not riding on `.136` artefacts. The provider loop also needed one more honest refresh after staging/runtime env hydration so we could stop talking about the older all-green snapshot and say which image backup lane is actually healthy right now.
- What:
  `.137` is a narrow launch-surface and truth-refresh wave. Billing copy now reads like a controlled opening instead of an environment warning, the shared legal shell now uses a cleaner `Operating disclosure` block, and legal placeholders resolve to honest launch-safe founder-operated wording without leaving raw placeholder values behind. The current-build proof loop also moved again: local verify passes on `.137`, protected staging now boots and verifies the `.137` build at warning level, and current provider smoke has been refreshed on `.137` from the hydrated effective env.
  That refreshed provider proof matters because it changed the active risk picture. OpenAI chat and image lanes are healthy, OpenRouter chat remains healthy, Gemini and Fal are still simply unconfigured in this environment, but the Runware managed-secondary image lane is now failing with `insufficientCredits`. So `.137` is technically stronger on launch surface and staging truth, but it also makes one real business/runtime blocker more explicit: if you want a trustworthy managed image backup lane, Runware credits need to be restored or the backup doctrine needs to be changed on purpose.

### `0.6.0-alpha` / build `2026.04.18.136`
- Date: `2026-04-18`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.135` had the protected-staging runtime loop back in a truthful place, but the launch surface still had a few high-visibility seams that made Studio feel more like a working internal product than a polished public one. The login Google CTA was visually underweighted, mobile Settings tabs clipped, empty profiles dead-ended, and public/signed-in footers still leaked build metadata. At the same time, env examples and operator scripts were still slightly behind the active provider doctrine and did not hydrate billing/owner secret families as completely as the current launch lane now needs.
- What:
  `.136` is a narrow launch-polish plus operator-secret-hydration wave. Login now uses a full-width `Continue with Google` CTA, public and shell footers no longer expose version/build copy, mobile Settings tabs use compact labels that fit cleanly, empty profile galleries now route back into `Create`, and checkout-unavailable copy is calmer and more production-toned. On the operator side, `.env.platform.example` and `backend/.env.example` now default to the current OpenAI-primary chat lane, while staging/runtime helpers and local startup import Supabase, Paddle, and owner/admin secret families from Windows user environment variables so repo env files can stay placeholder-only.
  Current-build proof on `.136` is intentionally web/operator scoped only. Studio web `type-check` passes, production `build` passes, backend `tests/test_deployment_verification.py` passes with `18 passed`, and browser smoke was refreshed on the new login surface, mobile Settings, and desktop Profile empty-state flow. Provider smoke and protected staging have not been rerun since the `.136` build bump, so the latest provider/staging artefacts still belong to `.135`.

### `0.6.0-alpha` / build `2026.04.18.135`
- Date: `2026-04-18`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.134` had already cleared the local proof path, but protected staging was still failing one step too early for the wrong reasons. Once Docker was running, the backend container healthcheck and the local forwarded staging URL were both still vulnerable to TrustedHost drift, and the worker was inheriting an HTTP healthcheck that only made sense for the API image default command, not for `generation_worker.py`.
- What:
  `.135` turns that staging proof loop into an honest runtime check instead of a host-header trap. The staging helper now expands `ALLOWED_HOSTS` to include the local forwarded proof hosts plus the configured staging hosts, backend container healthchecks now use `localhost` against `/v1/healthz`, and the worker no longer inherits a broken HTTP healthcheck from the shared backend image.
  Current-build proof is refreshed on `.135`: local verify passes, current-build provider smoke is green with `ok=5`, `skipped=2`, `error=0`, and protected staging now boots and verifies successfully at warning level instead of failing on environment bring-up. Closure-grade staging is still not claimed on `.135` because the latest verify run was advisory-only without an owner bearer token, so `closure_ready` remains pending that owner-token rerun.

### `0.6.0-alpha` / build `2026.04.18.134`
- Date: `2026-04-18`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.133` already aligned source shell metadata and deployment verification around the current `Omnia Creata Studio` shell name, but the local PowerShell readiness loop was still stricter than the backend verifier. That meant the same class of naming drift could still reappear locally if the login shell title/body changed whitespace again without changing the actual brand.
- What:
  `.134` closes that last proof-path seam. `start-studio-local.ps1` and `verify-studio-local.ps1` now normalize the Studio shell name before checking `/login`, so local startup and local verify follow the same brand-tolerant contract as deployment verification instead of depending on one exact spacing form.
  Current-build proof is refreshed on `.134`: the local always-on stack was restarted onto `.134`, `/v1/version` now reports both `build=.134` and `bootBuild=.134`, local verify passes, and current-build provider smoke is green again with `ok=5`, `skipped=2`, `error=0` across chat plus image surfaces. Protected staging was rerun from the same build too, but it still reports `blocked` because Docker engine is not running on this machine, so `.134` still does not claim closure-grade staging proof.

### `0.6.0-alpha` / build `2026.04.18.133`
- Date: `2026-04-18`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.132` fixed the first local shell-string blocker, but the source shell metadata and protected deployment verification were still split across older and current brand spellings. That left a smaller naming drift between the login shell HTML and the deployment-side proof logic, which meant current-build verification could still fail on spacing drift instead of real runtime truth.
- What:
  `.133` aligns the public login shell metadata and deployment verification around the current `Omnia Creata Studio` brand form. `web/index.html` now emits the current shell title, and deployment verification normalizes login-shell title/body checks so protected deploy proofs no longer depend on one exact spacing form.
  Current-build proof was refreshed on `.133` too: local verify passed, current-build provider smoke was green with `ok=5`, `skipped=2`, `error=0`, and protected staging remained `blocked` because Docker engine was not running. `.134` immediately followed to bring the same normalization rule into the local PowerShell readiness path as well.

### `0.6.0-alpha` / build `2026.04.18.132`
- Date: `2026-04-18`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.131` closed the public SEO/crawl gap, but the first proof-refresh attempt immediately exposed a smaller operator-truth drift: local startup and local verify were still checking for the older `OmniaCreata Studio` shell string even though the live login shell now renders `Omnia Creata Studio`. That meant current-build proof could stay blocked on an outdated shell assumption instead of the actual app state.
- What:
  `.132` is a narrow local-ops truth sync. The local startup readiness probe and `verify-studio-local.ps1` now match the current Studio shell branding, so local proof can fail on real runtime problems instead of stale string matching. This keeps the current-build local proof loop aligned with the actual login shell while staying inside the same launch-readiness hardening track.
  Current-build proof on `.132` is partially refreshed in this wave. The local always-on stack was restarted, backend `bootBuild` is now `.132`, local verify passes on the refreshed shell contract, and current-build provider smoke is green again on `.132` with `ok=5`, `skipped=2`, `error=0` across chat plus image surfaces. Protected staging was rerun from the same build too, but it still reports `blocked` because Docker engine is not running on this machine, so `.132` does not claim closure-grade staging proof.

### `0.6.0-alpha` / build `2026.04.18.131`
- Date: `2026-04-18`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.130` tightened Help honesty, but the public launch-readiness surface still had a discoverability gap that would matter immediately outside the product shell: route-level metadata was still effectively generic at initial HTML time, crawl endpoints were missing, and guest Settings still behaved more like a blunt redirect than an intentional public-shell handoff.
- What:
  `.131` is a narrow crawl, metadata, and shell-honesty wave. Studio web now has one canonical SEO map for the key public routes, builds route-specific `index.html` variants for those public paths, emits real `robots.txt` plus `sitemap.xml`, and marks alias routes such as `/privacy` and `/billing` as canonicalized `noindex,follow` surfaces instead of letting them look like first-class duplicates.
  The client-side head contract is tighter on this build too. Public pages now keep title, description, canonical, Open Graph, Twitter, and robots tags aligned through the shared SEO map without duplicating `Omnia Creata Studio` in document titles, and the guest shell now treats `Settings` more honestly by opening an in-shell public-access panel while sending explicit open-intent through `/login?next=%2Fsettings` rather than pretending guest Settings is directly available.
  Current-build proof on `.131` is intentionally web-scoped only: focused Studio web regressions pass with `4 passed`, `npm run type-check` passes, production `npm run build` passes, generated `dist` output now includes route-specific public HTML files plus `robots.txt` and `sitemap.xml`, and slash-suffixed preview checks confirm `/help/`, `/legal/privacy/`, and `/privacy/` emit the expected title/canonical/robots combinations. Local verify, provider smoke, and protected staging reports have not been rerun on `.131` yet.

### `0.6.0-alpha` / build `2026.04.18.130`
- Date: `2026-04-18`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.129` tightened consent honesty, but the Help surface still had two kinds of drift that would be user-facing immediately: account/help guidance was promising controls the current shell does not actually expose yet, and Help was carrying long-form policy text even though Studio now ships separate canonical `/legal/*` pages. The same surface also lost too much of its secondary navigation once the viewport dropped below the large desktop breakpoint.
- What:
  `.130` is a narrow help-surface honesty and scanability wave. The Help center now aligns account guidance with the current shell truth: password resets point back to the login flow, active sessions and notification controls are described honestly as not fully exposed in-shell yet, exports now point to the real project-menu and Settings archive paths, and free-account / wallet copy is closer to the current billing contract.
  The legal/help split is also cleaner on this build. Terms, Privacy, and Usage sections inside Help are now short orientation summaries with direct links to the dedicated `/legal/*` routes instead of acting like a second full legal center, and the secondary help navigation is preserved more intentionally across responsive breakpoints with a compact mobile quick-jump strip plus a wider desktop/tablet TOC range. Focused Help regressions now lock the canonical legal links and the corrected account guidance, and current-build proof on `.130` includes those tests plus Studio web `type-check`, production `build`, and browser smoke on `/help` for both desktop and mobile shell layouts.

### `0.6.0-alpha` / build `2026.04.18.129`
- Date: `2026-04-18`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.128` made the legal/public surface more honest, but the cookie-consent contract was still incomplete in exactly the place the Cookie Policy promised otherwise. Users could make the first banner choice, yet there was no real footer or Settings control to revisit analytics consent later, and revoking consent did not have a live client path because the PostHog boundary only understood the one-time bootstrap case.
- What:
  `.129` turns that into a real product control instead of policy theater. Studio now has a shared browser-level cookie-preferences state, a reusable cookie-preferences dialog, a footer trigger, and a Settings entry so users can reopen analytics consent after the banner decision without clearing storage or waiting for a new browser session.
  The PostHog boundary now follows that saved preference live. Allowing analytics still boots PostHog only after consent, but revoking analytics now actively opts the client out and stops session recording instead of leaving the already-loaded SDK in an ambiguous state. Focused frontend regressions now cover both the footer reopen path and the live PostHog opt-in/opt-out transition, and current-build proof on `.129` includes those tests plus Studio web `type-check`, production `build`, and a browser smoke run that shows telemetry requests only after consent and no longer after revocation.

### `0.6.0-alpha` / build `2026.04.18.128`
- Date: `2026-04-18`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.127` stabilized auth intent and proof, but the Phase 1 public paid surface was still too loose in ways users would feel immediately: legal routes were partly scaffolded but still placeholder-heavy, there was no dedicated refund policy page, new accounts still defaulted into `Explore` instead of `Create`, and parts of the public pricing story still implied a looser free tier than the actual wallet-backed contract.
- What:
  `.128` is a revenue-ready surface honesty wave. Studio now has a dedicated `/legal/refunds` route, the shared legal shell resolves known placeholders into real prelaunch disclosure text, and the legal nav can point users across terms, privacy, refunds, acceptable use, and cookies without leaving raw placeholder tokens behind.
  The onboarding contract is also tighter on this build. Signup completion, Google signup bootstrap, and the default post-auth fallback now all target `Create` instead of `Explore`, which finally matches the product doctrine that new users should enter Studio through the image-making surface first. Public pricing and billing copy are also a little more honest about the current commercial truth: free accounts open the workspace and library first, while billing now links directly to the refund policy instead of leaving refund expectations implied.
  Current-build proof is now partially refreshed on `.128`: legal/auth regressions pass with `7 passed`, Studio web passes `type-check`, production `build` passes with the new refund page chunk present, `verify-studio-local.ps1` passes on `.128`, and current-build provider smoke is green again with `ok=5`, `skipped=2`, `error=0`. Protected staging still does not have current-build proof because the Docker-based staging bring-up is blocked while Docker engine is not running on this machine.

### `0.6.0-alpha` / build `2026.04.17.127`
- Date: `2026-04-17`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.126` closed prompt-history, consent, and audit-trail gaps, but Phase 1 still had a login-seam problem that could survive normal usage: a stale stored post-auth redirect from an earlier OAuth attempt could leak into a later sign-in and override the explicit `?next=` destination the user was actually trying to reach. The same auth wave also still needed a full backend suite rerun and a current-build browser proof pass before it could honestly be called stabilized.
- What:
  `.127` narrows that auth seam without opening a new feature surface. Studio now persists OAuth intent across the provider roundtrip, treats transient auth-service outages as retryable during OAuth callback sync, and clears stale stored redirect state when a direct email/password sign-in succeeds so an old OAuth target cannot hijack a later login. A new web regression test locks the explicit-`next` precedence rule, and the backend regression suite is clean again on this build.
  Current-build proof is stronger on `.127` than on `.126`. Full backend pytest now passes with `521 passed`, focused web auth tests pass with `7 passed`, Studio web still passes `type-check` and `build`, `verify-studio-local.ps1` passes on `.127`, and current-build provider smoke remains green with `ok=5`, `skipped=2`, `error=0`. Browser verification on the current build confirms the login footer now shows `.127`, email/password login reaches `/explore`, Google OAuth starts with a callback URL that preserves `?next=...`, simulated signed-in callback completion lands on `/subscription` instead of falling back to idle `/login`, and both `/billing` and `/plan` still resolve to `/subscription`. Protected staging was not rerun for `.127`; the latest protected-staging artefact is still `.125 warning` with `closure_ready=true`, so this build does not claim fresh staging proof yet.

### `0.6.0-alpha` / build `2026.04.17.126`
- Date: `2026-04-17`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.125` preserved proof truth, but Phase 1 still had three product-hardening gaps that were too visible to leave for later: Create prompt history was still shared across accounts on the same browser profile, optional analytics could still start without explicit consent, and policy acceptance was still stored as booleans without a durable audit trail that said what was accepted and when.
- What:
  `.126` hardens those launch-facing seams without opening a new feature surface. Create prompt history is now account-scoped in the browser, so a signed-in user no longer inherits another account's local prompt history just because they share the same machine profile. Optional analytics are now consent-gated too: PostHog only boots after an explicit banner choice, and declining keeps Studio on essential storage only instead of silently enabling non-essential tracking.
  The backend now records policy-acceptance audit fields server-side. Identity payloads carry accepted timestamps plus current version strings for terms, privacy, usage policy, and marketing consent, and legacy accepted records are backfilled on first refresh instead of staying as timestamp-less booleans forever. Focused auth/identity regressions, web type-check, and web build are green on this build.
  Current-build proof was refreshed where this wave actually changed behavior. `verify-studio-local.ps1` now passes on `.126`, and live provider smoke also passes on `.126` with `ok=5`, `skipped=2`, `error=0`, proving OpenRouter/OpenAI chat plus Runware and OpenAI image lanes on the current build. Protected staging was not rerun for `.126`; the latest protected-staging artefact remains `.125 warning` with `closure_ready=true`, so this build does not claim fresh staging proof until that loop is rerun.

### `0.6.0-alpha` / build `2026.04.16.125`
- Date: `2026-04-16`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  The current Studio tree remained frozen after the `.124` bookkeeping pass, but the proof chain moved again before the docs did. `.125` exists to keep the manifest and operations docs aligned with the real current-build evidence after the narrow provider-smoke drift was corrected, without opening another frontend or backend implementation wave.
- What:
  `.125` still changes only bookkeeping/proof surfaces: `version.json`, this ledger, and the maintenance map. Stable local startup plus `verify-studio-local.ps1` prove the frozen tree on build `.125` with matching backend `build`/`bootBuild`, healthy `/v1/healthz`, and a reachable Studio login shell in stable preview mode.
  Live provider smoke now passes on `.125` and is recorded from `apps/studio/deploy/.env.staging` as a current-build report with `ok=3`, `skipped=4`, `error=0`. The current successful cases prove the active OpenAI launch lane for chat plus the OpenAI draft/final image lanes, while unconfigured Fal/Runware/Gemini/OpenRouter cases remain explicitly skipped instead of being flattened into fake success.
  Protected staging is still fail-closed on `.125`. The official protected-staging report now says `status=blocked` because Docker compose bring-up failed before the stack reached a running topology, and the staging runtime artefact keeps `closure_ready=false`. This build does not claim launch-gate readiness; it only refreshes bookkeeping truth around the frozen tree and its current proof state.

### `0.6.0-alpha` / build `2026.04.16.124`
- Date: `2026-04-16`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  The current Studio tree was already frozen with a frontend cleanup wave (`.116` -> `.121`) and a backend security/hardening wave (`.118` -> `.123`), but bookkeeping and proof were still pinned to `.123`. This thread intentionally avoided new product work and used one build bump to bind the frozen tree, the release docs, and the current proof chain to the same manifest.
- What:
  `.124` changes only bookkeeping/proof surfaces: `version.json`, this ledger, and the maintenance map. Stable local startup plus `verify-studio-local.ps1` now prove the frozen tree on build `.124` with matching backend `build`/`bootBuild`, healthy `/v1/healthz`, and a reachable Studio login shell in stable preview mode.
  Live provider smoke does not pass on `.124`. The smoke CLI stops before suite initialization because `apps/studio/deploy/.env.staging` does not currently satisfy the staging contract for `PUBLIC_API_BASE_URL` (it must be a configured HTTPS non-local URL in staging/production). To keep launch/operator truth honest, the stale `.99` local smoke artefact was overwritten with a blocked `.124` report under the external runtime root instead of letting an older success soften current-build warnings.
  Protected staging proof is also fail-closed on `.124`. The official `start-studio-staging.ps1` bring-up/verify loop stops immediately because Docker engine is not running on this machine, and the staging runtime report records `status=blocked` with `closure_ready=false`. This build does not claim launch-gate readiness; it only refreshes proof honesty for the frozen tree.
### `0.6.0-alpha` / build `2026.04.16.123`
- Date: `2026-04-16`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.122` tightened owner/operator truth, but the backend still had a few launch-critical honesty gaps that were too risky to leave in place. Sensitive auth flows could still proceed in staging/production when CAPTCHA wiring was incomplete, public/share payloads still leaked internal project or identity linkage, legacy asset-delivery tokens still carried raw share scope, and some operator/public surfaces still narrated placeholder telemetry or export media truth instead of the real current-build state.
- What:
  Password signup/login now fail closed in staging and production when Studio says sensitive-flow CAPTCHA is required but Turnstile is not actually ready, and CAPTCHA verification itself now rejects missing action/hostname proof for those launch environments instead of accepting partial responses.
  Public/share serialization is also tighter on `.123`. Shared project and asset payloads now redact internal identity/workspace/project linkage fields, `/v1/shares...` responses are explicitly marked `Cache-Control: no-store, private`, and legacy share-scoped asset delivery tokens now carry only a hashed share identifier rather than the raw public share token.
  Operator/public truth got a smaller but important honesty cleanup too. Admin telemetry no longer invents a fake `blocked_injections` count, and public export cards now derive preview images from the nested public asset payload Studio actually emits today instead of pretending flat thumbnail fields still exist. Focused backend regression tests lock the new fail-closed CAPTCHA gate, the payload redaction rules, the hashed share scope, the no-store share headers, and the corrected export/operator truth.

### `0.6.0-alpha` / build `2026.04.16.122`
- Date: `2026-04-16`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.121` cleaned up stale frontend truth and re-synced runtime proof, but the remaining owner/operator backend surfaces still leaked two kinds of drift: raw exception text could spill into owner health detail when internal builders failed, and several launch-facing provider summaries still narrated the older `protected-beta` frame instead of the current controlled-launch doctrine.
- What:
  Owner-only health payloads now redact raw exception messages instead of returning `str(exc)` directly. Operators still get the section-level summary plus the exception type, but the payload now explicitly points them to runtime logs for exact failure context rather than echoing internal failure strings straight into the response body.
  The same cleanup wave also normalizes provider/operator wording around the active launch frame. Chat and image provider truth now talk about the selected launch lane or launch baseline instead of repeating `protected-beta` in summary text, and smoke-readiness wording now describes missing launch-grade image coverage without leaning on older stage names. Focused backend regression tests were updated to lock both the new redaction behavior and the new operator-facing launch wording.

### `0.6.0-alpha` / build `2026.04.16.121`
- Date: `2026-04-16`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.120` closed more security gaps, but the audit still found three product-truth problems that would age badly if left alone. The frontend API client could still fall back to `127.0.0.1` in a non-dev build, two stale orphaned pages still carried old `public beta / free credits / no credit card` language inside the repo, and a couple of internal surfaces still spoke like placeholder demos rather than honest operator tooling.
- What:
  The Studio web client now fails closed if a non-development build is missing `VITE_API_BASE_URL` instead of silently aiming at `http://127.0.0.1:8000`. That keeps broken deployment env from masquerading as a live API host and turns the problem into an explicit deployment error instead of a misleading localhost fallback.
  The repo also drops two dead public-shell leftovers: `Home.tsx` and `Splash.tsx` are gone, which removes stale `public beta`, `Free to start`, and `150 monthly credits` product drift from Studio's codebase. Media Library favorites copy is now honest about what the surface does today, and the admin analytics page no longer pretends placeholder "secure connection / injection blocked" cards are real telemetry feeds.
  This wave also cleans up one smaller auth-facing fallback: OAuth redirect URL generation no longer falls back to a localhost login URL when no browser origin exists. Local runtime proof was then re-synced so the running backend can be checked against the new current build instead of keeping an older `bootBuild` alive.

### `0.6.0-alpha` / build `2026.04.16.120`
- Date: `2026-04-16`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.119` tightened launch-shaped config and base API headers, but one privacy/security gap still remained on the browser edge: sensitive authenticated responses such as auth, billing, owner, and export payloads still lacked an explicit no-store policy, which made it easier for stale or private JSON to linger in browser or intermediary caches.
- What:
  Sensitive Studio API routes now emit `Cache-Control: no-store, private` plus `Pragma: no-cache`. This now covers the auth surface, billing summary flows, owner/operator payloads, detailed health truth, and explicit export endpoints, so session and operator-state JSON are less likely to be cached outside the live request boundary.
  The `.120` verification pass also locks that route selection explicitly in tests, so Studio now has regression coverage for both the new no-store routing logic and the actual response headers returned by the FastAPI app.

### `0.6.0-alpha` / build `2026.04.16.119`
- Date: `2026-04-16`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.118` made auth abuse-hardening real, but staging/production runtime truth could still drift in a dangerous way: API docs defaulted on outside production, launch-shaped env validation was weaker than the deployment preflight doctrine, and the API surface still lacked a few basic hardened headers for non-development environments.
- What:
  Studio config now fails closed more aggressively in staging and production. API docs default to development-only, and non-development boot now requires a real launch-shaped runtime: Supabase anon plus service-role keys, Redis, HTTPS public web/API base URLs, Postgres state authority, Supabase asset storage, and disabled demo auth/fallback paths.
  The backend API surface also got a small but meaningful header hardening pass. Non-development responses now emit HSTS, all API responses carry `Cross-Origin-Opener-Policy`, and when API docs are disabled the service returns a locked CSP for JSON/API routes instead of leaving the browser with no content policy at all.
  Sensitive routes also now fail safer at the browser/proxy layer. Auth, billing, owner, detailed health, and export-style endpoints emit `Cache-Control: no-store` plus `Pragma: no-cache`, which reduces the chance of stale or private account payloads being cached outside Studio's intended live session boundary.
  Regression coverage now locks both sides of that change: runtime settings tests prove the stricter staging/prod contract, and new API-header tests verify the current build actually emits the new CSP/HSTS behavior.

### `0.6.0-alpha` / build `2026.04.16.118`
- Date: `2026-04-16`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.117` cleaned up visible shell honesty, but one of the biggest remaining pre-Paddle blockers was still mostly aspirational: Studio said CAPTCHA was required for sensitive flows, yet password signup/login had no real verification path behind that claim. That left `abuse_hardening` as a docs-and-launch-readiness truth rather than a runtime-enforced contract, which is exactly the kind of gap that stays invisible until public auth traffic starts getting hammered.
- What:
  Studio auth is now Turnstile-ready end to end. The backend has a real CAPTCHA verifier, password signup/login requests carry an optional `captcha_token`, and when CAPTCHA enforcement is enabled the router now fails closed if the token is missing, invalid, or the Turnstile configuration itself is incomplete.
  Launch-readiness truth also got sharper. `abuse_hardening` no longer depends on a single boolean; it now distinguishes "CAPTCHA disabled" from "Turnstile enabled but site key/secret missing," which makes the blocker much more actionable for the next operator pass.
  The web auth surfaces were prepared for the same contract. Login and Signup can now render a Turnstile challenge when `VITE_TURNSTILE_SITE_KEY` is present, carry the returned token through Studio auth payloads, and reset the challenge after a failed password attempt so single-use verification does not silently poison retries.

### `0.6.0-alpha` / build `2026.04.16.117`
- Date: `2026-04-16`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.116` made first-run guidance calmer, but a quick live audit still found a few high-friction honesty gaps in the shell. The biggest one was billing: a signed-in free account could still land on the pricing surface and see `Create account` on its own current plan, while disabled credit-pack actions degraded into a vague `N/A` state instead of telling the truth about checkout readiness. A smaller copy drift also survived in Settings and Help where protected-beta language was still leaking into user-facing explanations even though Studio's active frame has already moved on.
- What:
  Billing now behaves more like a real product surface. Signed-in free accounts see their current plan correctly and get an `Open Create` path instead of a stray account-creation CTA, and when self-serve billing is not wired for the current build the page now says that directly rather than leaving people to infer it from dead buttons.
  Credit-pack actions were also cleaned up so unavailable purchase states read intentionally instead of collapsing into `N/A`. At the same time, the remaining user-facing copy drift was tightened: Settings no longer references protected-beta onboarding, and the Help FAQ now describes internal owner access without narrating the older beta frame as if it were still the public product contract.

### `0.6.0-alpha` / build `2026.04.15.116`
- Date: `2026-04-15`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.115` fixed Create naming truth and a couple of real security edges, but the signed-in first-run still felt too much like policy explanation and not enough like product guidance. Explore's welcome overlay was still teaching too many things at once, Create's onboarding block still read like a rules notice, Chat's paid lock looked more like a wall than a premium path, and Signup still told users to "enter Studio" before it showed them what the actual first move was.
- What:
  Studio's first-run web surfaces now feel calmer and more directional without changing the underlying launch doctrine. Explore points people more clearly toward Create, the empty community state now tells the truth about what to do first, and the signup surface now explains the `account -> Create -> credits/chat later` path in one compact sequence instead of broad product narration.
  Create itself also became more legible as a work surface. The first-run banner now reads like a guided handoff into the real workflow rather than a gated warning block, and the quality/format selectors now carry small structural labels so the prompt -> quality -> format -> generate chain is easier to scan.
  Chat stayed paid-only, but its locked states now present that truth with a more premium posture: guests see chat as part of paid Studio, and free signed-in users get a clearer `View Plans` path without losing the alternate `Open Create` route.

### `0.6.0-alpha` / build `2026.04.15.115`
- Date: `2026-04-15`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.114` cleaned up visible shell breakage, but Create still carried old product-language drift in exactly the place users feel quality most directly. Model choices were still narrated like creative-profile experiments instead of simple quality lanes, aspect ratios still leaked unnecessary preset semantics, and generation dimensions were still too dependent on client-supplied shape instead of one server-authoritative truth. A smaller frontend security/config drift also remained: the admin analytics page still had a production fallback to `http://127.0.0.1:8000` and did not treat auth failures as a real fail-closed redirect path.
- What:
  Create now speaks in three clear public quality choices: `Fast`, `Standard`, and `Premium`. The internal advanced image lane remains in the backend, but it no longer clutters the public Create picker, so the surface reads like one intentional product instead of a model registry.
  Aspect ratio selection is now cleaner too. The picker shows only icon-plus-ratio choices such as `1:1`, `16:9`, and `9:16`, while the backend resolves the actual width and height server-side from the selected model and ratio. That closes both a UI rough edge and an economics/safety issue where client-supplied dimensions could drift from Studio's real provider and credit truth.
  This wave also tightened two real security/config edges. Chat attachments now reject insecure `http://` remote image URLs, and the admin analytics surface no longer falls back to an insecure localhost API target in production; it now uses the same-origin/API env truth and treats 401/403 responses as explicit fail-closed redirects.

### `0.6.0-alpha` / build `2026.04.15.114`
- Date: `2026-04-15`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.113` corrected the Free Account doctrine, but the live shell still had a few rough edges that made Studio feel broken in exactly the wrong places. The `Characters` page was still hanging around even though it had already been deferred, signed-in visits to `/u/:username` were dropping out of the shell into the public router, and local image routing was still too eager to hide billable OpenAI lanes behind weaker fallback-only providers when Runware/Fal were unavailable.
- What:
  The web shell is now cleaner and more honest. `Characters` is no longer mounted in routes or sidebar navigation, and signed-in visits to other creators' profile pages now stay inside the Studio shell so sidebar navigation and account context do not disappear mid-session.
  Image routing truth also improved for the current local/provider reality. Wallet-managed and development override lanes now promote configured OpenAI image generation ahead of degraded fallback-only providers when Runware/Fal are unavailable, which gives Standard and higher-quality requests a much healthier path on current machines.
  This wave also adds a small but real auth hardening fix on the frontend: post-auth redirect targets are now sanitized to internal Studio paths only, so hostile `next=` values cannot bounce login or OAuth flows out to arbitrary external URLs.

### `0.6.0-alpha` / build `2026.04.15.113`
- Date: `2026-04-15`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.112` made the public shell feel less broken, but one important doctrine detail was still inverted in places: free accounts were still being treated like limited-chat users instead of wallet-backed Create users. That drift made onboarding, plan truth, and the chat shell feel inconsistent with the actual launch contract.
- What:
  Free-account truth now matches the intended Studio launch model. The backend catalog and public plan payload now say clearly that free accounts can enter Create with wallet credits while Studio chat remains locked to Creator and Pro.
  The web surface moved with that change: signup now lands into the Explore welcome path, Create explains the wallet-backed first-run flow more honestly, and Chat no longer pretends to be a partially available surface for free accounts.
  Studio docs and economics notes were also corrected so the current build no longer describes Free Account as a limited-chat funnel.

### `0.6.0-alpha` / build `2026.04.15.112`
- Date: `2026-04-15`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.111` kept the launch gate honest, but the public shell still felt rough in a way that looked like broken product instead of controlled rollout. Landing copy was still speaking in a `Protected Beta` voice, signed-out billing CTAs looked dead instead of routing people into account creation, and the comparison table on the pricing page contradicted the newer wallet-backed free-account doctrine.
- What:
  Landing now speaks in the current controlled-launch frame rather than the older protected-beta framing, and its primary CTA is explicit about the real free-account entry point instead of implying free bundled image usage.
  The public billing surface is also more honest for signed-out visitors: paid-plan and credit-pack actions now route to account creation instead of rendering as disabled dead ends, and the feature-comparison table now mirrors the current backend contract more closely by emphasizing bundled monthly credits, wallet packs, concurrency, resolution, sharing, clean exports, and premium chat instead of promising free bundled image generation.
  Explore's empty-state CTA now also routes guests into account creation rather than sending them straight into a login-gated create path, which reduces the "this app isn't working" feeling on an otherwise healthy local build.

### `0.6.0-alpha` / build `2026.04.15.111`
- Date: `2026-04-15`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.110` fixed a real closed-beta fail-open at the generation gate, but the controlled public paid launch pass still had one honesty gap: launch-readiness truth was not explicitly treating public abuse hardening as a blocker. Provider truth, economics truth, and staging proof were visible, yet the lack of real CAPTCHA enforcement on sensitive flows could still hide behind those greener surfaces.
- What:
  Public paid readiness now models `abuse_hardening` as its own operator-visible gate. Protected beta may still remain ready with advisory warnings, but the `public_paid_platform` phase now blocks explicitly if sensitive-flow CAPTCHA verification is not actually enabled.
  This keeps the readiness model aligned with the product doctrine: verified-account generation is now enforced at runtime, but broader self-serve public exposure still is not ready until signup and similar abuse-sensitive flows stop relying on docs-only CAPTCHA claims.
  Docs were updated to match that truth, so the AI context pack and delivery-status pages now name `abuse_hardening` alongside the existing provider and economics blockers instead of letting operators infer it from conversation history.

### `0.6.0-alpha` / build `2026.04.15.110`
- Date: `2026-04-15`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.109` aligned deploy/proof truth, but the closed paid beta hardening pass still had one real fail-open left on the runtime path: Studio told clients that verified accounts were required for generation, yet the `/v1/generations` route still allowed unverified authenticated users to submit work. That is exactly the kind of mismatch that turns a "protected beta" claim into theater.
- What:
  Studio generation submit now enforces verified-account status before moderation or job creation, so unverified accounts fail closed with an explicit `403` instead of slipping into the paid image flow. This keeps the backend contract aligned with the usage-cap payload Studio already advertised and narrows one obvious abuse path during closed beta.
  This wave also refreshed a stale security regression helper so share/public export tests reflect the current paid-share entitlement contract and the stricter ready/truthful-share rules rather than older pre-entitlement assumptions.
  The wave is intentionally honest about what it did not solve: CAPTCHA is still only represented as contract truth in payloads/docs, not as real backend verification. That remains a launch blocker for a broader public abuse posture even though the verified-generation gap is now closed.

### `0.6.0-alpha` / build `2026.04.15.109`
- Date: `2026-04-15`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.108` improved backend maintainability, but Studio's deploy/proof story still drifted from the real launch stack. The repo had a decent Docker-based protected staging loop, yet the canonical public contract had not been made concrete enough in config, env examples, owner health truth, or preflight checks for `Vercel + Render + Supabase + Redis + Paddle`.
- What:
  Studio now carries an explicit platform deploy pack alongside the protected local staging proof loop. A new [deployment_stack_ops.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/studio_platform/deployment_stack_ops.py) summarizes the locked stack, owner health detail now exposes that deployment-stack truth, and deployment preflight can validate canonical platform envs instead of only Docker-style staging inputs.
  The repo also now ships a platform env example, a Render blueprint, and a Vercel config: [deploy/.env.platform.example](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/deploy/.env.platform.example), [render.yaml](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/render.yaml), and [web/vercel.json](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/web/vercel.json). Docs now distinguish the bounded Docker proof loop from the canonical public stack, and Studio web is back to passing both `type-check` and `build` after a small dead-variable cleanup in Billing.
  This wave does not pretend launch proof is finished. What it closes is repo truth: the stack contract, env scaffolding, verification entry points, and operator payloads now describe the same deployment story. What remains blocked is external provisioning and closure-grade proof on actual Vercel/Render/Supabase/Paddle infrastructure.

### `0.6.0-alpha` / build `2026.04.15.108`
- Date: `2026-04-15`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.107` locked the economics story, but the backend spine still carried a quieter maintenance risk: `apps/studio/backend/studio_platform/service.py` had swollen past the size guard that is meant to keep Studio's orchestration layer readable and safe to evolve. The product behavior was fine, yet the shell/billing/chat/generation boundaries were being buried under a giant mixed file again.
- What:
  This wave is a stability refactor, not a product behavior change. The plan/catalog/preset/public-plan builders that define Studio's commercial and shell bootstrap contract were extracted into a dedicated [service_catalog.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/studio_platform/service_catalog.py), and [service.py](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/backend/studio_platform/service.py) now imports that contract instead of owning every static builder inline.
  That brings the backend spine back under its size target while preserving the exact shell delegation lines and runtime constructor behavior that current tests expect. The point of the change is simpler future maintenance: chat, generation, and public/share extractions now have a calmer orchestration file to grow from instead of a single blob drifting upward again.

### `0.6.0-alpha` / build `2026.04.15.107`
- Date: `2026-04-15`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.106` hardened public/share truth, but Studio still lacked one thing that matters just as much as security and provider doctrine: a canonical internal economics lock. Package shape existed, lane credits existed, and provider doctrine existed, but the actual stop-loss math, revenue floor, and burn-cap rules were still spread across code, wiki notes, and conversation memory.
- What:
  Studio now has a dedicated launch economics lock document that pins the current internal commercial table against backend truth. It records the current `Free Account / Creator / Pro / Credit Packs` package values, the `Fast / Standard / Premium` public lane contract, the managed-versus-fallback hold rules, and the conservative `Pro` revenue floor that should be used for launch-risk decisions.
  The lock also makes risk thresholds explicit instead of implied. Soft and hard variable-spend caps are now written down, OpenAI image sub-cap and spend-share thresholds are explicit, and the docs now state clearly that `OpenAI high` must not silently become the default public `Premium` lane under the current `12-credit` contract.
  This wave is documentation and operator-truth alignment, not runtime behavior change. It also cleans up lingering docs drift where a few Studio wiki entry points still described the old `Starter / Pro / Credit Top-up` story instead of the live `Free Account / Creator / Pro / Credit Packs` doctrine.

### `0.6.0-alpha` / build `2026.04.15.106`
- Date: `2026-04-15`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.105` separated active commercial truth from stale paid-plan labels, but the `Create -> result -> project/library -> share` chain still had a few public-surface holes. Studio could still carry dead project shares that were only destined to 404 later, and old public/share access could survive longer than it should when owner state or asset readiness drifted away from launch truth.
- What:
  Share creation now fails closed earlier. Project shares require at least one ready, truthful asset up front, and asset shares now trust the same `public-share eligible` rule that public retrieval uses instead of only checking a smaller blocked/deleted subset.
  Public retrieval got stricter too. Share links now die when the owner identity is missing, manually reviewed, temporarily blocked, internal-only, or no longer entitled to share because the current billing state has fallen back out of the paid contract.
  Public post surfaces also got more honest. Public feed serialization, public-preview asset access, and public post transitions now only expose showcase-ready assets; blocked, generating, failed, deleted, or demo-placeholder results no longer qualify just because they were still renderable.

### `0.6.0-alpha` / build `2026.04.14.105`
- Date: `2026-04-14`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.104` aligned wallet-backed free routing, but paid entitlement drift still had one risky hole: canceled or past-due paid accounts could continue to look like Creator/Pro accounts in key backend surfaces because stored plan state and effective commercial truth were not fully separated. That left a fail-open path where premium chat/model access and billing shell copy could overstate what an inactive subscription should still receive.
- What:
  Studio now resolves an explicit effective commercial plan for inactive subscriptions. If a paid account is `canceled` or `past_due`, billing summaries, settings bootstrap payloads, entitlements, and account-tier reporting all fail closed to the free contract while preserving extra wallet credits that were actually purchased.
  Generation enforcement now follows that same truth. Paid-only model validation reads the resolved billing state instead of trusting the stored plan field by itself, so inactive subscriptions can no longer start Pro-only image lanes just because the old plan name still exists on the identity record.
  This wave also cleaned up one frontend contract drift exposed during verification: `MediaAsset` now carries optional `visibility` typing again, which restores `npm run type-check` alongside the already-passing production build.

### `0.6.0-alpha` / build `2026.04.14.104`
- Date: `2026-04-14`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.103` closed a lot of billing and security gaps, but one commerce/provider mismatch was still visible in the product contract: free accounts that had legitimately purchased wallet credits were still described and, in some paths, routed too much like fallback-only free users. That drift made route previews, generation admission, and billing forecasts tell slightly different stories about the same paid wallet state.
- What:
  Wallet-backed free accounts now carry explicit provider truth into the image routing stack. Studio generation admission passes wallet state into route planning, so purchased-credit free users can promote onto the same managed Runware-first execution lane family that Creator accounts use when those providers are actually available instead of being treated as fallback-only by default.
  The same contract now reaches non-runtime surfaces too. Generation credit forecasts, render route previews, and model catalog previews all read the same wallet-backed truth, so the backend no longer tells the UI "fallback" while the real generation path is allowed to take a managed lane.
  Regression coverage was extended around that behavior: wallet-backed free generations now prove they prefer Runware when it exists, forecast and experience-contract tests lock the same route-promotion rule, and the old misleading service-regression test name was corrected so the remaining fallback-only scenario is described honestly.

### `0.6.0-alpha` / build `2026.04.14.103`
- Date: `2026-04-14`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  The `.102` commerce and provider wave changed core billing truth quickly, so it needed a focused hardening pass before any launch optimism crept in. An external second-eye review surfaced several real fail-closed gaps around Paddle verification, webhook idempotency, credit settlement, and a few unbounded or weakly validated router paths.
- What:
  Paddle webhook handling is now safer. Signature verification unwraps the real configured secret instead of passing a masked `SecretStr`, webhook receipts include `event_id` in their idempotency fingerprint, missing `identity_id` custom data fails closed, unknown identities raise instead of being silently acknowledged, and the retired LemonSqueezy service alias no longer pretends to process Paddle-shaped payloads.
  Subscription and credit behavior were tightened too. `subscription.updated` no longer resets monthly allowance like a free renewal trigger, credit-pack checkout kinds are no longer accepted as subscription plan upgrades, and final generation settlement now rejects true credit underflow instead of silently clamping balances to zero.
  Service and router hardening also landed: Studio service delegation now forwards security-log fields and chat rebuild arguments correctly, asset-token signing now requires a real JWT secret outside local development, demo login is development-only, and both `POST /personas` and `GET /public/export` now have stricter validation or explicit rate limits.

### `0.6.0-alpha` / build `2026.04.14.102`
- Date: `2026-04-14`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `Controlled Public Paid Launch` could not keep leaning on the temporary `Starter / Pro / top_up` story. Studio needed a real SaaS contract that separates free access, paid subscriptions, wallet balance, provider doctrine, and deployment truth without letting frontend copy or stale OpenAI-first assumptions keep inventing policy on their own.
- What:
  Studio commerce truth is now shaped around `Free Account`, `Creator`, `Pro`, and `Credit Packs`. The backend catalog, identity payloads, billing summaries, and checkout options now expose additive wallet-first fields such as `subscriptions`, `credit_packs`, `wallet`, `account_tier`, `subscription_tier`, `feature_entitlements`, and `usage_caps` instead of forcing the product back through the old starter/pro bundle assumptions.
  Billing doctrine also moved to `Paddle`. Checkout kinds, webhook parsing, idempotent receipts, and subscription state transitions now follow Paddle-style transaction and subscription events while preserving truthful paid-state behavior such as `past_due`, `canceled`, and `expired` instead of silently refreshing monthly allowance forever.
  Provider and runtime truth moved with that commerce change. Chat defaults now point at Gemini with OpenRouter as backup, image routing is Runware-first with selective OpenAI premium/edit lanes, and generation admission can fall back to a safe managed provider when the selected billable lane is blocked by spend guardrails instead of pretending the route is still usable.

### `0.6.0-alpha` / build `2026.04.14.101`
- Date: `2026-04-14`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `Controlled Public Paid Launch` Phase 1 needed a real authority freeze before more surface work. Studio already had decent security coverage, but two gaps were still too soft for a truthful launch path: owner/admin access could still be influenced by auth metadata during bootstrap, and several authenticated self-service mutation routes had no explicit rate-limit contract yet.
- What:
  owner-only backend truth is now stricter. Auth/session bootstrap no longer upgrades an identity into `owner_mode`, `root_admin`, or `local_access` from request/session metadata alone; owner surfaces now trust stored backend identity truth plus founder-email overrides instead of header or token claims by themselves.
  Router hardening also made high-risk mutation limits explicit. Project create/update/delete, profile export/update/delete, asset import, and style mutations now have server-side rate limits so account abuse, bulk scraping, and repeated destructive actions are bounded by contract instead of best effort.
  Regression coverage expanded with dedicated router-security tests that prove two things: header-only owner/root-admin claims fail closed, and the new mutation routes actually consume the intended limits.

### `0.6.0-alpha` / build `2026.04.14.100`
- Date: `2026-04-14`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Create generation admission and persistence were already real, but the end of the flow still felt too weak: once a render finished, the toast mostly acted like a notification instead of a product handoff. Worse, compose draft projects were treated like a dead-end special case, so a finished Create run could bounce the user back to generic Library instead of reopening the actual project that held the new result.
- What:
  Create toast actions now close that gap. Finished and in-progress runs can reopen their real destination again via `Open project` or `Open library`, and the draft compose project no longer breaks the result chain just because it is system-managed in lists.
  Successful Create runs also gained a direct `Copy share link` action that mints a project share on demand when the active plan allows sharing. This keeps `Create -> result -> project -> share` inside the same surface instead of forcing the user to manually hunt through Library or Project first.

### `0.6.0-alpha` / build `2026.04.14.99`
- Date: `2026-04-14`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.98` economics signoff artÄ±k yazili note istiyordu ama hala bir eksik vardi: current build note + build pin olsa bile gercek maliyet arastirma paketi olmadan `provider_economics` tarafi teorik olarak kapanabiliyordu. Bu da OpenAI-first launch kararini gercek economics dossier yerine env/config seviyesinde tasimaya devam ediyordu.
- What:
  backend artik current-build `provider_economics_dossier` uretiyor ve owner health detail icinde rapor olarak sakliyor. Dossier OpenAI-first pricing basis'i, Studio public package varsayimlari, lane bazli credit impact ozeti, safe/risky generation summary, ve founder signoff snapshot'ini tek current-build artefact'ta topluyor.
  provider economics truth de buna gore sertlesti: `pass` icin artik matching signoff build + explicit note yetmiyor; dossier current build ile eslesmeli ve `complete=true` olmalı. Aksi halde economics state acikca `missing_dossier` veya `stale_dossier` olarak warning kaliyor.
  owner/operator truth genislestirildi: launch readiness artik dossier durumunu provider economics altinda tasiyor, owner health detail de top-level `provider_economics_dossier` summary veriyor. Bu wave yeni provider acmiyor, `provider_mix` ve `image_public_paid_usage` blocker'larini yumusatmiyor; yalnizca OpenAI-first truth ve cost exit contract'ini gercek current-build arastirma artefact'ina bagliyor.

### `0.6.0-alpha` / build `2026.04.14.98`
- Date: `2026-04-14`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.97` redundancy truth daha netti, ama `provider_economics` tarafinda hala bir gri alan vardi: current build ile eslesen bir boolean signoff, note/policy metni bos olsa bile `pass` sayilabiliyordu. Bu da explicit economics signoff yerine "config dogru gorunuyor" hissi uretebiliyordu.
- What:
  provider economics contract'i artik daha sert: `pass` icin yalnizca `PUBLIC_PAID_PROVIDER_ECONOMICS_READY=true` ve matching build yetmiyor, ayrica explicit bir signoff note da gerekiyor. Note yoksa current build bile warning olarak kaliyor ve economics signoff state'i `missing_note` diye acikca gorunuyor.
  Buna uygun provider-truth ve launch-readiness regression coverage de eklendi; yani public-paid stage ancak current build economics signoff'u yazili policy/cost ozetiyle geldiyse `ready` tarafina gecebilir.
  `.98` proof zinciri de current build'e tasindi: protected-beta verify shard'lari ile frontend `type-check` / `build` gecti, local verify `.98` pass verdi ve backend health `healthy` kaldi, live provider smoke `.98` `ok=3 / skipped=4 / error=0` yazdi, ve protected staging `.98` healthy rebuild edildi. Owner-token staging closure yine ayri bir explicit run gerektirecek; owner detail olmadan `closure_ready=true` current build icin yeniden alinmadi.

### `0.6.0-alpha` / build `2026.04.13.97`
- Date: `2026-04-13`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.96` local backend health problemni cozmustu, ama public-paid backend truth hala bazi farkli redundancy gap'lerini ayni cumleyle anlatiyordu. Ozellikle chat tarafinda "ikinci paid lane hic yok" ile "backup lane var ama current build'de kanitlanmamis" ayrimi, image tarafinda da "managed backup yok" ile "configured backup var ama smoke proof'u yok" ayrimi operator tarafinda yeterince temiz okunmuyordu.
- What:
  provider truth artik bu reason'lari daha durust ayiriyor. Chat resilience truth'u tek proven paid lane kaldiysa, configured backup lane'lerin current build'de hala unproven oldugunu ayrica soyluyor; ikinci lane hic yoksa onu da ayri bir reason olarak veriyor.
  image resilience ve `image_public_paid_usage` truth'u da benzer sekilde ayrildi: managed backup hic yoksa baska, configured backup lane var ama current-build smoke ile kanitlanmadiysa baska reason uretiliyor. Boylece `provider_mix` ve `image_public_paid_usage` blocker'lari ayni `blocked` sonucu verse bile, operator/artifact tarafinda neden bloke olduklari daha net okunuyor.
  Bu wave yeni provider lane acmiyor ve launch gate'i yumusatmiyor; yalnizca mevcut blocker truth'unu daha hedefli hale getiriyor. Current-build proof zinciri `.97`ye tasindi: protected-beta verify shard'lari ile frontend `type-check` / `build` gecti, local verify `.97` pass verdi ve backend health `healthy` kaldi, live provider smoke `.97` `ok=3 / skipped=4 / error=0` yazdi, ve protected staging `.97` healthy rebuild edildi. Owner-token staging closure ise yine ayri bir explicit run gerektiriyor; owner detail olmadan `closure_ready=true` current build icin yeniden alinmadi.

### `0.6.0-alpha` / build `2026.04.13.96`
- Date: `2026-04-13`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.95` wave arayuzu tekrar Omnia guardrail'larina cekti ama local backend health hala `degraded` gorunuyordu. Somut neden crash ya da provider failure degildi; local development'ta beklenen queue fallback path'i, yani Redis/shared broker yokken backend'in yerel kuyrukla devam etmesi, top-level health durumunu da gereksiz yere degraded'e indiriyordu.
- What:
  Backend health truth artik development fallback ile gercek runtime bozulmasini ayiriyor. Local development'ta `redis_unavailable_fallback_local_queue` ve `web_runtime_local_fallback_no_shared_broker` reason'lari, generation yerel kuyrukla calismaya devam ediyorsa top-level health'i tek basina degraded yapmiyor.
  Ayni reason'lar staging/production tarafinda hala degraded olarak sayiliyor; yani launch truth yumusatilmadi, sadece local operator signal'i daha dogru hale getirildi. Generation broker payload'i da bu ayirimi tasiyor: local dev fallback artik advisory olarak isaretlenebiliyor, gercek degradation ile karismiyor.
  `.96` proof zinciri de yenilendi: protected-beta verify shard'lari ile frontend `type-check` / `build` tekrar gecti, local verify `.96` pass verdi ve backend health artik `healthy`, live provider smoke `.96` `ok=3 / skipped=4 / error=0` yazdi, ve protected staging `.96` healthy rebuild edildi. Ancak owner bearer token olmadan staging verify advisory warning olarak kaldi; `closure_ready=true` current build icin yine yeniden alinmadi.

### `0.6.0-alpha` / build `2026.04.13.95`
- Date: `2026-04-13`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.94` doctrine ve context-pack cleanup'i dogru yone gitse de arayuz copy'si birkac yerde fazla launch-anlatili, webby ve gergin kaldi. Ozellikle Billing, Documentation, Dashboard welcome overlay, Chat input altindaki billing hint, ve shell/settings owner-state copy'leri Studio'nun app-first guardrail'larindan daha cok rollout notu gibi okunuyordu.
- What:
  Bu wave layoutlari yeniden tasarlamiyor; var olan Studio yuzeylerini sakinlestiriyor. Chat altindaki gereksiz plan-hint paneli kaldirildi, Create internal-access banner'i silindi, Dashboard onboarding overlay'i yeniden urun odakli hale getirildi, Billing hero/root-state dili daha sakinlestirildi, Documentation hero ve policy copy'si daha grounded hale getirildi, ve Settings ile global shell icindeki owner/internal labels daha az bagiran bir tona cekildi.
  Controlled Public Paid Launch doctrine'i korunuyor; backend-authoritative billing/catalog truth'u geri alinmadi. Yapilan is, doctrine'i app yuzeyine fazla anlatmadan tasimak ve Studio'yu repo icindeki Omnia UI guardrail'larina daha iyi uydurmak.
  `.95` verification zinciri de ayni build'e tasindi: protected-beta verify shard'lari ile frontend `type-check` / `build` tekrar gecti, local verify `.95` pass verdi ama backend health `degraded` kaldi, live provider smoke `.95` `ok=3 / skipped=4 / error=0` yazdi, ve protected staging topology `.95`e rebuild edildi. Ancak owner bearer token olmadan staging verify hala advisory warning olarak kaldi; `closure_ready=true` current build icin yeniden alinmadi.

### `0.6.0-alpha` / build `2026.04.13.94`
- Date: `2026-04-13`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.93` provider auth ve public-plan truth tarafini daha durust hale getirmisti, ama Studio'nun canonical baglam paketi hala protected-beta merkezli konusuyordu. README, wiki, roadmap, delivery status, ve bazi shell copy'leri aktif urun hikayesini gecmiste kapanmis baseline uzerinden anlatiyor; bu da gelecekteki AI handoff'lari ve launch kararlarini gereksiz bulandiriyordu.
- What:
  Studio'nun canonical context pack'i artik `Controlled Public Paid Launch` frame'ine sabitlendi. README, wiki index, AI context pack, product north star, delivery status, roadmap, ve operations girisleri Studio'yu Omnia Creata'nin flagship urunu olarak, `Create + Chat` birlesik urun contract'i olarak, ve `Starter / Pro / Credit Top-up` server-authored commercial catalog'u uzerinden anlatıyor.
  user-facing drift de daraltildi: Billing zaten backend katalog truth'unu gosterirken Chat ayni commercial contract'i hatirlatan bir billing hint kazandi, Create/Login/Signup/Shell CTA'lari ve Dashboard/Documentation/Settings copy'leri stale `Start free` veya aktif `protected beta` tiyatrosundan uzaklastirildi.
  bu wave yeni feature acmiyor; protected-beta baseline korunuyor ama aktif urun hikayesi artik broad public paid launch'a donuk. Kalan launch gate'ler acikca ayni kaliyor: `provider_mix`, `image_public_paid_usage`, ve `provider_economics`. `.94` build, bu doctrine ve context-pack hizasini current manifest ve ops memory uzerinde kanonik hale getiriyor.
  `.94` verification zinciri de yenilendi: protected-beta verify script shardlari ve frontend build tekrar gecti, local verify `.94` pass verdi (backend health hala `degraded`), live provider smoke `.94` `ok=3 / skipped=4 / error=0` yazdi, ve protected staging bring-up + verify `.94` build'ine tasindi. Ancak owner bearer token env'de hazir olmadigi icin staging verify advisory warning olarak kaldi ve `closure_ready=true` yeniden kanitlanamadi; bu current-build blocker olarak durustce kaydedildi.

### `0.6.0-alpha` / build `2026.04.13.93`
- Date: `2026-04-13`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.92` public-paid truth daha durusttu ama env tarafinda bir yalanci-configuration sorunu kalmisti: Gemini ve OpenRouter gibi lane'ler obvious placeholder key tasidiklarinda bile "configured" sayilabiliyor, smoke raporlarindaki `400/401`ler de gercekte olmayan aktif premium lane bozuklugu gibi owner/operator truth'una sizabiliyordu. Bu, "gercekten bozuk provider" ile "hic configure edilmemis provider" farkini bulandiriyordu.
- What:
  provider secret handling artik daha sert: obvious placeholder key'ler routing, provider smoke, moderation, image provider registry, ve launch-readiness/provider-truth tarafinda `not_configured` sayiliyor. Boylece fake configured state, sahte cooldown, ve gereksiz auth-failure gürültüsü current truth'u saptirmiyor.
  chat tarafinda bir contract cleanup da yapildi: Gemini chat request'i artik `x-goog-api-key` header'i ile gidiyor; yani current backend path official header-auth seklini kullaniyor, query-string key tasimiyor.
  buna uygun focused regression coverage eklendi: placeholder secret'lerin configured sayilmadigi, smoke seed'inin not-configured lane'e cooldown enjekte etmedigi, Gemini request'inin header auth kullandigi, ve provider registry'nin placeholder token'lari gercek provider gibi yuklemedigi testlerle kilitlendi.
  current-build proof zinciri `.93`e tasindi: local verify `.93`, provider smoke `.93`, ve protected staging owner verify `.93` ayni snapshot'a yenilendi; protected-beta closure current build'de korunurken public-paid tarafinda kalan blocker'lar artik daha durust bir provider auth truth'una dayaniyor.

### `0.6.0-alpha` / build `2026.04.13.92`
- Date: `2026-04-13`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.91` refactor'i launch-readiness monolith'ini ciddi sekilde daraltti ama public-paid phase icinde hala bir karar tasmasi vardi: generic `provider_smoke` check'i, chat/image/mix/economics truth'u zaten daha hassas sekilde karar verdigi halde, public-paid stage'e bir kez daha hard blocker olarak giriyordu. Bu da opsiyonel lane veya fallback smoke drift'ini gercek paid-readiness gap'i ile gereksiz karistirabiliyordu.
- What:
  public-paid phase artik `provider_smoke`'u duplicate blocker gibi kullanmiyor; generic smoke sonucu current-build operator sinyali olarak warning seviyesinde kaliyor, ama hard blocker karari `chat_public_paid_usage`, `image_public_paid_usage`, ve `provider_mix` truth'undan geliyor.
  buna uygun regression coverage de eklendi: yeni test, public-paid chat/image/mix/economics truth'u temizken opsiyonel bir provider smoke error'u oldugunda stage'in `blocked` degil `needs_attention` kalmasini kilitliyor. Boylece protected-beta/public-paid ayrimi daha net, operator warning dili de daha durust.
  current-build proof zinciri `.92`ye tasindi: local verify `.92`, provider smoke `.92`, ve protected staging owner verify `.92` ayni snapshot'a yenilendi; protected-beta closure current build'de korunurken public-paid tarafinda generic smoke'in rolü artik daha hassas.

### `0.6.0-alpha` / build `2026.04.13.91`
- Date: `2026-04-13`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.90` public-paid truth daha durusttu ama backend tarafinda hala bir yapisal tasma vardi: `launch_readiness.py` hem smoke persistence, hem provider truth, hem mix/economics kararlari, hem de operator-facing readiness assembly tasiyordu. Bu durum test yazmayi da zorlastiriyordu; provider truth edge case'leri tek basina hedeflemek yerine tum launch-readiness context'ini kurmak gerekiyordu.
- What:
  provider classification, smoke lookup, economics/mix truth, ve chat/image provider report mantigi artik ayri `services/provider_truth.py` modulunde duruyor; `launch_readiness.py` ise operator-facing readiness assembly ve gate hesaplamasina geri cekildi. Public contract degismedi; refactor davranis degil sorumluluk siniri tasidi.
  buna paralel focused regression coverage eklendi: `test_provider_truth.py` wrong-build smoke, stale signoff, free-tier-only lane, managed backup eksigi ve mix/economics edge case'lerini artik direkt moduler seviyede kilitliyor. LLM gateway testleri de smoke-seeding yan etkisinden izole edilerek tekrar deterministik hale getirildi.
  docs/operator truth da buna gore hizalandi ve current-build proof zinciri `.91`a tasindi: local verify `.91` pass, live provider smoke `.91` current-build report'u `ok=3 / skipped=2 / error=2` ile OpenAI lane'lerini gecerken OpenRouter/Gemini drift'ini durustce kaydediyor, ve protected staging owner verify `.91` icin tekrar `closure_ready=true` veriyor. Protected-beta gate kapali kalirken public-paid blocker'lar hala durustce gorunuyor.

### `0.6.0-alpha` / build `2026.04.13.90`
- Date: `2026-04-13`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.89` operator truth daha netti ama public-paid readiness kararinda iki sey hala birbirine karisiyordu: protected-beta secili chat lane ile broader paid redundancy ayni truth gibi davranabiliyor, economics warning'i de explicit current-build signoff yerine dolayli config cikarimlarina yaslanabiliyordu
- What:
  `launch_readiness` artik chat tarafinda iki ayri seyi ayri ayri soyluyor: protected-beta gate halen secili lane'in current-build smoke/health truth'una bakiyor, ama `provider_mix` icin broader paid chat redundancy artik tum gercek paid lane'ler ve current-build smoke proof'u uzerinden hesaplanıyor
  provider economics truth'u da ayrildi: surface-level cost class bilgisi korunuyor ama `provider_economics` artik ancak explicit current-build signoff varsa `pass` oluyor; aksi halde tekil bir warning olarak kaliyor ve mix blocker'larina gomulmuyor
  bu wave yeni feature acmiyor; `.90` icin env example'lari economics signoff alanlariyla genisletildi, readiness regression testleri yeni contract'a gore guncellendi, ve local/provider/staging artefact refresh zinciri current build uzerinde yeniden kosuldu
  current-build proof artik `.90`ta hizali: local verify `.90` pass, live provider smoke `.90` report'u OpenAI image/chat lane'lerini gecirirken OpenRouter/Gemini auth-config drift'ini durustce error olarak kaydediyor, ve protected staging owner verify `.90` icin `closure_ready=true` veriyor

### `0.6.0-alpha` / build `2026.04.13.89`
- Date: `2026-04-13`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.88` protected-beta closure proof gercekti ama public-paid readiness truth'u hala cok toplu ve biraz kaygandi; staging owner report'unda `image_public_paid_usage` blocker'i pozitif bir cumleyle gorunebiliyor, `provider_mix` blocker'i de economics warning'iyle gereksiz ic ice kalabiliyordu
- What:
  `launch_readiness` public-paid truth contract'i dar ama daha durust hale geldi: chat ve image tarafi artik ayri `public_paid_usage_summary` reason'lari uretiyor, provider-mix truth'u economics truth'tan ayriliyor, ve public-paid phase blocker listesi artik protected-beta olumlu cumleleri blocker diye gostermiyor
  bu wave yeni feature acmiyor; `.88` protected-beta closure baseline'ini korurken sonraki operator kararlarini `image_public_paid_usage`, `provider_mix`, ve `provider_economics` arasindaki farki daha net gorecek sekilde sikilastiriyor
  current-build zinciri de `.89`a tasindi: version/ledger/maintenance bookkeeping current build ile hizalandi, hedefli readiness testleri yeniden kosuldu, ve local/provider/staging artefact'leri artik daha net ayrilmis public-paid readiness reason'lariyla `.89` build'ine senkron

### `0.6.0-alpha` / build `2026.04.13.88`
- Date: `2026-04-13`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `.87` shell baseline genel olarak saglamdi, ama current-build artefact zinciri hala stale raporlara dayanıyordu ve birkac gorunen shell izi daha gercek urun durumundan daha ileride konusuyordu; ozellikle Billing status/activity dili ile enterprise CTA, current build closure proof yenilenmeden once dar bir completion wave istiyordu
- What:
  gorunen shell yuzeyleri `.87` baseline matrix ile tekrar sabitlendi ve `.88` wave bu kalan drift'i daraltti: Billing artık fake processing tiyatrosu yapmiyor, current plan durumu protected-beta truth ile gorunuyor, ham provider/activity etiketleri daha urun diline cekildi, ve enterprise card dead self-serve button yerine gercek bir pilot-contact yoluna dondu
  shell copy de bir adim daha dogrulasti: Explore hero metni public gallery'nin gercek durumunu anlatacak sekilde guncellendi ve signed-in/internal shell ordinary customer metering gibi davranan son yerlerde de daha durust hale geldi
  en onemlisi current-build operator zinciri artik `.88`te yeniden hizali: local verify `.88` pass, provider smoke `.88` pass, protected staging owner verify `.88` pass-with-warnings ve `closure_ready=true`, yani stale `.84/.86` artefact'leri closure kaniti olmaktan cikti

### `0.6.0-alpha` / build `2026.04.13.87`
- Date: `2026-04-13`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  protected-beta closure proof was stronger than the visible shell experience; Explore still behaved like a decorative placeholder when the public gallery was empty, Create still carried unnecessary surface clutter around ratio selection and lane naming, and several signed-in library/help/billing surfaces were still too ambiguous about what really works today
- What:
  Explore now behaves honestly in both directions: search and sort drive the actual rendered result set, curated showcase fallback follows those same controls, result counts are visible, and a real empty state appears when neither live public posts nor showcase references match the current query
  Create and Library are cleaner and more truthful too: the ratio selector is now a compact single chooser with six standard formats, the redundant `My Images` CTA is gone, image-set actions now distinguish `Reuse prompt`, `Reuse style`, `Create variations`, and `Edit in Chat`, and those handoffs land on the intended Studio surface instead of pretending different actions are the same
  user-facing shell copy is closer to current product truth across Billing, Help, Settings, and the shared shell itself: internal-access accounts no longer masquerade as ordinary metered customers, protected-beta-only controls disclose their limits, and help/policy text now reads like an honest protected-beta operating guide instead of a faux-final public launch contract

### `0.6.0-alpha` / build `2026.04.12.86`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  protected-beta closure proof had passed, but the signed-in shell still had a cluster of everyday honesty bugs: post visibility toggles were dying in the browser before they even reached the backend route, project cards had lost the image lightbox path, several Settings actions looked clickable while actually being unavailable in the current shell, and public-facing landing/billing copy was still overclaiming hardware and package truth
- What:
  backend CORS now explicitly allows `PATCH`, which restores browser preflight for post visibility updates so `Set public` and `Set private` no longer fail at the transport layer before the protected route can answer
  signed-in shell behavior is more honest now too: project cards reopen the lightbox path, trash action menus anchor under the three-dot control instead of appearing in the wrong place, Explore search also checks style tags and gives a real no-results message, and media-library actions now label create-reroute flows more truthfully
  Settings, Billing, and Landing were tightened toward launch honesty rather than polish theater: protected-beta-only controls now either work or clearly disclose that they are managed outside the shell, fake checkout loading states are gone, and launch-copy claims about A100/H100/4K-style guarantees were replaced with protected-beta-safe wording that matches the current product truth

### `0.6.0-alpha` / build `2026.04.12.85`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  protected-beta closure proof had landed, but real signed-in shell behavior in protected staging was still intermittently breaking: backend and worker could both rewrite the durable Postgres state table at the same time, which surfaced as duplicate `identities` primary-key collisions during auth bootstrap and turned ordinary signed-in routes into shell-facing `500`s
- What:
  the Postgres durable-state store now acquires a transaction-scoped advisory write lock before full-table replace, row upsert, or row delete operations, which serializes backend and worker writes across processes instead of trusting only the in-process asyncio lock
  that closes the duplicate-identity race behind the observed staging failures on `/v1/conversations`, `/v1/projects`, `/v1/models`, `/v1/settings/bootstrap`, `/v1/assets`, and `/v1/profiles/me`, where auth bootstrap was otherwise trying to persist the same identity while another process was already replacing the state snapshot
  store regressions now also lock that write-serialization behavior directly, and the full backend suite remains green after the fix so protected-beta hardening can move back from shell-breakage cleanup to the remaining runtime truth sweep

### `0.6.0-alpha` / build `2026.04.12.84`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  protected staging could finally boot under Docker again, but the browser shell still had one last truth gap: the frontend build expected `VITE_SUPABASE_*` values while the staging env and hydration pipeline only guaranteed the server-side `SUPABASE_*` names, so `/login` rendered as a blank screen even though the containers were healthy
- What:
  the staging runtime helper now mirrors hydrated `SUPABASE_URL` and `SUPABASE_ANON_KEY` into `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` whenever the browser-facing variants are absent, which keeps the effective staging env honest for both backend and frontend consumers
  Docker compose and the web Dockerfile now forward those `VITE_SUPABASE_*` values into the production frontend build, so the protected staging login shell can actually initialize its Supabase browser client instead of crashing at first render
  deploy docs and the example staging env now also reflect that frontend/browser aliasing rule, which closes one more operator trap before closure-grade staging proofs

### `0.6.0-alpha` / build `2026.04.12.83`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  protected-beta closure still had one awkward local-security seam left: owner-token verification worked, but the safest path still depended on users pasting bearer tokens into shell env or command arguments by hand
- What:
  `deployment_verify.py` now accepts the owner token from `STUDIO_HEALTH_DETAIL_TOKEN`, so staging verification no longer needs to expose that token on the Python command line just to inspect `/v1/healthz/detail`
  `start-studio-staging.ps1` and `verify-studio-staging.ps1` now support `-PromptForOwnerToken`, normalize pasted `Bearer ...` values automatically, and restore the previous shell env after the run so closure-grade verification can be done with less operator friction and less local token exposure
  closure-gate blocker text and deploy docs now also point operators at that prompt-based path, which keeps Protected Beta Hardening honest without making owner verification feel like a manual secret-handling ritual every time

### `0.6.0-alpha` / build `2026.04.12.82`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  protected-beta closure still had one operator-honesty seam left: protected staging bring-up only proved that `docker.exe` existed, not that the Docker engine was actually reachable, and closure-grade runs could still drift into a soft verify attempt without an owner bearer token
- What:
  `start-studio-staging.ps1` now fails early with an external blocked report when the Docker engine itself is unavailable, so protected staging no longer burns time on a compose attempt that was doomed by an offline daemon
  closure-grade staging runs now also fail before compose or verify if the owner bearer token is missing, which keeps `closure_ready` proof honest instead of silently downgrading a requested closure run into advisory-only verification
  route regressions now also lock two more protected-beta edges directly: revoked public-share delivery tokens fail closed on asset content routes, and tombstoned sessions cannot reach `/v1/billing/checkout` before the deleted-identity check stops them

### `0.6.0-alpha` / build `2026.04.12.81`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  the final owner-truth sweep found one more stale-token fail-open seam: `/v1/healthz/detail` still accepted a token claiming `owner_mode` without first proving that the underlying identity could still bootstrap, and signed-in auth bootstrap could still overwrite an already-established public username from non-authoritative fallback fields
- What:
  owner gating now bootstraps identity before honoring owner claims, so deleted-owner sessions fail closed with `401` on `/v1/healthz/detail` instead of bypassing the tombstone check through stale token metadata
  auth/bootstrap identity refresh now preserves an established username unless a real authoritative username arrives in auth metadata, so signed-in profile truth no longer drifts back to fallback ids or email-localpart guesses during ordinary route bootstrap
  route regressions now lock that owner-only route directly and also cover tombstoned-session refusal on `/v1/assets` and `/v1/billing/summary`, so more of the protected signed-in shell stays explicitly fail-closed under deleted-account auth

### `0.6.0-alpha` / build `2026.04.12.80`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  the next billing/provider abuse pass found a subtle fail-open path in image generation routing: spend guardrails were enforced for the selected primary provider, but a later billable fallback candidate could still survive in the runtime chain and get attempted after the primary lane failed
- What:
  generation admission now prunes billable fallback providers that are already hard-blocked by spend guardrails instead of persisting them as valid backup candidates behind a healthy primary lane
  generation processing now repeats that fallback pruning right before execution, so a provider that becomes blocked after admission cannot still ride along inside the execution candidate chain as a silent billable escape hatch
  targeted billing regressions now lock both moments directly: blocked billable fallbacks are removed from job truth at creation time and are stripped out again before runtime execution when provider spend changes between admission and dispatch

### `0.6.0-alpha` / build `2026.04.12.79`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  the next abuse-sweep pass found two lingering trust inconsistencies: several signed-in routes still treated “has an auth token” as enough even when the identity had been tombstoned, and asset-share truth was still loose enough to tolerate ambiguous targets or blocked/non-truthful assets longer than it should
- What:
  protected routes that mutate or expose signed-in state now require an actively bootstrappable identity instead of raw auth alone, so tombstoned sessions fail closed with `401` on prompt improve, personas, chat message edits/regenerations, generation surfaces, clean export, post mutations, and share routes instead of falling through to inconsistent downstream behavior
  share creation now rejects ambiguous `project_id + asset_id` payloads and refuses blocked/demo/deleted asset targets, while public asset-share lookup and share-token asset delivery also deny blocked or non-truthful assets instead of leaving public-link behavior partially alive
  adversarial regressions now lock those router gates and share rules directly, keeping the protected-beta hardening wave focused on real auth/share abuse paths instead of more structural refactor noise

### `0.6.0-alpha` / build `2026.04.12.78`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  protected-beta hardening still had two trust gaps left that were too dangerous to defer: a deleted account could still be silently recreated by a surviving authenticated session, and project-bound public shares could outlive the project truth they were supposed to represent
- What:
  account deletion now writes a durable local deleted-identity tombstone while still purging the rest of the user state, and auth/bootstrap routes now fail closed with `401` when an authenticated session belongs to a deleted identity instead of quietly recreating the account or downgrading it into a fake guest session
  project deletion now also clears project-bound shares, public project-share lookup now returns `404` when the project is gone or no share-eligible assets remain, and project-share asset delivery now re-checks project existence plus blocked/demo/renderable eligibility before honoring old delivery tokens
  regression coverage now locks tombstone persistence, deleted-session refusal, project-share cleanup, and stale share denial directly, while the backend spine still stays under the service-size guard and the package is ready for the next audit sweep instead of more structural refactoring

### `0.6.0-alpha` / build `2026.04.12.77`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  the next exploit-sweep pass found that demo auth still defaulted on in staging and that unauthenticated demo login could still request a Pro plan outside true local development, which was too loose for protected-beta hardening
- What:
  `ENABLE_DEMO_AUTH` now defaults to `true` only in development, not in every non-production environment, so protected staging no longer quietly exposes the demo-auth lane unless an operator explicitly turns it on
  even when demo auth is explicitly enabled outside development, unauthenticated demo login can no longer mint a Pro identity there; staged or protected environments now refuse that path with an explicit `403` instead of quietly granting elevated test access
  regression coverage now locks both the settings default and the route-level refusal, while compile and follow-on verification keep the rest of the hardened billing/share/public trust changes intact

### `0.6.0-alpha` / build `2026.04.12.76`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  the audit-ready baseline was strong enough to stop refactoring and start closing concrete trust gaps where public interaction, clean export, or billing behavior could still overpromise or fail open under the wrong state
- What:
  public post reactions now fail closed unless a post is genuinely public and showcase-eligible, which prevents hidden internal/demo-style posts from being liked or unliked by direct route access and keeps route behavior at `403` instead of accidental mutation or secondary crashes
  clean export now refuses blocked assets even for the owner, and billing checkout now refuses silent demo activation outside local development when LemonSqueezy is missing, so staging or production cannot quietly self-upgrade a user because checkout config drifted out of sync
  focused regressions now lock those three trust boundaries directly, the touched backend surfaces still compile cleanly, and the broader protected-beta verification loop remains the next gate instead of another refactor wave

### `0.6.0-alpha` / build `2026.04.12.75`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  the protected-beta audit baseline was strong enough to stop adding features and instead harden trust boundaries, owner-truth honesty, and obvious abuse edges before the later full exploit/security sweep
- What:
  owner health detail now degrades honestly under partial failure instead of crashing or silently overclaiming readiness when telemetry, AI control-plane, or launch-readiness helpers fail
  deleted or trashed asset shares now resolve to `404` instead of surviving past asset state, public profile payloads no longer leak private default-visibility settings, and the admin telemetry route now bootstraps identity correctly before enforcing root-admin access
  security regressions now lock those auth/share/profile/owner-truth behaviors directly, protected-beta verify stays green, and login/signup form controls picked up stable `id` and `name` attributes so the shell preserves basic accessibility trust without redesigning the UI

### `0.6.0-alpha` / build `2026.04.12.74`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `StudioService` was still directly owning signed-in shell/bootstrap assembly and model catalog helpers, which meant the final audit wave would still find façade noise instead of mostly real bugs and risks
- What:
  signed-in shell/bootstrap ownership now lives in `services/shell_service.py`, so `/v1/settings/bootstrap` and model catalog listing/lookup/serialization no longer need nontrivial inline assembly inside `StudioService`
  cross-service reach-back is smaller too: identity/profile flows now route public-post visibility/serialization through `public_service.py` and asset/purge behavior through `library_service.py`, while public/share serialization also reads asset truth from `library_service.py`
  route payloads stay wire-compatible, `service.py` stays below the backend spine size target, focused regressions pass, the full protected-beta verify matrix stays green, and read-only browser sanity still opens the signed-in `Create`, `Chat`, `My Images`, and `Projects` shell surfaces normally

### `0.6.0-alpha` / build `2026.04.12.73`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `StudioService` was still too large to be a trustworthy long-term spine; even after earlier extractions, project, library, public/share, and health ownership were still living too directly inside one compatibility facade
- What:
  backend domain ownership is now explicit through `project_service.py`, `library_service.py`, `public_service.py`, and `health_service.py`, while `StudioService` keeps the same route-facing facade methods
  signed-in and owner/operator route payloads stay wire-compatible, but project CRUD, asset/style/prompt-memory behavior, public/share/profile behavior, and owner health assembly now belong to dedicated services instead of inline god-object blocks
  `service.py` now sits below the current backend spine size target, and the protected-beta verification matrix still passes after the extraction

### `0.6.0-alpha` / build `2026.04.12.72`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  signed-in shell bootstrap is one of the highest-value stable contracts in Studio, so leaving its payload assembly inline inside `StudioService` would keep a subtle drift point exactly where the app initializes
- What:
  `/v1/settings/bootstrap` payload assembly now lives in `bootstrap_contract_ops.py`, which gives the signed-in shell a dedicated contract builder instead of hand-built inline response assembly
  regression coverage now directly checks that the canonical bootstrap fields from `contract_catalog.py` still survive this builder unchanged
  the extraction keeps the same route payload shape while shrinking another small but important contract seam out of `StudioService`

### `0.6.0-alpha` / build `2026.04.12.71`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  `health(detail=True)` was still acting like a mini god-object inside `StudioService`, stitching together security counts, operator artefacts, spend truth, control-plane truth, and launch-readiness in one place
- What:
  owner health detail now loads its security summary and detail-only operator extensions through dedicated helper functions in `owner_health_ops.py`
  hidden AI control-plane assembly now has a single backend entrypoint in `operator_control_plane_ops.py`, so `StudioService` no longer manually rebuilds the model catalog plus surface matrix bundle
  regression coverage now locks that extracted control-plane seam too, while the full protected-beta verification matrix still passes unchanged

### `0.6.0-alpha` / build `2026.04.12.70`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  protected-beta hardening still had too much model-catalog and owner-health assembly trapped inside `StudioService`, which would keep growing into a harder-to-change backend god-object if left alone
- What:
  Studio model registry lookup, validation, and identity-facing serialization now live in `model_catalog_ops.py` instead of being defined inline inside `StudioService`
  owner health/detail payload assembly now lives in `owner_health_ops.py`, so hidden launch/provider truth can stay wire-compatible without forcing `StudioService` to keep owning every operator payload detail
  direct regression coverage now locks both seams, and the AI handoff docs now point future assistants at the extracted backbone modules instead of treating `service.py` as the only orientation file

### `0.6.0-alpha` / build `2026.04.12.69`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  the hidden operator control-plane logic was already useful, but too much of its assembly still lived inside `StudioService`, which is exactly the kind of slow service-layer bloat that becomes painful later
- What:
  operator model-catalog and surface-matrix assembly now live in a dedicated control-plane module instead of being hand-built inside `StudioService`
  this keeps owner health detail output unchanged while making the backend easier to reason about, safer to extend, and less likely to turn into a god-object around provider truth
  regression coverage and focused compile/test runs confirm that the same `ai_control_plane` contract still reaches owner health detail after the extraction

### `0.6.0-alpha` / build `2026.04.12.68`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  contract truth was still partially living inside provider-oriented code, which is the kind of quiet coupling that turns into spaghetti later when state vocabularies and provider strategy evolve at different speeds
- What:
  Studio backend now has a dedicated contract catalog module for canonical product-facing statuses, internal worker-job statuses, asset truth fields, and bootstrap fields
  owner health detail now exposes that richer contract freeze through `ai_control_plane.contract_freeze`, so operators and future AI assistants can distinguish product state language from internal recovery state without reading multiple files
  the AI context pack now points directly at that hidden contract source as well, which keeps orientation cheaper and more accurate for future tooling

### `0.6.0-alpha` / build `2026.04.12.67`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Studio wiki context was already useful for humans, but another AI model or coding IDE assistant could still fall into stale sprint language or waste tokens rediscovering context that the repo already knew
- What:
  Studio wiki now has a dedicated `AI Context Pack` that gives external models and IDE assistants a low-token orientation path, including what to read first, what is stable, what is still open, and where hidden operator truth actually lives
  the wiki index now advertises that context pack directly, so future assistants can start from one compact handoff file before diving into code or deeper docs
  Studio `AGENTS.md` has also been corrected to use the current `Protected Beta Hardening` frame instead of stale wording that made Sprint 9 sound like the still-active planning layer

### `0.6.0-alpha` / build `2026.04.12.66`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  the backend truth layer was stronger, but plan language could still drift because internal worker states, signed-in library states, and hidden provider routing notes were not clearly separated in the docs humans actually read
- What:
  backend docs now distinguish the stable product-facing state contract (`queued`, `running`, `ready`, `failed`, `blocked`) from the richer internal worker lifecycle used by queue and recovery code
  the wiki and operations guidance now explicitly point operators at owner health detail `ai_control_plane.surface_matrix` as the hidden `surface -> tier -> provider -> model` map, which reduces one more source of plan and launch confusion
  this keeps the protected-beta hardening frame more professional: one hidden operator map, one product-facing state language, and less accidental drift between docs and runtime truth

### `0.6.0-alpha` / build `2026.04.12.65`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  provider/model/cost truth was still split across too many places, which made operator reasoning harder exactly when we need launch decisions to stay disciplined and cheap
- What:
  Studio backend now has a canonical AI provider catalog that centralizes the active chat/image model lanes plus their current operator-facing cost references
  OpenAI image cost estimation is now model-aware again, so `gpt-image-1-mini` draft lanes and `gpt-image-1.5` final lanes no longer share the same stale price table
  owner-only health detail now exposes an `ai_control_plane` summary, which means provider roles, protected-beta policy, Studio model aliases, and route previews can be read from one place instead of being reconstructed from multiple files
  backend provider environment examples were also updated to match current routing truth, which reduces one more documentation drift source during hardening

### `0.6.0-alpha` / build `2026.04.12.64`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  protected staging could finally boot and verify, but the last closure mile still had one operator-truth deadlock: `launch_readiness` and `deployment_verification` did not interpret warning-grade deployment truth the same way, so protected-beta proof could remain artificially not-ready even after selected lanes and staging shell were genuinely proven
- What:
  protected-beta launch gating now treats a current deployment verification report that explicitly `passed with warnings` as an advisory warning instead of a closure-blocking mismatch, while still keeping missing or stale deployment reports non-ready
  regression coverage now locks that behavior, so selected protected-beta lanes can remain closure-grade without letting a missing deployment report or stale build silently pass
  operator truth is now ready to promote the current build once local and staging runtimes have been restarted on the new snapshot

### `0.6.0-alpha` / build `2026.04.12.63`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  protected-beta hardening still had one last professional gap: the new staging helper chain was close, but PowerShell dictionary handling broke the first real bring-up attempt, repo env hydration was not yet sourcing the real Studio secrets automatically, and runtime/operator output still leaked stale sprint labels instead of the current hardening frame
- What:
  staging runtime helpers now work with ordered PowerShell dictionaries, hydrate missing staging secrets from the existing Studio `.env` files when host environment variables are absent, and keep the effective staging env generation deterministic
  current-build provider smoke is now refreshed on the selected protected-beta OpenAI lanes only, which proves the chosen chat and image lanes without letting known-broken backup providers pollute closure truth
  local runtime has been restarted and re-verified on the current build, and staging blocker output plus deployment-verification language now consistently speak in `Protected Beta Hardening` terms instead of stale sprint numbering

### `0.6.0-alpha` / build `2026.04.12.62`
- Date: `2026-04-12`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  protected-beta hardening needed one narrower release contract so backend truth, staging proof, and wiki planning would stop drifting away from each other; selected protected-beta providers had to become explicit, staging env hydration had to stop relying on placeholder files, and operator artefacts needed to stay on one current-build chain
- What:
  launch-readiness now treats only the selected protected-beta chat and image providers as launch-grade lanes, while managed backups remain visible without silently counting as closure-grade proof
  deployment preflight now validates the selected protected-beta lanes directly and treats obvious placeholder secrets as missing instead of green-lighting staging on fake values
  protected staging start/verify scripts now generate one effective env file under the external runtime root, mirror local provider smoke into staging alongside startup verification, and keep Docker/preflight/verify aligned to the same env truth
  protected-beta closure discipline now has a dedicated shard-based verification script and the repo wiki/README have been rewritten around `Protected Beta Hardening` instead of stale sprint-active language

### `0.6.0-alpha` / build `2026.04.11.61`
- Date: `2026-04-11`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  protected staging could finally issue an owner-flavored token, but owner-only verification still failed because `/v1/healthz/detail` trusted only JWT metadata and ignored the privileged identity state that Studio derives during identity bootstrap from approved owner emails
- What:
  owner-only router gating now self-bootstraps the caller identity and accepts the persisted owner/root/local-access flags from Studio state before rejecting access
  regression coverage now proves a founder-email user can reach `/v1/healthz/detail` even when the incoming token metadata itself is not already marked `owner_mode`
  this moves protected staging closer to a true owner-verified rehearsal instead of stopping at public-shell proof

### `0.6.0-alpha` / build `2026.04.11.60`
- Date: `2026-04-11`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  protected staging rehearsal had moved past truth-drift issues and into real runtime blockers: the Postgres metadata boot path still crashed on `SecretStr` DSNs, the staging env could silently drift away from the Postgres service credentials, and the staging web image served the shell but not the API truth that deployment verification expects on the same origin
- What:
  Postgres state-store construction now unwraps `SecretStr` database URLs before handing them to the Postgres metadata store
  staging deployment preflight now validates that `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` actually agree with `DATABASE_URL`, and the local staging env has been pinned to one coherent Postgres credential set
  the staging web image now ships an explicit nginx config that proxies `/api/*` and `/v1/*` to backend, so protected staging verification can read version and health truth from the public shell origin instead of accidentally fetching the SPA document
  protected staging rehearsal now reaches a warning-state verification instead of failing on boot or same-origin API routing

### `0.6.0-alpha` / build `2026.04.11.59`
- Date: `2026-04-11`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  protected staging still had one deterministic boot blocker left: the metadata store builder passed `DATABASE_URL` through as a Pydantic `SecretStr`, but the Postgres store constructor expected a plain string and crashed on `.strip()` before backend or worker could finish startup
- What:
  Postgres state-store construction now unwraps `SecretStr` database URLs through the canonical secret helper before the DSN reaches the Postgres metadata layer
  regression coverage now proves `build_state_store()` accepts a `SecretStr` `DATABASE_URL`, which keeps the staging-only Postgres boot path from silently regressing while local sqlite development still passes
  this removes a real protected-staging crash class instead of only papering over it in operator scripts

### `0.6.0-alpha` / build `2026.04.11.58`
- Date: `2026-04-11`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  readiness truth still had one misleading drift: local owner health was reading only the local deployment report path, while protected-staging verification was being persisted under the staging runtime root, so truth-sync could still warn about a stale `.07` deployment artefact even after a fresh staging verify run
- What:
  deployment verification loading now searches both the primary runtime report root and the protected-staging sibling runtime report root, then picks the newest valid report instead of blindly trusting only the local root
  regression coverage now locks that sibling-report preference so local owner truth can consume the latest protected-staging verification artefact during beta rehearsal
  this keeps current-build truth, staging verify, and owner readiness closer to the same source of evidence during protected-beta hardening

### `0.6.0-alpha` / build `2026.04.11.57`
- Date: `2026-04-11`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  protected-beta rehearsal still had one noisy stability gap left: old or remote Supabase-backed assets could fail storage auth and bubble unhandled exceptions out of asset delivery or delete routes, which turned recoverable storage trouble into signed-in `500` crashes
- What:
  asset content, thumbnail, preview, blocked-preview, and clean-export routes now convert storage backend failures into controlled `503 asset storage unavailable` responses instead of throwing unhandled exceptions through the signed-in shell
  permanent delete and empty-trash paths now surface the same storage failure truth instead of collapsing into generic backend errors when remote asset cleanup fails
  route-level regressions now lock those storage-unavailable cases so old remote asset auth drift does not silently regress back into crash-class failures

### `0.6.0-alpha` / build `2026.04.11.56`
- Date: `2026-04-11`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 readiness work still had a fragile gap between signed-in route contracts, owner launch truth, and current-build operator discipline: some shell routes assumed identity state already existed, route-level regressions did not yet lock the full signed-in contract, and owner truth still made chat provider economics harder to compare than they needed to be
- What:
  signed-in backend routes now self-bootstrap identity state before loading projects, assets, settings bootstrap, profile, billing, styles, prompt memory, and core chat/project surfaces, which reduces `auth/me happened first` coupling during local beta rehearsal
  route-level regression coverage now explicitly locks `/v1/auth/me`, `/v1/assets`, `/v1/projects`, `/v1/settings/bootstrap`, and `/v1/healthz/detail`, including hidden draft-project behavior and owner-only health detail access
  owner launch-readiness truth now carries chat-provider comparison rows plus a built-in low-cost operator smoke checklist, and the remaining frontend lifecycle drift (`pending`) was removed so type-check stays aligned with canonical generation states

### `0.6.0-alpha` / build `2026.04.11.55`
- Date: `2026-04-11`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  the Studio library route started crashing while resolving clean-export entitlements, so signed-in `My Images` views could lose their ready asset payload and misleadingly leave only stale failed cards visible after refresh
- What:
  the backend clean-export entitlement check now uses the canonical `can_clean_export` flag again
  resolved entitlements also expose a backward-compatible plural alias so older callers do not crash if they still reference `can_clean_exports`
  `/v1/assets` now has a route regression test proving ready assets can be listed successfully for a Pro identity without tripping the clean-export gate

### `0.6.0-alpha` / build `2026.04.11.54`
- Date: `2026-04-11`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  current-build smoke truth and live chat routing were disagreeing: OpenRouter and Gemini could already be known-bad from smoke, but the running gateway still treated them like clean primary lanes until a user request hit them again
- What:
  Studio chat routing now hydrates provider cooldown state from the latest current-build smoke report, so recent chat auth/config failures can mark a provider lane as temporarily unhealthy before the next user request arrives
  this keeps broken premium chat lanes from wasting the first live request on a provider that current smoke already proved is returning `401` or similar hard errors
  routing summary and launch-readiness truth now inherit that stricter chat lane picture, which makes backend diagnostics more honest without deleting any provider code or removing fallback support

### `0.6.0-alpha` / build `2026.04.11.53`
- Date: `2026-04-11`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  signed-in Studio library and projects were still behaving like a half-finished tool surface: broken previews could leak through, blocked assets were not consistently represented as protected previews, styles existed but were not fully usable from the refreshed UI, and prompt memory needed a real frontend-facing product surface
- What:
  My Images and Projects now bind to the new protected-delivery contract, so preview rendering prefers protected preview URLs, falls back more safely when a thumbnail is missing, and keeps blocked assets visually locked instead of pretending they are ordinary ready images
  the signed-in library language is now more product-safe too: user-facing `Collections` wording has been shifted to `Projects`, project menus now carry the intended high-signal actions, and project export is wired directly into the refreshed project and library surfaces
  Styles is now a working surface instead of a placeholder shell, with catalog apply flows, saved styles, favorites, and a visible Prompt Memory card that turns the low-cost backend learning profile into product-facing context
  Create and Project now connect to that style system more directly as well, including prompt-to-style save flows and reusable style modifiers that route back into Create without exposing backend jargon
  frontend type-check is green again after the library/style refactor, and new backend regression coverage now locks draft-project hiding, protected asset serialization, styles, and prompt memory behavior into tests

### `0.6.0-alpha` / build `2026.04.11.52`
- Date: `2026-04-11`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  the local Studio app was feeling heavier than it needed to, especially during long signed-in sessions where the browser kept paying for oversized startup code, frequent polling, and development-only double-render pressure
- What:
  PostHog bootstrap now loads lazily instead of bloating the main entry chunk
  command palette and shortcut modal now load on demand instead of front-loading their code on every visit
  development runs now skip React StrictMode double-mount overhead, which makes local CPU and memory usage calmer without changing production behavior
  Create and Chat polling now wait longer between checks, stop polling when the tab is hidden, and invalidate cache in parallel instead of serial bursts
  Chat image rendering no longer paints the same image twice just to fake a blur placeholder, which reduces browser memory and GPU texture churn
  the production build is now chunked more intelligently, shrinking the main entry bundle dramatically so the browser has less startup work

### `0.6.0-alpha` / build `2026.04.11.51`
- Date: `2026-04-11`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  backend extraction cleanup had restored the main auth crash, but several secondary runtime seams were still fragile enough to break billing, generation, asset import, or Improve fallback behavior once the refreshed login path touched them in real life
- What:
  backend service wiring is now stable again: generation, billing, auth/profile, and asset flows resolve their shared helpers correctly after the extraction work instead of crashing on missing imports or misplaced service references
  local sqlite/json development now defaults to safe local asset storage even when Supabase asset settings exist, which prevents local verification from accidentally depending on remote upload credentials
  OpenAI Improve fallback is now cost-safer too: when OpenRouter is unavailable during development, fallback refinement uses the standard OpenAI lane instead of silently escalating into the premium tier
  full backend verification is green again, so the signed-in login path now sits on top of a stable runtime instead of a partially repaired service graph

### `0.6.0-alpha` / build `2026.04.11.50`
- Date: `2026-04-11`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  recent backend service extraction left the signed-in login path fragile, and `/v1/profiles/me` could crash immediately after auth because `IdentityService` no longer exposed the billing/profile helpers the route chain expected
- What:
  backend identity/profile auth now delegates the missing billing, profile-post, asset, and moderation helpers back through the main Studio service, which restores the signed-in `/auth/me` plus `/profiles/me` chain without touching frontend code
  full local auth verification is cleaner too: the stray root `test_jwt.py` probe no longer executes at pytest import time, so repo-wide verification can run without a fake collection crash hiding real auth regressions

### `0.5.1-alpha` / build `2026.04.10.47`
- Date: `2026-04-10`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  current-build smoke truth kept going stale because the only obvious smoke path still ran optional edit probes and expected-failure cases, which is overkill when operators just need a fresh low-cost proof for the active build
- What:
  provider smoke now supports a cheaper `refresh` profile that keeps required current-build lane proof while skipping optional edit and failure-probe cases
  OpenAI refresh smoke keeps only the draft and final image lanes, and fal refresh smoke keeps the required primary text-to-image path, which lowers the cost of updating current-build smoke truth
  the smoke CLI now exposes that profile directly, so operators can intentionally refresh build truth without pretending they ran the full diagnostic suite

### `0.5.1-alpha` / build `2026.04.10.46`
- Date: `2026-04-10`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  broken or expired free-provider auth could still look healthy enough to stay in the image routing graph, which meant local Create runs could keep touching bad providers, open retry loops, and muddy backend truth even after Sprint 9 cost hardening
- What:
  backend provider health now treats rejected Pollinations and HuggingFace auth probes as unavailable instead of healthy, so owner truth and routing stop pretending those lanes are usable
  image routing, preview selection, and generation-provider availability checks now skip providers with an open circuit, which reduces repeated contact with recently broken lanes
  auth-like provider failures now break out of provider-internal retry loops and suppress generation job requeue, so local image runs fail fast instead of churning on expired or rejected credentials

### `0.5.1-alpha` / build `2026.04.10.45`
- Date: `2026-04-10`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  owner health detail already exposed launch truth and cost truth, but operators still had to manually compare smoke, startup verification, deployment verification, and manifest build numbers to tell whether the current build had actually been proven end to end
- What:
  owner/debug backend truth now exposes a structured `truth_sync` summary that marks operator artefacts as current, stale, or missing against the current Studio build
  `/v1/healthz/detail` now surfaces that same artefact-sync truth at top level, so owner reads no longer need to infer build drift from separate payload sections
  deployment verification reports can now mirror `truth_sync`, which keeps staging/closure prep aligned with the same current-build view without rerunning live smoke automatically

### `0.5.1-alpha` / build `2026.04.10.44`
- Date: `2026-04-10`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  provider spend guardrails now existed, but owner-side backend truth still could not answer the basic question of where real USD spend had gone by provider, model, day, and surface
- What:
  owner/debug health detail now exposes a structured `cost_telemetry` summary that rolls up real spend across generations, assistant chat replies, and prompt improvement events
  prompt improvement calls now persist their own billable telemetry events, which closes a visibility gap where OpenAI or fallback LLM refinement cost could exist without showing up in owner-side cost truth
  deployment verification reports can now mirror that same owner `cost_telemetry` payload, so backend operator reports and owner health detail describe the same spending picture during staging and closure work

### `0.5.1-alpha` / build `2026.04.10.43`
- Date: `2026-04-10`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  local Studio had become cheaper and less retry-happy, but there was still no hard backend stop once a billable provider crossed a daily safety budget
- What:
  provider spend guardrails now track daily provider spend from completed generations and persisted assistant cost metadata, so owner health can show per-provider soft-cap, hard-cap, and emergency-disable status
  development generation admission now blocks new billable image jobs when a provider has already hit its daily hard cap or has been emergency-disabled
  generation execution now re-checks that same guardrail before making a billable provider call, which prevents queued work from spending again after the daily budget has already been exhausted

### `0.5.1-alpha` / build `2026.04.10.42`
- Date: `2026-04-10`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  local Studio had become cost-safer by default, but temporary failures on billable image providers could still trigger layered retries and billable-to-billable failover chains during development
- What:
  development/local billable image providers now skip provider-internal retry loops, so transient OpenAI/fal/Runware failures do not multiply charges before the job layer reacts
  generation maintenance now suppresses automatic requeue for billable temporary failures during development, releasing the hold and surfacing a final failure instead of silently retrying later
  development failover now avoids chaining one failed billable provider into another billable lane, while still allowing a non-billable fallback route when one exists

### `0.5.1-alpha` / build `2026.04.10.41`
- Date: `2026-04-10`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  local Studio could already use OpenAI Image successfully, but balanced/final legacy model selections still defaulted into the more expensive `gpt-image-1.5` lane during ordinary development work
- What:
  development/local image generation is now cost-safe by default and uses the configured OpenAI draft lane unless premium image QA is explicitly enabled
  explicit raw premium OpenAI image model requests still remain possible for intentional QA, so production-oriented checks are not blocked
  this keeps everyday local Create testing aligned with pre-revenue budget discipline without changing the intended production routing contract

### `0.5.1-alpha` / build `2026.04.10.40`
- Date: `2026-04-10`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  local OpenAI fallback protected Studio continuity, but when OpenRouter premium chat hiccupped the fallback could still land on an expensive premium OpenAI model during development
- What:
  development/local chat and prompt-improvement fallback now cap OpenAI to the standard configured lane instead of silently jumping to the premium OpenAI tier
  explicit OpenAI premium model requests still remain possible when intentionally asked for, but normal Studio fallback behavior is now much less likely to burn prepaid credits by surprise
  this keeps local product work resilient while matching the current pre-revenue cost discipline more closely

### `0.5.1-alpha` / build `2026.04.10.39`
- Date: `2026-04-10`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  after the free-plan routing fix, local backend restarts could still miss user-scoped provider secrets because new Python processes only inherited the current shell environment
- What:
  the local Studio launcher now hydrates user-scoped provider secrets like `OPENAI_API_KEY` into the process environment before starting backend/frontend services
  this keeps Windows user-environment secrets usable without checking them into `.env`, while making the OpenAI-backed local generation fix survive normal local restarts
  local free-plan image routing continues to prefer managed OpenAI lanes when they are available, so Create no longer gets stranded on broken fallback-only providers during development

### `0.5.1-alpha` / build `2026.04.10.38`
- Date: `2026-04-10`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  local free-plan image generation could still route into broken fallback-only providers, which left Create jobs failing even after a working OpenAI image lane had already been connected
- What:
  development/local free-plan image routing now prefers available managed lanes such as OpenAI before falling back to Pollinations or HuggingFace
  this keeps local product testing honest and usable while leaving the stricter public launch economics decision separate from the development routing policy
  stale fallback-only providers can still exist as later candidates, but they no longer block the first real generation path when OpenAI is already healthy

### `0.5.1-alpha` / build `2026.04.10.37`
- Date: `2026-04-10`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Create could still hold onto a stale image-set id after aggressive account/project cleanup, which made generation fail with `Project not found` even though the user was otherwise ready to create
- What:
  image generation now recovers missing compose-project references on the backend by reusing the latest owned compose project when one already exists
  when no owned compose project exists, Studio creates a fresh `New image set` automatically and continues the generation instead of blocking on the stale reference
  this keeps Create resilient after account cleanup or broken local page state without changing the stricter ownership rules for real existing projects

### `0.5.1-alpha` / build `2026.04.10.36`
- Date: `2026-04-10`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  private Studio history was hiding legacy demo-generated renders too aggressively
- What:
  `My Images`, project collections, and other owned asset surfaces now keep the user's own demo-generated history visible again
  public share payloads still filter demo placeholder outputs so external/public surfaces keep the stricter truth policy

### `0.5.1-alpha` / build `2026.04.09.35`
- Date: `2026-04-09`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 had already cleaned up backend truth for provider reliability and render economics, but the default chat lane still started from Gemini, the Create Improve action could not fall back to OpenAI, and signed-in frontend surfaces could still receive raw model labels instead of product-safe display names
- What:
  backend chat defaults now prefer the proven OpenRouter lane first and keep OpenAI as the next paid fallback, which makes everyday chat routing more deterministic and less dependent on Gemini behaving well
  prompt improvement can now use OpenAI when OpenRouter is unavailable, so the Improve action no longer loses its live LLM path just because one provider is unhealthy
  model catalog payloads and generation credit forecasts now ship user-safe display labels and descriptions derived from `creative_profile`, so frontend consumers can stop showing raw model names like `RealVis XL` when they simply bind to backend labels

### `0.5.1-alpha` / build `2026.04.09.34`
- Date: `2026-04-09`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 owner health already exposed `platform_readiness`, but protected staging deployment reports still stopped at launch-gate truth alone, which left the operator chain unable to round-trip the same “local alpha / protected beta / public paid platform” story through staging verification
- What:
  deployment verification reports now persist owner-side `platform_readiness` whenever `/v1/healthz/detail` exposes it, so staging/operator truth can carry the same structured readiness phases as owner health
  deployment verification now also records an explicit `platform_readiness_visibility` check, which warns when owner truth omits those readiness phases instead of silently dropping them from the staging chain
  owner-only closure wording in deployment verification has been updated from the old Sprint 8 language to current Sprint 9 closure truth

### `0.5.1-alpha` / build `2026.04.09.33`
- Date: `2026-04-09`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 backend had already exposed launch truth, provider truth, and safer frontend contracts, but owner-side platform progress was still too implicit; answering “are we still local alpha, are we protected-beta ready, or are we truly close to a paid platform” still required manually interpreting several separate payloads
- What:
  `launch_readiness` now includes a structured owner-only `platform_readiness` section with explicit `local_alpha`, `protected_beta`, and `public_paid_platform` phases
  each phase now reports its own ready state, blockers, warnings, and summary, so backend/operator truth can say how far Studio has progressed without relying on chat memory or manual inference
  `/v1/healthz/detail` now also exposes `platform_readiness` at the top level beside `launch_gate` and `provider_truth`, which makes `.com`-readiness conversations easier to ground in one backend payload

### `0.5.1-alpha` / build `2026.04.09.32`
- Date: `2026-04-09`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 backend had already introduced creative profiles, but signed-in UI work still lacked one official server-side trust contract for render readiness, fallback status, and chat lane honesty, which kept frontend work too dependent on raw routing/provider metadata
- What:
  settings model payloads now expose `render_experience` plus `route_preview`, so the frontend can read current image-route trust directly from backend truth without guessing from provider names or pricing lanes
  generation payloads and billing forecast cards now also expose `render_experience`, which keeps fallback/degraded/unavailable state aligned across Create, Billing, Project, and Library surfaces
  chat assistant metadata now exposes a user-safe `chat_experience` contract (`live_premium`, `premium_unavailable`, `degraded_fallback`) while raw metadata remains available for compatibility and operator use

### `0.5.1-alpha` / build `2026.04.09.31`
- Date: `2026-04-09`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 had already made routing, pricing lanes, and estimate provenance more honest, but signed-in UI work still had to infer product-facing model language from raw ids like `flux-schnell` and `realvis-xl`, which kept backend truth too close to internal/operator naming
- What:
  backend model catalog entries can now carry a server-authoritative `creative_profile`, and the same creative-profile metadata is now attached to generation payloads plus billing forecast cards
  this gives frontend/UI work one stable product-language contract for render profiles like `Fast Draft` or `Polished Realism` without breaking existing raw model/provider fields
  billing credits payloads also restore the `credits_remaining` alias alongside the newer remaining/gross fields, which tightens backward compatibility while Sprint 9 contracts keep evolving

### `0.5.1-alpha` / build `2026.04.08.30`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 had already exposed lane-aware credits and estimate provenance, but the visible wording still drifted between Create, Billing, Project, and Library, which made blocked or degraded image paths feel less trustworthy than the underlying backend truth
- What:
  shared frontend helper copy now drives lane label, hold/settle summary, estimate provenance, and pending-state wording across visible generation surfaces
  Create now uses that same truth for both normal pre-submit guidance and blocked-on-balance messaging, while Billing lane cards and pending Library states read from the same phrasing instead of page-specific jargon
  smoke-report query-string redaction now fully masks provider keys too, so current-build operator proofs no longer leave trailing Gemini-style key fragments in error URLs
  this keeps Sprint 9's visible trust layer calmer and more consistent without changing pricing, checkout, or provider behavior

### `0.5.1-alpha` / build `2026.04.08.29`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 had already computed lane-aware USD estimates and their source, but most user-facing generation surfaces still hid whether a displayed estimate came from a live provider quote or a legacy catalog fallback
- What:
  Billing, Create, Project, and pending Library generation surfaces now show the USD estimate together with its source
  provider-quoted estimates are now visibly distinguishable from catalog fallback estimates instead of only existing in API payloads
  this keeps the visible economics story aligned with the backend lane-truth work without changing public pricing yet

### `0.5.1-alpha` / build `2026.04.08.28`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 auth and billing UX still had one confusing route edge: shell navigation treated `/billing` and `/plan` as subscription aliases, but the router did not, so deep-link attempts could bounce through login and then land on Explore instead of the actual billing surface
- What:
  protected routing now treats `/billing` and `/plan` as first-class aliases for `/subscription`
  public-shell gating now recognizes those aliases too, so auth and guest navigation stay aligned with the sidebar contract
  this closes the misleading “login bug” shape without changing billing behavior or pricing logic

### `0.5.1-alpha` / build `2026.04.08.27`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 billing truth had become lane-aware, but Create still asked users to infer whether the selected model could really start on the current balance before they pressed generate
- What:
  Create now reads the lane-aware billing forecast for the selected model and shows the planned lane, hold amount, settle target, and current start capacity before submit
  model picker labels now prefer live hold truth over stale flat catalog credit labels when that forecast is available
  the generate action now blocks clearly impossible starts on the current balance instead of making the user wait for a predictable backend rejection

### `0.5.1-alpha` / build `2026.04.08.26`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 still needed one more honest economics layer: users and operators could see per-job lane truth after queueing, but Billing still did not explain what the current balance could safely start on each lane before a generation was submitted
- What:
  billing summary now includes a lane-aware generation credit guide that forecasts each accessible model's planned provider, quoted credits, hold credits, settlement target, and immediate start capacity from the current balance
  the forecast follows the live provider topology instead of a flat catalog assumption, so managed lanes read differently from fallback or degraded lanes without changing actual product prices
  Billing now surfaces those lane guardrails in a compact coverage section, which makes Sprint 9 economics easier to reason about before the full pricing model is finalized

### `0.5.1-alpha` / build `2026.04.08.25`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 had already made provider economics more route-aware, but queued generation payloads still hid which pricing lane Studio planned and whether the displayed USD estimate came from a live provider quote or the legacy catalog fallback
- What:
  generation pricing is now built through one lane-native quote helper that outputs `pricing_lane`, `estimated_cost_source`, `credit_cost`, and `reserved_credit_cost` together
  generation jobs persist that lane and estimate-source truth, so API payloads can distinguish provider quotes from catalog fallback while keeping the old product credit prices unchanged
  project and media-library generation surfaces now show the planned lane plus held-versus-settled credit truth, which makes queued and completed generation economics more honest without redesigning Billing or Create

### `0.5.1-alpha` / build `2026.04.08.24`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 had made provider truth and smoke more honest, but queued generation jobs were still carrying the old catalog cost even when Studio had already routed the request onto a different real provider lane
- What:
  generation job creation now asks the selected provider for a route-aware cost estimate before it falls back to the legacy model catalog, which makes queued job economics closer to the provider lane Studio actually plans to use
  OpenAI image now projects draft versus final lane cost into queued jobs, and fal can also project its own lane cost without waiting for execution
  fallback lanes that do not have a trustworthy provider-side estimate still keep the older catalog estimate, so Sprint 9 gets better economics truth without destabilizing older flows

### `0.5.1-alpha` / build `2026.04.08.23`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make Sprint 9 provider truth more actionable before live-key closure by separating cheap OpenAI draft renders from premium final renders in smoke coverage and owner health detail
- What:
  OpenAI image smoke now records explicit `draft` and `final` lanes instead of a single undifferentiated image check
  owner truth now exposes whether the OpenAI draft lane and final lane were each proven on the current build, plus whether a secondary launch-grade image lane is healthy
  backend and staging env examples now document `OPENAI_IMAGE_DRAFT_MODEL`
  regression tests now lock the draft/final lane routing contract so future provider work cannot silently collapse them back together

### `0.5.1-alpha` / build `2026.04.08.22`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 had reached the point where image economics and provider truth were stronger than the real routing contract: Studio still treated `fal` and `Runware` as the only launch-grade image lanes even though the product decision had shifted toward OpenAI Image as the primary global image API
- What:
  Studio now includes an `OpenAIImageProvider` wired to the official Images API for both text-to-image and reference-guided edit flows, with explicit size/quality mapping, current official cost estimation, and honest retry/error handling
  provider routing, smoke coverage, and owner launch-readiness truth now recognize `openai` as a launch-grade billable image lane, prefer it ahead of `fal` and `Runware` for Pro/edit paths, and keep smoke-gap wording anchored to launch-grade image lanes instead of only managed lanes
  backend and staging env examples now expose `OPENAI_IMAGE_MODEL`, while Studio agent memory now records OpenAI Image as the current primary launch-grade image lane for Sprint 9 work
  the local backend boot path also no longer crashes during legacy public-post backfill for existing completed generations, so stable startup can actually carry the new `.22` build into the live local loop

### `0.5.1-alpha` / build `2026.04.08.21`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 hit a real reputational-risk wall: provider keys had already been exposed once, Docker build context could still accidentally ship local Studio secret/runtime files, provider smoke errors could leak raw query-string keys into reports, and Gemini free tier could still look like a public-paid launch-grade lane even though it cannot carry real launch traffic
- What:
  tracked Studio zip archives are now disallowed and the old tracked `backend.zip` secret-bearing archive is removed, while `.dockerignore` now excludes backend env/runtime files, backend zip artifacts, and frontend env files from the staging build context
  provider smoke, provider circuit-state errors, and backend logging now redact sensitive key/token strings before they can survive into smoke reports, operator truth, or runtime logs
  browser env examples no longer advertise provider API tokens, and chat provider truth now distinguishes paid launch-grade lanes from limited free-tier lanes so Gemini free tier does not read as public-paid-ready by default

### `0.5.1-alpha` / build `2026.04.08.20`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 still had one dangerous honesty gap in its closure path: provider truth could see runtime health and a smoke report, but it still did not require current-build live smoke proof per configured launch-grade lane, and smoke probes with both a real success and an expected-failure validation case could overwrite their own good result in owner truth
- What:
  provider smoke reports now persist their selected surface and can be generated from an explicit env file, which makes live recovery runs practical against staging-shaped secret sources instead of only the backend `.env`
  owner provider truth now aggregates smoke results per provider/surface, so an expected-failure probe no longer hides a real successful smoke result for the same launch-grade lane
  chat and image launch-grade truth now require current-build live smoke proof before a configured lane reads as healthy-for-launch, and smoke coverage gaps now name the exact configured providers that are still unproven on this build

### `0.5.1-alpha` / build `2026.04.08.19`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 operator truth still made providers look too abstract: health detail could say a lane was degraded, but it still did not expose enough per-provider runtime detail to explain whether the real issue was missing credentials, cooldown, current-build smoke failure, or a non-launch-grade lane class
- What:
  `provider_truth` now exposes per-provider runtime diagnostics for both chat and image lanes, including credential presence, runtime availability, launch classification, recent failure state, cooldown/circuit state, and current-build smoke status when available
  current-build smoke failures can now sit directly beside each provider in owner truth instead of staying buried only in the raw smoke report file
  fallback-only image lanes and missing managed lanes are now easier to distinguish from healthy launch-grade lanes without terminal log-diving

### `0.5.1-alpha` / build `2026.04.08.18`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 still had two truth gaps: chat replies could say enough to look premium without explicitly declaring whether they came from a live provider or heuristic fallback, and Pro image routing could still prefer fallback-only lanes ahead of managed launch-grade providers on some non-premium prompts
- What:
  assistant chat metadata now carries explicit response-mode truth for `live_provider_reply`, `premium_lane_unavailable`, and `degraded_fallback_reply`, which lets the chat surface stay honest without guessing from prose alone
  owner provider economics no longer treats a single healthy managed lane as public-paid-safe; it stays visible as a warning until redundancy exists
  Pro image routing now prefers `fal` and `Runware` ahead of fallback-only lanes even on balanced non-premium prompts, which keeps Sprint 9 provider policy consistent with the product promise

### `0.5.1-alpha` / build `2026.04.08.17`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 still had a user-trust gap on the chat surface: static starter prompts and degraded heuristic replies could both feel like “the AI is connected and answering” even when the premium lane was actually unavailable
- What:
  the empty chat state now explicitly labels its starter tiles as static quick starts instead of letting them read like live AI output
  assistant bubbles now mark degraded heuristic responses as fallback replies and surface when the premium lane is unavailable, while real live-provider replies can show the provider name more honestly
  this keeps the chat surface aligned with Sprint 9’s no-fake-success rule without changing Studio’s core Create/Chat product shape

### `0.5.1-alpha` / build `2026.04.08.16`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 still needed a more honest provider-economics read: seeing one launch-grade lane is not the same thing as having a resilient paid rollout shape, and operators still could not tell that difference clearly from owner health detail
- What:
  provider truth now separates `public_paid_usage_ready` from `resilience_status` for both chat and image surfaces, so Studio can say whether a lane is merely billable/configured versus actually redundant enough for broader rollout confidence
  launch-readiness economics now carries structured cost-class and resilience fields for chat and image, which makes single-lane premium chat or single-lane managed image setups visible without collapsing back into vague prose
  regression coverage now locks that stronger provider-truth contract, especially the case where image generation is launch-grade but still single-lane and therefore not yet redundancy-safe

### `0.5.1-alpha` / build `2026.04.08.15`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 still had a provider-truth blind spot: a stored smoke report could make Studio look healthier than it really was even when that report came from an older build or only tested one surface while current launch-grade chat or image lanes remained unproven
- What:
  provider smoke now records explicit surface coverage for `chat` and `image`, so operator truth can see which part of the AI stack was actually exercised instead of treating every smoke run as equivalent
  launch-readiness now warns when the latest smoke report is stale for the current build or when configured premium chat / managed image lanes were not smoke-tested on that build
  the smoke CLI can now probe chat providers as well as image providers, which makes Sprint 9 provider truth less dependent on terminal memory and more aligned with current-build reality

### `0.5.1-alpha` / build `2026.04.08.14`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Studio recovery had to be restored onto `main` after the last correct Studio work landed on OOFM branches by mistake; we needed one canonical Studio line again without merging Organizer or OCOS drift into the product branch
- What:
  `main` now carries the Sprint 8 staging/operator closure files plus the Sprint 9 provider-truth layer again, restored path-by-path from the mistaken branches instead of merging unrelated OOFM work
  the canonical Studio line on `main` now preserves protected-staging closure, `launch_gate`, and `provider_truth` together, so future Studio work can continue from one real source instead of split branch memory
  recovery bookkeeping now makes that explicit in the build manifest and operator docs so the next Studio slices can proceed directly from `main`

### `0.5.1-alpha` / build `2026.04.08.08`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 still had one structural closure gap: even when Docker staging could boot, host-written deployment reports could not round-trip back into owner health detail because the stack used an isolated named volume, and the verify flow still defaulted to the public staging URL instead of the host-reachable forwarded URL used by the local Docker proof
- What:
  `docker-compose.staging.yml` now bind-mounts a host-side staging runtime root into `/runtime`, which keeps staging logs and reports outside the repo while letting owner health detail read the same deployment verification files the operator scripts write
  `start-studio-staging.ps1` and `verify-studio-staging.ps1` now derive a shared external staging runtime root plus a host-reachable verify URL by default, so Sprint 8 local Docker proofs can drive the official closure loop more honestly
  `.env.staging.example`, deployment docs, and agent memory now document the optional `STAGING_RUNTIME_ROOT` and `STAGING_VERIFY_BASE_URL` overrides for protected staging operators

### `0.5.1-alpha` / build `2026.04.08.13`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 9 starts with a stricter provider-truth slice because Studio was still looking healthier than it really was: fallback-only image lanes could sit beside launch-readiness and operator health without clearly telling us that paid public image generation is still not trustworthy
- What:
  owner health detail and launch-readiness now expose a structured `provider_truth` view for chat and image lanes, including launch-grade readiness, fallback-only providers, and public paid usage safety
  image provider truth now treats `fal` and `Runware` as the only launch-grade managed lanes; `Pollinations`, `Hugging Face`, and `demo` no longer read like equivalent public-launch options
  launch-readiness now blocks on fallback-only image routing while keeping provider smoke as an explicit Sprint 9 warning instead of a fake hard deployment blocker

### `0.5.1-alpha` / build `2026.04.08.06`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 protected staging got past Docker discovery and then hit a real container-shape bug: the web image could not build because Studio imports the root `version.json`, but the Docker build context inside the web stage was only copying `web/`
- What:
  the Studio web Dockerfile now copies the root `version.json` manifest into `/workspace/version.json` before running the Vite build
  this keeps Dockerized web builds aligned with the same footer/build truth that already works locally
  agent memory now explicitly treats root manifest availability as part of the staging web build contract

### `0.5.1-alpha` / build `2026.04.08.05`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 staging startup could now find Docker itself, but compose still failed on fresh Windows installs because `docker-credential-desktop.exe` lived next to Docker and the stale shell PATH still hid it
- What:
  `start-studio-staging.ps1` now prepends the resolved Docker Desktop bin directory to the current process PATH before running compose
  this lets the same bounded staging script find both `docker.exe` and `docker-credential-desktop.exe` without forcing the operator to restart their shell
  docs and agent memory now treat stale Docker helper PATH as an operator friction case that Sprint 8 should absorb automatically

### `0.5.1-alpha` / build `2026.04.08.04`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 protected staging still had avoidable operator friction on Windows: Docker could be installed and running, but the startup script would still report it as missing if the current shell had a stale PATH; staging secrets also still risked being created as a normal tracked file
- What:
  `start-studio-staging.ps1` now falls back to the standard Docker Desktop install paths on Windows before declaring Docker missing
  the repo now ignores `apps/studio/deploy/.env.staging`, which makes local staging secret bootstrap safer during Sprint 8 work
  deploy/docs/agent memory now document that fresh Docker installs should work without forcing the operator to restart their shell first

### `0.5.1-alpha` / build `2026.04.08.03`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 still had one stale-truth hole: if protected staging verify failed before it could finish, operators could be left looking at an older deployment report instead of the latest blocked reality
- What:
  `deployment_verify.py` now persists a blocked protected-staging report when the deployed stack cannot be reached cleanly or owner health detail cannot be fetched
  `verify-studio-staging.ps1` now also writes a blocked report when its staging env file is missing before Python verify can even start
  deploy/docs/agent memory now explicitly treat verify-time connectivity and owner-detail failures as durable operator blockers, not terminal-only noise

### `0.5.1-alpha` / build `2026.04.08.02`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 still had one operator-truth blind spot: if protected staging could not even start because Docker was missing or the staging setup failed before verify, that blocker lived only in terminal output and disappeared from the durable report chain
- What:
  `start-studio-staging.ps1` now writes an external blocked `protected-staging-verify-latest.json` report when Docker is missing, the env file is missing, preflight fails, or compose bring-up fails
  this keeps Sprint 8 environment blockers visible through the same outside-repo report discipline as local verify and protected staging verify
  deploy/docs/agent memory now explicitly treat those early staging failures as operator-visible environment blockers, not hidden code-state mysteries

### `0.5.1-alpha` / build `2026.04.08.01`
- Date: `2026-04-08`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 now had two partially overlapping launch-truth layers: staging verification could still reconstruct closure logic from raw readiness checks even though owner health detail already exposed an explicit launch gate
- What:
  protected staging verification now prefers the owner-visible `launch_gate` contract when it is present, which keeps deploy closure decisions aligned with the single operator truth surface
  launch gate payloads now expose machine-readable `blocking_keys` and `warning_keys`, so staging verification can tell the difference between real launch blockers and provider-only advisory warnings without fragile string parsing
  staging verification also now refuses stale `last_verified_build` truth from the launch gate, which makes owner-detail closure checks stricter about proving the current deployed build

### `0.5.1-alpha` / build `2026.04.07.37`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 operator truth had become rich but still too interpretive: owner health detail exposed many separate readiness pieces, yet it did not answer the one product-critical question cleanly enough for a human operator or product owner, namely whether Studio is actually safe for a protected launch right now
- What:
  owner health detail now includes an explicit `launch_gate` model with `ready_for_protected_launch`, `blocking_reasons`, `warning_reasons`, and `last_verified_build`, so the protected-launch answer is visible without manually reading every readiness check
  protected-launch readiness now distinguishes provider-only warnings from true launch-shaped warnings; missing deployment proof, local-only environment, broken auth, missing durable state, or missing runtime truth still keep the gate closed
  the health detail payload now surfaces that same launch gate at top level, which makes future operator reports and launch audits easier to read from one place

### `0.5.1-alpha` / build `2026.04.07.36`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 launch-truth cleanup still had one ugly lie left: historical `demo` image outputs were surviving in library and share surfaces as if they were real finished renders
- What:
  backend truthful asset filtering now hides stored `provider=demo` outputs from library, share, and post-preview style surfaces instead of presenting those colorful fallback mocks like real user work
  direct asset-share payloads for demo placeholder outputs now fail closed rather than re-exposing fake renders through old public links
  repo memory now explicitly treats legacy demo placeholder assets as invalid on truthful surfaces

### `0.5.1-alpha` / build `2026.04.07.35`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 still had a nasty local operator bug: after a build bump, stable startup could leave an old backend process serving the previous `bootBuild`, which made local verify fail even though the manifest and frontend had already moved on
- What:
  `start-studio-local.ps1` now does one forced clean backend restart if the first readiness pass still reports the wrong build, which makes the stable local loop more self-healing after version bumps
  this keeps local operator truth tighter: manifest build, backend `bootBuild`, verify report, and visible footer are less likely to drift apart after a restart
  previous Sprint 8 closure-gate enforcement for protected staging remains in place

### `0.5.1-alpha` / build `2026.04.07.34`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 still had one operator ambiguity left: protected staging verify could inspect owner health detail, but a closure-grade run was not yet forcing `closure_ready=true` as a real pass/fail gate
- What:
  deployment verification now has an explicit closure-aware exit path, so owner-token staging checks can fail unless the resulting report truly says `closure_ready=true`
  the staging verify wrapper now auto-enforces that closure gate when an owner bearer token is supplied, while still allowing advisory-only runs without owner detail
  Sprint 8 docs and repo memory now describe closure enforcement more clearly, so operators can distinguish a useful staging smoke run from a real sprint-closing verification

### `0.5.1-alpha` / build `2026.04.07.33`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Even after fake demo fallback was disabled, failed in-chat image runs still collapsed into a plain text error box, which made the visual surface feel abrupt and did not communicate the blocked state as clearly as major AI products do
- What:
  chat generation failures now render an honest blurred placeholder card with explicit blocked/retry/timed-out labeling instead of a fake-looking success or a bare text-only error
  the failure card explains that Studio did not receive a real image and intentionally refuses to pretend the run succeeded
  model and aspect metadata still stay visible on the failed card, which keeps the execution trail understandable during support and bug sweeps

### `0.5.1-alpha` / build `2026.04.07.32`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Broad bug sweep exposed a few dangerous honesty gaps: Studio could still look healthier than it really was, local verify reports with BOM encoding could disappear from health detail, and failed generations could blame the originally planned provider instead of the last real failing lane
- What:
  startup verification and deployment/provider report loading now tolerate UTF-8 BOM files, so external operator reports remain visible from owner health detail instead of randomly looking missing
  backend version truth now exposes the running `bootBuild`, and local verify/startup scripts compare against the real running build so stale backend processes are easier to catch
  provider health snapshots now downgrade from reported `healthy` to runtime `error/warning` when recent live failures or open circuits exist
  retryable generation failures now keep the last real provider attempt on the job record and logs, which makes image-generation errors more honest during bug sweeps and support debugging

### `0.5.1-alpha` / build `2026.04.07.31`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Codex-side Studio operations were still trapped in chat memory and ad-hoc prompts, which made recurring launch audits harder to automate safely after live deployment
- What:
  added a repo-local Codex skill at `apps/studio/.agents/skills/studio-launch-ops` that teaches future agents and automations the bounded Studio operator workflow
  the skill points Codex at the real source-of-truth files, local/staging verification scripts, external runtime reports, Sprint 8 closure rules, and release-bookkeeping expectations
  this creates a stable foundation for post-launch Codex automations such as live readiness watch, release discipline audits, and weekly operator briefs without inventing new runtime rituals

### `0.5.1-alpha` / build `2026.04.07.30`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 protected staging verification still lacked a real closure gate: the script could print pass or warning lines, but it did not prove that owner-only health detail could round-trip the deployment report back into launch truth
- What:
  `deployment_verify.py` now performs an owner-detail round-trip when a bearer token is provided, so the protected staging report can be written, re-read through `/v1/healthz/detail`, and then finalized against the same runtime truth
  deployment verification reports now carry `closure_ready`, `closure_summary`, and explicit `closure_gaps`, which makes Sprint 8 completion depend on real operator proof instead of terminal memory alone
  the staging startup script now fails fast if Docker is unavailable, and the operator docs now state clearly that local verify alone does not close Sprint 8; a protected staging verify with owner detail is the actual closure gate

### `0.5.1-alpha` / build `2026.04.07.29`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 still had a version-truth bug: even after a successful build bump and restart attempt, `/v1/version` could stay pinned to stale startup metadata, which undermined operator trust in the build/verify loop
- What:
  removed startup-frozen version metadata from the backend path so `/v1/version` reads the current Studio manifest live
  this keeps backend version truth aligned with footer build truth and makes Sprint 8 operator verification less vulnerable to stale startup state
  stable local verify and future staging verify flows can now trust the manifest-backed version endpoint more directly

### `0.5.1-alpha` / build `2026.04.07.28`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 still had one operator-truth gap left: deployment verification could write an external report, but owner health and launch readiness could not see that report, so startup truth and deploy truth still lived on separate tracks
- What:
  deployment verification reports can now be loaded back from the external runtime root and surfaced through owner health detail
  launch readiness now evaluates the latest deployment verification report alongside provider smoke, startup verification, and runtime logs
  the deployment verification service now supports loading the newest bounded deploy report from the operator runtime root, which keeps protected staging checks reusable instead of terminal-only

### `0.5.1-alpha` / build `2026.04.07.27`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 still needed a real protected-staging operator loop; preflight existed and compose existed, but there was no one-command bring-up path or durable post-deploy verification report for operators to trust
- What:
  added `deploy/start-studio-staging.ps1` so protected staging can run preflight, docker compose bring-up, and post-start verification in one bounded operator flow
  added `deploy/verify-studio-staging.ps1` plus `backend/scripts/deployment_verify.py`, which verify public login shell, deployed build, health endpoint, and optionally owner-only launch-readiness detail when a bearer token is provided
  deployment verification reports now persist outside the repo under the Studio runtime root, which keeps staging checks aligned with the external log/report discipline from Sprint 8

### `0.5.1-alpha` / build `2026.04.07.26`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  Sprint 8 still needed a stronger operator truth loop; local always-on verification existed, but its result was ephemeral and owner health could not show the last proven startup state or the live external log snapshot
- What:
  added a durable local startup verification report under the external Studio runtime root, so `verify-studio-local.ps1` leaves a reusable operator breadcrumb instead of only terminal output
  owner health detail now exposes both `startup_verification` and `runtime_logs`, and launch readiness evaluates those signals directly alongside provider smoke and topology truth
  stable local startup now refreshes that verification report automatically after bring-up, which tightens the always-on loop without pulling logs or reports back into the repo

### `0.5.1-alpha` / build `2026.04.07.25`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  broad bug sweep found a cross-surface frontend styling regression where broken placeholder color tokens were silently shipping invalid CSS, plus a missing `noise.png` reference kept polluting every build
- What:
  replaced invalid `rgb(var() / )` placeholders across the Studio web theme and key surfaces with valid color values so login, landing, billing, account, dashboard, and shared primitives stop emitting broken visual tokens
  removed the stale `noise.png` dependency from the account header overlay, which clears the repeated build-time asset warning
  kept Sprint 8 deployment/runtime hardening intact while improving product polish and reducing false build noise during staging checks

### `0.5.1-alpha` / build `2026.04.07.24`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  reduce Sprint 8 staging mistakes by catching broken env/topology assumptions before docker compose starts a misleading half-valid stack, and make sure that guardrail works as a real operator script instead of only as imported test code
- What:
  added `backend/scripts/deployment_preflight.py`, which validates a staging env file for public URL shape, Postgres authority, web/worker split, required secrets, and premium provider coverage
  added deployment preflight service tests so this operator guardrail stays deterministic
  fixed the script bootstrap path so the preflight command works when run directly from the backend scripts directory
  deployment docs, wiki operations guidance, and agent rules now treat preflight as part of the protected staging operator loop

### `0.5.1-alpha` / build `2026.04.07.23`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  reduce Sprint 8 staging mistakes by catching broken env/topology assumptions before docker compose starts a misleading half-valid stack
- What:
  added `backend/scripts/deployment_preflight.py`, which validates a staging env file for public URL shape, Postgres authority, web/worker split, required secrets, and premium provider coverage
  added deployment preflight service tests so this operator guardrail stays deterministic
  deployment docs, wiki operations guidance, and agent rules now treat preflight as part of the protected staging operator loop

### `0.5.1-alpha` / build `2026.04.07.22`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make Sprint 8 local always-on mode behave more like a real stable runtime instead of quietly leaning on a hot-reload frontend server
- What:
  stable `ops/start-studio-local.ps1` now builds the frontend and serves it through `vite preview`, while `-HotReload` remains the explicit dev-only path
  stable local startup also restarts any old listener on port `5173`, which reduces stale frontend drift when the machine wakes up or the stack is relaunched later
  the local verification script now validates the frontend shell title too, and deployment/ops guidance now distinguishes stable preview mode from hot-reload coding mode

### `0.5.1-alpha` / build `2026.04.07.21`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  keep Sprint 8 deployment and always-on work honest by proving that local startup actually reaches a usable Studio shell instead of only spawning background processes
- What:
  `ops/start-studio-local.ps1` now waits for backend version/health and frontend login shell readiness before claiming success, and prints the active backend build/health after boot
  a new `ops/verify-studio-local.ps1` script validates backend build, backend health, and frontend login shell against the current `version.json` manifest
  deployment and operations docs now describe this stable local verification flow explicitly, so local always-on remains an operator convenience instead of a vague pseudo-staging promise

### `0.5.1-alpha` / build `2026.04.07.20`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  convert the post-Sprint-7 review into a real next sprint start instead of leaving launch blockers trapped in docs and memory
- What:
  broad end-to-end review is now written into the repo wiki, and Sprint 8 is active with a new deployment/always-on sprint family
  launch readiness now checks premium chat provider runtime health, so configured-but-broken Gemini/OpenRouter lanes no longer read as launch-safe
  Studio now includes its first protected staging deployment pack with backend/web Dockerfiles, nginx proxy config, and a compose topology for postgres, redis, backend, worker, and web
  local startup now defaults to stable always-on behavior, while hot reload is explicit
  deprecated local-owner / ComfyUI docs and env examples were cleaned so removed runtime paths no longer look active

### `0.5.1-alpha` / build `2026.04.07.19`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  finish Sprint 7 by turning launch hardening into a concrete operator surface instead of leaving launch confidence spread across ad-hoc scripts, memory, and manual guessing
- What:
  live provider smoke runs now persist their latest report into the external Studio runtime directory, so the most recent verification result survives outside the repo and can be inspected later
  owner health detail now exposes a launch-readiness report with blocked, warning, and pass checks for deployment environment, auth configuration, runtime topology, provider lanes, external logging, and smoke freshness
  the repo wiki and agent guidance now treat Sprint 7 as complete and shift the next step to an end-to-end review plus fresh sprint planning

### `0.5.1-alpha` / build `2026.04.07.18`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make Sprint 6 feel complete in the actual product, not only in hidden backend metadata, by exposing Chat handoff readiness and degraded state more honestly to the user
- What:
  assistant chat bubbles now surface compact execution-plan chips such as refinement state, workflow, handoff readiness, reference lock, model, and degraded guidance mode
  sprint status documentation now treats Sprint 6 as complete and shifts active planning focus to Sprint 7 launch hardening

### `0.5.1-alpha` / build `2026.04.07.17`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  keep Sprint 6 live provider replies aligned with earlier execution exclusions instead of only preserving those guardrails inside hidden generation blueprints
- What:
  follow-up chat continuity summaries now carry a compact negative-guardrail memory alongside workflow, format, reference, and creative-direction constraints
  premium provider prompts now receive that negative-guardrail context too, so short refinement turns stay aware of prior exclusion clauses instead of behaving like fresh unconstrained requests

### `0.5.1-alpha` / build `2026.04.07.16`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  stop Sprint 6 follow-up refinements from carrying the visible creative direction forward while silently dropping the older negative-prompt safety guardrails
- What:
  follow-up chat generation blueprints now merge the prior negative prompt protections into the next refinement pass instead of re-deriving them from scratch every time
  the top-level `generation_bridge` negative prompt is now kept consistent with the blueprint negative prompt, so Create/Edit handoff and future execution hooks do not see conflicting protection state
  regression coverage now locks this behavior for follow-up edit-style turns, especially where earlier passes already established important exclusions like distortion or anatomy cleanup

### `0.5.1-alpha` / build `2026.04.07.15`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  move Studio planning and product memory out of scattered one-off docs and into a real repo-native wiki layer
- What:
  added a new `docs/wiki` structure that centralizes Studio product intent, system architecture, delivery status, engineering standards, operations/release expectations, and roadmap/planning rules
  linked the wiki from the product README so maintainers and future agents have one clear entry point instead of guessing which old markdown file is still current
  updated agent orientation so the wiki becomes part of the official source-of-truth stack for future Studio work

### `0.5.1-alpha` / build `2026.04.07.14`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make Sprint 6 follow-up chat feel less stateless by preserving not only the locked execution blueprint but also the prior creative direction itself
- What:
  chat conversation context now derives a compact creative-direction summary from the latest assistant visual plan, prompt, or relevant prior message, and stores that in assistant metadata for later turns
  continuity summaries for premium chat follow-ups now remind the live model what visual direction it is refining, not just which workflow, model, aspect ratio, and reference lock must stay stable
  provider-facing visual context summaries now include that creative-direction memory too, which helps short follow-up turns stay anchored to the same idea even when the visible user message is underspecified

### `0.5.1-alpha` / build `2026.04.07.13`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  stop Sprint 6 in-chat visual cards from showing generic hardcoded metadata after the execution plan had already become much more precise
- What:
  chat visual message state now preserves the actual model, aspect ratio, workflow, and reference asset linkage for each run instead of only storing prompt and status
  polling generation snapshots now refresh that metadata from the backend prompt snapshot, so long-running or resumed chat visuals stay aligned with the true execution record
  the lightbox now shows the real execution model and aspect ratio for successful in-chat visuals instead of defaulting to a generic `Flux Schnell` and `1:1`

### `0.5.1-alpha` / build `2026.04.07.12`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  keep Sprint 6 chat continuity alive when a follow-up edit or image-guided run still needs a reference image but the user no longer has the original file attached in the composer
- What:
  direct in-chat visual execution can now fall back to the latest successful visual output from the same conversation when the assistant blueprint still expects a reference-guided workflow
  this helps follow-up edit and image-to-image runs stay anchored to the most recent generated result instead of failing immediately just because the current composer message is text-only
  reference-required runs still fail loudly if no current source and no prior successful visual output exists, so the workflow stays honest while becoming much less fragile

### `0.5.1-alpha` / build `2026.04.07.11`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  reduce Sprint 6 chat-side false positives and false negatives by letting the assistant's backend-authored intent decide whether an automatic in-chat visual run should begin
- What:
  after a chat message returns, the frontend now checks the assistant metadata and `generation_bridge` before auto-starting a visual generation run, instead of trusting only local regex heuristics from the user's draft
  analysis, prompt-help, presence, and casual-chat turns are now less likely to accidentally trigger image generation just because the local input matched a loose pattern
  if the assistant clearly returned a generation bridge plus generation capability, Chat still auto-runs the visual path, but now the decision is more server-authoritative and closer to the real backend interpretation of the turn

### `0.5.1-alpha` / build `2026.04.07.10`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  stop direct in-chat image runs from ignoring the assistant's backend-authored plan and falling back to a generic low-context generation request
- What:
  chat-triggered visual generation now prefers the returned assistant `generation_bridge` blueprint for prompt, negative prompt, model, width, height, steps, cfg scale, aspect ratio, output count, and any known reference asset
  this means a user can stay inside Chat and still get a run that reflects the backend-planned visual direction, instead of silently dropping to `flux-schnell`, `1:1`, and other hardcoded defaults
  if the assistant marks the run as reference-required and that source image is missing, Chat now fails with the real reason instead of a generic visual-generation error

### `0.5.1-alpha` / build `2026.04.07.09`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make Sprint 6 premium follow-up chat carry its active visual plan more explicitly into live provider requests instead of relying on plain prose alone
- What:
  provider-facing history messages now append a compact `Visual context` summary whenever a prior chat turn carries generation-bridge metadata such as workflow, model, aspect ratio, reference lock, prompt profile, or a follow-up refinement flag
  this means assistant turns that established an edit or generation plan can remind the live model of the locked execution shape even if the visible prose reply was more conversational
  the result should be stronger continuity on short follow-up refinements, especially when the user is iterating on an already-established image direction and the provider only sees a compact history window

### `0.5.1-alpha` / build `2026.04.07.08`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make Sprint 6 premium chat history feel less noisy and more focused on the active visual plan during follow-up turns
- What:
  provider request bodies now use a compact relevant-history selector instead of blindly forwarding the last ten chat messages
  the selected window keeps the latest assistant visual bridge, its linked user turn, the latest visual user message, and the most recent conversation turns, which protects important image/edit context while dropping more irrelevant chatter
  this should reduce follow-up drift and repetitive low-signal answers, especially when the user is iterating on an already-established visual direction

### `0.5.1-alpha` / build `2026.04.07.07`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make Sprint 6 follow-up visual chat feel more assistant-grade by telling the live model what prior workflow constraints must stay locked
- What:
  backend chat now builds a concise continuity summary for follow-up refinements and injects it into the premium chat system prompt, so the model sees when a turn is not a fresh request
  that continuity summary carries key locked constraints such as workflow, model plan, aspect ratio, and whether the source direction remains reference-locked
  this reduces the chance that a premium follow-up answer drifts away from the already-established visual plan even when the latest user turn is short and underspecified

### `0.5.1-alpha` / build `2026.04.07.06`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  move Sprint 6 reference continuity out of frontend-only recovery and into the backend-authored chat generation bridge itself
- What:
  chat generation blueprints and suggestion payloads now carry `reference_asset_id` when a visual reference is known, including follow-up edit or image-guided turns that inherit an earlier source image
  chat context now remembers the latest durable reference asset from prior bridge metadata or earlier user image turns, so follow-up refinements can preserve their source image even when the immediate message is text-only
  Create handoffs still keep the frontend ancestry fallback, but they now prefer the backend-provided reference linkage first, which makes Sprint 6 chat-to-Create/Edit execution feel more deterministic

### `0.5.1-alpha` / build `2026.04.07.05`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make Sprint 6 follow-up edit and image-guided handoffs recover their earlier reference image instead of only checking the immediate parent message
- What:
  chat suggestion execution now walks the assistant turn ancestry first and, when a suggestion is still visually reference-driven, falls back to the nearest prior user image turn in the conversation
  this means `plan_edit`, image-to-image, and reference-required `open_create` actions can keep their source asset through short follow-up turns like `bunu biraz daha soft yap`
  Sprint 6 chat-to-Create/Edit flows now lose less visual context before the user even reaches Compose, which makes the new missing-reference guardrail fire less often for honest follow-up use

### `0.5.1-alpha` / build `2026.04.07.04`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  stop chat-to-Create image-guided flows from silently degrading into the wrong generation path when the reference image is missing
- What:
  Create now treats `reference_mode=required` chat handoffs as a real execution constraint instead of a decorative hint
  when a reference-guided chat handoff reaches Create without a usable `reference_asset_id`, generation is blocked with an explicit error instead of silently falling back to a plain text-to-image request
  the Create header and CTA state now make this missing-reference situation visible before the user wastes a run on the wrong workflow

### `0.5.1-alpha` / build `2026.04.07.03`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make Sprint 6 chat-to-Create handoff preserve more of the assistant-authored execution plan for edit and image-guided flows
- What:
  chat suggestion handoff into Create now carries `negative_prompt` and, when available, `reference_asset_id`, instead of only the main positive prompt and model controls
  Create now respects those hidden handoff fields at generation time, so chat-driven edit or image-to-image directions keep more of their locked backend intent when the user moves into Compose
  the Create header now surfaces when a chat handoff expects a reference-guided pass, which makes assistant-driven edit flows feel less like context was silently dropped

### `0.5.1-alpha` / build `2026.04.07.02`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make Sprint 6 degraded chat feel more like a premium creative copilot when live providers are unavailable
- What:
  provider-unavailable chat replies are now profile-aware and action-oriented for generation, edit, prompt-help, and creative-guidance turns instead of collapsing into one generic fallback paragraph
  degraded generation replies now carry concrete direction such as prompt-profile lane and aspect ratio, so Studio can still feel useful when Gemini, OpenRouter, or another premium lane is down
  service-level and unit regression tests now lock this richer degraded-chat behavior, reducing the chance that future Sprint 6 work regresses back into repetitive filler responses

### `0.5.1-alpha` / build `2026.04.07.01`
- Date: `2026-04-07`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  keep Sprint 6 follow-up chat continuity from dropping the locked edit/reference blueprint on the next turn
- What:
  short refinement follow-ups now preserve the prior generation blueprint fields that should stay stable across turns, including workflow, model, aspect ratio, dimensions, steps, cfg scale, output count, and required-reference mode
  edit-oriented follow-up turns no longer silently degrade into a fresh non-reference generation plan when the user only says something like `bunu biraz daha soft yap`
  chat regression coverage now explicitly locks this continuity path in both unit and service-level tests, so future Sprint 6 work is less likely to re-break edit handoff quality

### `0.5.1-alpha` / build `2026.04.06.22`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make Studio chat feel less stateless during follow-up turns, especially when live providers degrade
- What:
  chat now derives a lightweight conversation context from prior assistant turns, including the last generation bridge and prior workflow
  short refinement follow-ups such as `bunu daha sinematik yap` can now inherit the previous generation or edit direction instead of falling back to a generic fresh-start response
  heuristic fallback replies and metadata now expose follow-up refinement state, prior workflow, and whether a previous generation bridge was carried forward

### `0.5.1-alpha` / build `2026.04.06.21`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  give premium chat a third high-quality provider lane instead of depending only on Gemini and OpenRouter
- What:
  chat routing now supports an optional `openai` provider with standard and premium model slots, so the premium copilot can use OpenAI when credentials are present without changing existing defaults
  explicit OpenAI model requests like `gpt-5.4` now resolve cleanly through the chat gateway instead of being forced into another provider lane
  the OpenAI chat integration uses the current Responses API message format for text and image inputs, keeping Studio aligned with the latest official OpenAI API shape
  `.env.example` now documents the optional `OPENAI_PREMIUM_MODEL` and the expanded set of supported chat providers

### `0.5.1-alpha` / build `2026.04.06.20`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  stop premium chat from repeatedly hammering broken providers and collapsing into the same degraded path
- What:
  chat provider routing now keeps an in-memory health and cooldown state per provider, so repeated Gemini or OpenRouter failures temporarily disable that provider instead of retrying the same broken lane multiple times in one turn
  premium chat and prompt-improve flows now skip providers that are still in cooldown, which makes degraded fallback faster and more deterministic when live provider credentials or quota are broken
  `/v1/healthz` chat routing summary now exposes provider cooldown status, remaining cooldown time, and the last failure shape, so local and future live debugging can see why the premium lane is degraded

### `0.5.1-alpha` / build `2026.04.06.19`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  turn chat suggested actions into real product flow instead of decorative chips
- What:
  chat suggestion clicks now execute structured payloads instead of only copying label text into the composer
  Create handoff now opens `/create` with the server-authored prompt, model, aspect ratio, steps, cfg scale, and output count from the assistant blueprint
  edit-oriented suggestion clicks now restore the source user attachments back into chat and switch the composer into the right mode, so the assistant can continue an edit plan without losing image context
  Compose now preserves incoming chat blueprint settings internally, which keeps chat-to-create generation closer to the backend-authored plan even before extra UI controls are added

### `0.5.1-alpha` / build `2026.04.06.18`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  stop degraded chat from repeating the same robotic fallback line and make provider outages visible in logs
- What:
  chat intent detection now recognizes Turkish smalltalk and presence-check turns such as `naber` and `orda misin`, so degraded chat no longer answers every casual message with the same prompt-shaping sentence
  heuristic fallback replies now acknowledge when the live chat provider lane is unavailable instead of pretending the premium model answered normally
  chat provider failures now emit structured backend warning logs with provider, model, routing context, and HTTP status when available, which makes local and future production debugging far less blind
  assistant fallback metadata now marks degraded provider status and a concrete fallback reason, so chat regressions are easier to diagnose from stored conversation state

### `0.5.1-alpha` / build `2026.04.06.17`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make chat suggestions carry enough structured context that frontend execution hooks can trust them later
- What:
  chat suggested actions now include a structured payload with intent, target surface, and generation bridge data instead of only a display label plus raw value string
  the action payload now mirrors the server-generated blueprint so Create/Edit handoff can consume a stable contract rather than parsing assistant prose
  service regressions now verify that premium assistant suggestions carry the same generation bridge data returned in chat metadata

### `0.5.1-alpha` / build `2026.04.06.16`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  turn chat-to-create handoff into something execution-ready instead of only returning a nicer prompt
- What:
  assistant metadata now carries a structured generation blueprint with workflow, model suggestion, aspect ratio, resolution, steps, cfg scale, and reference requirements
  premium chat can now suggest stronger default models and dimensions for editorial, product, interior, and stylized/fantasy directions
  the Create/Edit bridge is now explicit enough that frontend execution hooks can be added later without teaching the client how to infer generation settings from prose

### `0.5.1-alpha` / build `2026.04.06.15`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make Studio chat feel more like a premium creative copilot instead of a thin generic assistant
- What:
  premium chat now resolves a quality-first execution plan that prefers stronger multimodal models, especially when users are analyzing references or planning edits
  OpenRouter chat requests no longer bias toward the cheapest provider path, which reduces quality drift in premium conversations
  assistant metadata now carries a generation bridge with workflow, compiled prompt, and negative prompt so chat can hand users toward Create/Edit more cleanly without changing the UI
  health now reports chat routing defaults and configured premium/standard model lanes for operations visibility

### `0.5.1-alpha` / build `2026.04.06.14`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  fix the local backend startup regression introduced while moving durable metadata into the external runtime directory
- What:
  backend runtime path resolution now initializes `settings` before computing runtime data directories, so local startup no longer crashes on boot
  the external durable metadata path and health data-authority reporting from build `.13` remain intact

### `0.5.1-alpha` / build `2026.04.06.13`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  move Studio metadata authority closer to a production-safe runtime model instead of leaving durable state inside the workspace by default
- What:
  durable SQLite metadata now defaults to the external Studio runtime directory while still bootstrapping once from legacy workspace SQLite or JSON state
  repository-backed health detail now exposes data authority metadata such as backend kind, authority mode, active path, bootstrap source, and record count
  backend persistence seam gained explicit store description support so future Postgres/Supabase rollout can expose its authority path without leaking secrets

### `0.5.1-alpha` / build `2026.04.06.12`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  stop local Supabase auth from bouncing between `localhost` and `127.0.0.1` during Google sign-in
- What:
  local Studio OAuth callbacks now prefer the exact local origin that initiated the sign-in flow instead of forcing a different callback host
  configurable auth redirect base URLs still work for non-local environments, but local development now stays on one browser origin and avoids split storage/session state
  footer-visible build/version advanced again so the new local auth origin behavior is externally visible

### `0.5.1-alpha` / build `2026.04.06.11`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  reduce local Google login breakage caused by switching between `localhost` and `127.0.0.1`
- What:
  Studio now supports a dedicated `VITE_AUTH_REDIRECT_BASE_URL` and uses it for provider login callbacks instead of blindly trusting the current browser origin
  local development is now pinned to `http://127.0.0.1:5173/login?oauth=1`, which lines up better with the way the local stack launcher and auth debugging currently operate
  footer-visible build/version advanced again so this host-normalization pass is visible immediately

## Previous Build

### `0.5.1-alpha` / build `2026.04.06.10`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  remove the remaining local Google login blocker caused by missing PKCE code verifier state during browser callback handling
- What:
  Studio browser auth now uses the implicit Supabase OAuth callback flow instead of PKCE for the local SPA login path
  callback settlement still stays manual and deterministic in the app, but it now consumes access and refresh tokens from the callback hash instead of depending on a persisted PKCE code verifier
  footer-visible build/version advanced again so this auth fix is obvious on the login page

### `0.5.1-alpha` / build `2026.04.06.09`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  stop the Google callback race from falling back into a fake expired-session error, and move Studio runtime logs out of the repo before live operations get messy
- What:
  Supabase browser auth no longer auto-detects sessions from the callback URL; Studio now owns the OAuth callback settlement explicitly, buffers auth state changes during callback processing, and keeps a browser-side auth trace for debugging
  backend runtime logs now write to an external Studio runtime directory instead of the repo, and the local stack launcher now starts both frontend and backend while writing stdout/stderr into that same external log root
  Windows startup task helpers were added so the local Studio stack can auto-start on logon without manually reopening both servers

### `0.5.1-alpha` / build `2026.04.06.08`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make the remaining Google login failure observable instead of opaque
- What:
  backend auth now logs both the local JWT rejection reason and the Supabase `/auth/v1/user` rejection reason when `/auth/me` cannot accept a bearer token
  this gives us a concrete breadcrumb for the next failed login attempt instead of only surfacing `Invalid or expired session` in the UI
  build/version advanced again so this diagnostics pass is visible in the footer

### `0.5.1-alpha` / build `2026.04.06.07`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  stop duplicate OAuth callback processing in local development from scrambling a valid Google return
- What:
  OAuth completion is now single-flight at module scope, so the same callback URL is processed only once even under React StrictMode remount behavior
  this reduces duplicate code exchange / duplicate session pickup races that could leave the login page showing an invalid session after Google return
  footer-visible build/version advanced again so this callback-deduping fix is easy to verify

### `0.5.1-alpha` / build `2026.04.06.06`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  eliminate stale local Supabase/app session state from poisoning a fresh Google login callback
- What:
  provider sign-in now clears old browser and Studio auth state before redirecting to Google
  OAuth callback settlement now treats backend `invalid session` as recoverable once, refreshes the Supabase session, and retries `/auth/me`
  footer-visible build/version advanced again so this login hardening pass is externally visible

### `0.5.1-alpha` / build `2026.04.06.05`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  stop an OAuth race where the app could clear or miss the new session before the signed-in state settled
- What:
  OAuth completion now resolves `/auth/me` with the returned provider token before enabling the normal app auth query
  Studio no longer depends on immediate token-state mutation during callback completion, which reduces silent redirects back to `/login`
  footer-visible build/version advanced again so this auth race fix is externally visible

### `0.5.1-alpha` / build `2026.04.06.04`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  stop Google OAuth from bouncing users back to `/login` without finishing the session
- What:
  Studio browser auth now uses Supabase PKCE flow for provider sign-in instead of relying on the older implicit default
  login page now explicitly completes OAuth callbacks, exchanges auth codes when needed, retries session pickup briefly, and surfaces provider callback errors instead of silently looping
  build/version bookkeeping stayed in sync so the footer shows the new build immediately after the fix

### `0.5.1-alpha` / build `2026.04.06.03`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make Studio context and release discipline easier for any future coding agent or collaborator to follow
- What:
  added a dedicated `apps/studio/AGENTS.md` with Studio product identity, sprint context, auth regression rules, and mandatory version/build bookkeeping
  reinforced the rule that every meaningful Studio change must update `version.json`, the release ledger, and the maintenance map
  footer-visible build/version remains sourced from `version.json`, so build bumps stay visible in the UI

### `0.5.1-alpha` / build `2026.04.06.02`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  reduce false logout/login regressions during active local development and keep build visibility obvious in the UI
- What:
  frontend auth now keeps the last good identity snapshot during transient `/auth/me` failures instead of bouncing straight to login
  studio tokens now clear only on confirmed auth-session failure instead of any unrelated `401`
  Studio shell footer now shows both semantic version and concrete build number, matching the public footer convention

### `0.5.1-alpha` / build `2026.04.06.01`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  harden backend ownership, moderation, and public/share abuse controls before wider rollout
- What:
  identities now carry durable moderation strike, temp-block, and manual-review state
  new share links store hashed public tokens and support authenticated revoke/list flows
  asset delivery re-checks live owner/share/public scope so stale share access is denied after revoke
  security-oriented rate limits and owner health detail summary were added without changing the UI contract

### `0.5.1-alpha` / build `2026.04.05.02`
- Date: `2026-04-05`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  align generation runtime with a more durable, production-friendly lifecycle
- What:
  generation jobs now use the richer `queued/running/succeeded/...` lifecycle
  legacy `pending/processing/completed` data is coerced safely during transition
  frontend generation surfaces were made compatible with the new lifecycle values

### `0.5.1-alpha` / build `2026.04.05.01`
- Date: `2026-04-05`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  backend needed to become safer and more observable before live rollout
- What:
  SQLite became the durable local metadata default
  Postgres became the intended staging/production metadata path
  provider smoke harness was added for manual live verification
  queue fairness, entitlement policy, webhook idempotency, and asset protection were hardened

### `0.5.1-alpha` / build `2026.04.02.01`
- Date: `2026-04-02`
- Codename: `Identity`
- Status: `prelaunch`
- Why:
  stabilize authentication, privacy, and payment foundations
- What:
  SSO, GDPR-related account/export flows, and LemonSqueezy billing foundation work
