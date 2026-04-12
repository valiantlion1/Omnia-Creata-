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
