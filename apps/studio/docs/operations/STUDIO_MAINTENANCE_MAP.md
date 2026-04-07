# Studio Maintenance Map

Last updated: 2026-04-07

## Current baseline

- Backend regression tests pass.
- Root `repo:check` passes.
- Login/signup currently support Google plus email/password only.
- UI is intentionally in preservation mode unless explicitly requested.
- Frontend is under active Antigravity work, so UI-side `type-check` / build status should be re-checked after each frontend merge wave.

## Recent stabilization wins

- Failed in-chat image runs now show an honest blurred blocked card instead of collapsing into a bare text error, which makes it clearer that Studio did not get a real image back and is refusing to fake a finished result.
- Broad bug sweep truth is stronger now: failed generations keep the last real provider attempt instead of the originally planned lane, so retryable image failures no longer mislabel where they actually died.
- External operator reports now load correctly even when written with UTF-8 BOM, which fixes a false-negative health bug where startup verification could exist on disk but still look missing from owner health detail.
- Backend version truth now exposes the running `bootBuild`, and local startup/verify scripts compare against that runtime build instead of only the live manifest, so stale backend processes are easier to catch during always-on checks.
- Provider health snapshots now respect recent runtime failures and open circuits even when a provider's static `health()` payload still says `healthy`, which makes launch-readiness more honest after real chat or image provider outages.
- Studio now includes a repo-local Codex launch-ops skill under `apps/studio/.agents/skills`, which gives automations and future agents one bounded workflow for local verify, protected staging verify, runtime reports, provider smoke handling, and release-bookkeeping audits.
- Sprint 8 protected staging verification now round-trips owner-only health detail and records an explicit `closure_ready` decision plus `closure_gaps`, so operator truth no longer stops at a terminal warning/pass summary.
- Sprint 8 staging startup now fails fast when Docker is missing, which makes the protected staging operator path less ambiguous on machines that only support the stable local loop.
- Sprint 8 build truth is now live instead of startup-frozen: backend `/v1/version` reads the current Studio manifest on demand, which keeps operator verification and footer checks aligned after build bumps.
- Sprint 8 owner health and launch-readiness now also understand the latest external deployment verification report, so protected deploy truth joins startup verification, runtime logs, and provider smoke on the same operator surface.
- Sprint 8 now has a protected staging operator loop: `deploy/start-studio-staging.ps1` runs preflight plus compose bring-up, and `deploy/verify-studio-staging.ps1` writes an external deployment verification report after checking build, public login shell, health, and optional owner-only launch-readiness detail.
- Sprint 8 local operator truth is now durable: `verify-studio-local.ps1` writes its latest pass/fail report under the external runtime root, stable startup refreshes that report automatically, and owner health detail now surfaces both `startup_verification` and `runtime_logs`.
- Broad end-to-end review is now complete, and the next sprint family has been reset from repo truth instead of chat memory alone.
- Sprint 8 has started with the first protected staging / always-on deployment pack under `apps/studio/deploy`, including Dockerfiles for web/backend, an nginx reverse-proxy SPA config, and a compose topology with postgres, redis, backend, worker, and web services.
- Launch readiness now treats premium chat health as runtime truth instead of raw credential truth; if all configured premium chat lanes are in cooldown or failure state, readiness marks that as a real blocker.
- Local startup now defaults to stable always-on backend mode; hot reload is still available, but it must be requested explicitly instead of being the default path behind the logon task.
- Local always-on startup now also waits for backend/frontend readiness and has an explicit `apps/studio/ops/verify-studio-local.ps1` check, so operator scripts prove a usable stack instead of only spawning processes.
- Stable local always-on mode now builds the frontend and serves it through preview mode on `127.0.0.1:5173`; hot reload remains available only via explicit `-HotReload`.
- Sprint 8 now has a deployment preflight guardrail: `backend/scripts/deployment_preflight.py` validates staging env files before compose boot so public URL, durable store, runtime split, and required secret mistakes are caught early.
- The deployment preflight command is now directly runnable from `apps/studio/backend/scripts`, not only import-safe in tests.
- Bug sweep found and fixed a broad frontend styling regression where broken placeholder tokens like `rgb(var() / )` had spread across theme/public/product surfaces; Studio web styling now renders valid colors again and the repeated `/noise.png` build warning is gone.
- Historical local-owner / ComfyUI memory has been explicitly deprecated in repo docs and env examples so future planning cannot mistake removed paths for active product behavior.
- Sprint 6 follow-up chat generation bridges now preserve prior negative-prompt guardrails, so refinement passes keep earlier protection clauses like distortion cleanup instead of silently resetting them.
- Studio now has a repo-native wiki layer under `docs/wiki`, which centralizes product direction, architecture, sprint state, engineering standards, and planning rules into one durable memory system.
- Sprint 6 follow-up chat context now carries a compact creative-direction summary from the last visual plan, so premium replies can refine the established idea itself instead of only preserving raw workflow/model constraints.
- Sprint 6 chat visual cards and lightbox metadata now preserve the actual execution model, aspect ratio, workflow, and reference linkage from the backend job snapshot instead of showing generic placeholder defaults after a run succeeds.
- Sprint 6 in-chat edit and image-guided runs can now reuse the latest successful visual output from the same conversation as a fallback reference asset, which makes text-only follow-up refinements less brittle after a prior image already exists in chat.
- Sprint 6 in-chat visual auto-run now checks the assistant's returned intent and `generation_bridge` before starting a generation, which makes Chat less dependent on brittle frontend keyword guessing after the response lands.
- Sprint 6 direct in-chat visual runs now prefer the assistant-authored `generation_bridge` blueprint, so Chat can launch image generation with the backend-planned prompt, model, format, and reference constraints instead of generic hardcoded defaults.
- Sprint 6 premium chat history now appends a compact `Visual context` summary from generation-bridge metadata, so live providers can still see workflow, model, aspect ratio, reference lock, prompt profile, and follow-up refinement status even when the visible chat prose is shorter or more conversational.
- Sprint 6 premium chat provider calls now use a compact relevant-history window, so the live model sees the latest visual bridge and reference turn without dragging as much unrelated earlier chat noise into follow-up responses.
- Sprint 6 premium chat now injects a continuity summary into the live model system prompt for follow-up visual refinements, so short turns like `bunu biraz daha sinematik yap` stay anchored to the locked workflow, format, and reference constraints instead of reading like a fresh request.
- Sprint 6 chat generation bridges now carry `reference_asset_id` through follow-up edit and image-guided turns, so Create/Edit handoff can preserve the source asset directly from backend metadata instead of depending only on frontend ancestry recovery.
- Sprint 6 chat suggestion handoff can now recover the nearest prior visual user turn for edit/image-guided follow-ups, so a short refinement message no longer drops the original source image just because the immediate parent turn was text-only.
- Create now enforces `reference_mode=required` handoffs from chat as a real guardrail, so image-guided Sprint 6 flows fail loudly instead of silently degrading into plain text-to-image generation.
- Chat-originated reference handoffs now surface their missing-reference state directly in Create, which reduces invisible context loss during edit and image-to-image transitions.
- Sprint 6 chat-to-Create handoff now carries `negative_prompt` and any available `reference_asset_id`, so edit and image-guided flows preserve more of the assistant-authored execution plan when leaving Chat for Compose.
- Create now recognizes when a chat handoff expects a reference-guided pass, which makes assistant-led edit flows more transparent instead of silently downgrading into a generic prompt-only transfer.
- Degraded Sprint 6 chat replies are now profile-aware and action-oriented, so provider outages no longer force every generation or prompt-help turn into the same generic fallback paragraph.
- Product, editorial, and other prompt-profile lanes now shape fallback copy with concrete next-pass cues such as aspect ratio, workflow, and locked-reference intent, which makes broken premium-provider moments less useless for the user.
- Short follow-up chat refinements now preserve the prior blueprint’s locked edit/reference DNA, including workflow, model, size, steps, cfg scale, output count, and `reference_mode`, so Sprint 6 continuity does not silently drop back to a weaker fresh-start plan on the next turn.
- Chat suggested actions now execute structured server payloads on the frontend, so `Open Create` and edit-planning chips no longer behave like plain text shortcuts.
- Chat-to-Create handoff now preserves the backend-authored blueprint fields that matter most today: prompt, model, aspect ratio, steps, cfg scale, and output count.
- Edit-oriented chat suggestions can now restore the source user attachments into the composer before switching to Edit mode, which keeps image-context workflows from silently dropping their reference.
- Degraded chat no longer collapses casual Turkish messages into the same generic assistant line; smalltalk and presence checks now have their own heuristic fallback behavior when premium providers are down.
- Chat provider failures now write structured warning logs with provider, model, routing context, and HTTP status where available, which makes recurring Gemini quota and OpenRouter auth issues visible without digging through raw request traces.
- Assistant fallback metadata now marks `provider_status=degraded` plus an explicit fallback reason, so broken premium chat turns are easier to inspect from stored conversation state.
- Chat suggested actions now carry structured payloads with target surface and generation bridge data, which reduces future frontend guesswork when wiring assistant suggestions into Create/Edit execution.
- Chat assistant metadata now includes a structured generation blueprint, so backend responses can hand Create/Edit a model, size, workflow, and prompt package instead of only prose.
- Premium chat directions now choose stronger default generation models and aspect ratios based on prompt profile, which moves Studio closer to a true creative copilot flow.
- Premium chat now resolves a quality-first execution plan with explicit standard vs premium lanes, which makes Studio chat less dependent on a single flat provider/model default.
- Chat replies now carry a `generation_bridge` payload with compiled prompt, negative prompt, and recommended workflow so future Create/Edit handoff can stay server-authoritative.
- Chat health visibility now exposes premium/standard routing defaults and configured model lanes, which makes ops-level debugging easier when premium conversations feel off.
- Studio now has a dedicated `apps/studio/AGENTS.md`, so future AI agents and collaborators can pick up the product identity, sprint context, auth regression checklist, and version/build discipline faster.
- Google OAuth callback completion is now explicit in the frontend auth layer, so returning from the provider no longer depends on a silent implicit session parse to escape `/login`.
- Supabase browser auth now uses PKCE for provider sign-in, which makes Google callback exchange more deterministic and easier to reason about during local debugging.
- OAuth callback settlement now fetches `/auth/me` with the returned provider token before flipping the main app token state, which avoids a local auth-query race that could bounce valid Google logins back to `/login`.
- Provider sign-in now clears stale browser/app auth state before redirecting to Google, and callback settlement retries once through Supabase session refresh if the first `/auth/me` probe says the token is invalid.
- OAuth callback completion is now single-flight across local React remounts, which is important in dev because StrictMode can otherwise process the same Google callback twice and corrupt local auth state.
- Backend auth now logs both the local JWT rejection and the Supabase user-check rejection for bearer tokens that fail `/auth/me`, so the remaining login bug can be traced from logs instead of only the UI banner.
- Frontend auth now keeps the last known-good identity snapshot during transient auth refresh failures, which reduces false logouts while the local backend reloads or briefly hiccups.
- Studio token cleanup is now scoped to confirmed `/auth/me` auth failure instead of any generic `401`, so unrelated request issues are less likely to dump the user back to `/login`.
- The in-app Studio shell footer now mirrors the public footer by showing both semantic version and concrete build number, which makes build verification easier after each change.
- Identity records now carry moderation strike state, temp blocks, and manual review flags so unsafe generation prompts no longer fail silently and can escalate into durable backend enforcement.
- Share links now store hashed public tokens plus revocation metadata, while authenticated share list/revoke routes exist for safer owner-side control without changing the visible UI.
- Asset delivery tokens now support explicit share-id scope and re-check live share/public authorization on access, which closes stale-link gaps after revoke or deletion.
- Security-focused route protections now cover share creation, public share lookup, asset delivery, and clean export IP limits, and owner health detail now reports moderation/share counts for operations visibility.
- Billing logic started moving out of `service.py` into `backend/studio_platform/billing_ops.py`.
- LemonSqueezy webhook flow now restores `subscription_status` more consistently.
- Chat multimodal payload prep is now wired in `backend/studio_platform/llm.py`, so image attachments can reach Gemini/OpenRouter as real image inputs.
- Chat intent detection plus chat title/attachment prompt helpers now live in `backend/studio_platform/chat_ops.py` instead of being fully embedded in `service.py`.
- Generation contracts now support `reference_asset_id` plus `prompt_snapshot.workflow`, which is the first backend foundation for future image-to-image flow.
- Provider contracts now accept an optional reference image payload, and generation processing can load a reference asset before provider execution.
- Generation helper logic now owns prompt snapshot/job builders and generation completion/status helpers in `backend/studio_platform/generation_ops.py`.
- Chat-side image references can now be imported into asset storage and forwarded into generation as `reference_asset_id` without changing the visible UI.
- Generation runtime orchestration now lives in `backend/studio_platform/services/generation_runtime.py`, which reduces `service.py` responsibility during provider execution.
- Local ComfyUI generation can now upload a reference image and build an actual image-to-image workflow instead of silently falling back to text-to-image behavior.
- Generation dispatch now runs through `backend/studio_platform/services/generation_dispatcher.py`, which applies bounded concurrency instead of spawning unmanaged request-scoped tasks.
- Backend startup now re-queues incomplete generation jobs (`pending`, `processing`, `retryable_failed`) so a restart can resume work instead of leaving jobs stranded.
- Queue admission now honors configured generation capacity, so `max_concurrent_generations` and `max_queue_size` are finally part of runtime behavior.
- Persistence now has a first repository seam in `backend/studio_platform/repository.py`, so service/runtime code can stop depending directly on the raw JSON store implementation.
- Chat backend now supports message feedback, last-turn edit, assistant regenerate, and revert-friendly revision history so future ChatGPT-style controls can be added without redesigning the API.
- Generated image outputs now pass through `backend/studio_platform/services/asset_protection.py`, which applies a visible ownership overlay plus hidden provenance before storage.
- Asset delivery now defaults to the watermarked variant, while owner-only Pro clean export is available through a separate authenticated backend route.
- Local ComfyUI and machine-bound checkpoint support have been removed from the backend runtime, provider registry, and env/docs scaffolding so cloud/provider paths stay the only active generation lane.
- Plan entitlements are now centralized in `backend/studio_platform/entitlement_ops.py`, so premium chat modes, attachment access, clean export, queue priority, and plan-aware policy can stop leaking across routes and services.
- Lemon checkout now forwards `checkout_kind` through custom data so webhook handling can distinguish subscription upgrades from credit top-ups without guessing from the user’s current plan.

- Provider strategy is now locked in planning as `fal.ai` primary rollout, `Runware` secondary managed fallback, `Pollinations` dev-only/degraded fallback, and optional Hugging Face routing/evaluation support.
- Provider registry is now capability-aware, with workflow-sensitive selection for `text_to_image`, `image_to_image`, and `edit`, plus rollout ordering that prefers `fal.ai` first and skips incompatible providers instead of guessing.
- Generation admission now enforces per-plan in-flight job caps, stores queue priority on jobs, and blocks duplicate pending/running requests for the same user/project/prompt combination.
- Generation dispatcher now honors queue priority with bounded fairness, so Pro jobs can move first without completely starving standard jobs under sustained load.
- Lemon webhook processing now stores deterministic billing webhook receipts in state, which makes duplicate top-up/subscription deliveries idempotent and prevents Pro checkout `order_created` events from being mistaken for credit packs.
- Generation admission now also enforces a short burst window per plan, so repeated submit spam is throttled before a single identity can flood the queue with rapid-fire requests.
- `fal.ai` is no longer a placeholder provider entry; it now submits queue jobs, polls status, fetches results, downloads output media, and supports reference-image edit flows through a concrete backend adapter.
- `Runware` is no longer a placeholder fallback; it now issues real image inference requests, supports reference-image workflows, and can return provider-side cost metadata without changing the UI contract.
- Generation admission and billing webhook receipt lookups now have typed repository queries, which reduces how often `service.py` needs to inspect the raw state snapshot directly and moves persistence concerns a bit closer to the repository seam.
- Repository helpers now also cover health counts and identity-owned asset listing, so more of the service layer reads through typed persistence queries instead of collection-specific state inspection.
- Identity export now builds from repository-provided assets/posts/maps instead of taking a whole raw state snapshot first, which is another small step toward a real durable persistence boundary.
- The repository/store seam now supports read-only locked queries, so typed repository helpers can inspect state without paying for a full deep-copy snapshot every time a derived count or map is needed.
- Backend metadata can now run on a SQLite-backed store with one-time bootstrap from the legacy JSON state file, so Studio no longer has to treat `studio-state.json` as the only durable runtime path.
- Store backend selection now supports `postgres`, which is the intended staging/production metadata path while `sqlite` remains the local durable default.
- Repository helpers now cover identity-scoped projects, conversations, chat messages, generations, shares, and ledger reads, so more service read paths stop reaching for collection-wide lists first.
- Asset delivery now rejects deleted/trashed assets even if an older signed token still exists, which closes a stale-link access gap for owner/share/public preview flows.
- Generation runtime now supports explicit `all`, `web`, and `worker` modes, so the API process can stop executing jobs locally and hand queued generations off to a dedicated worker process when we are ready to run that topology.
- A dedicated backend worker entrypoint now exists at `apps/studio/backend/scripts/generation_worker.py`, which boots Studio in `worker` mode for the first safe step toward a split API/worker runtime.
- Worker mode now starts generation maintenance even when it boots with an empty queue, so jobs created later by the web/API process can still be discovered and processed without requiring a restart.

## Domain map

### Frontend

- `web/src/pages`
  - route-level screens
  - largest complexity hotspots live here
- `web/src/components`
  - shared presentation and shell components
  - avoid changing visual language casually
- `web/src/lib`
  - API client, auth/session glue, shared runtime helpers

### Backend

- `backend/main.py`
  - FastAPI bootstrap and middleware
- `backend/studio_platform/router.py`
  - API route wiring
- `backend/studio_platform/service.py`
  - central orchestration layer
  - still the main backend hotspot
- `backend/studio_platform/profile_ops.py`
  - identity export and deep-delete helpers
- `backend/studio_platform/project_ops.py`
  - project surface filtering plus project payload/update/delete helpers
- `backend/studio_platform/conversation_ops.py`
  - conversation listing, payload shaping, message filtering, chat exchange mutation, and cleanup helpers
- `backend/studio_platform/asset_ops.py`
  - asset rename/trash/restore/delete state mutations
- `backend/studio_platform/share_ops.py`
  - share record creation plus public share payload helpers
- `backend/studio_platform/providers.py`
  - model/provider integration layer
- `backend/studio_platform/services/generation_runtime.py`
  - generation execution loop and reference image loading
- `backend/studio_platform/services/generation_dispatcher.py`
  - in-process queue dispatch, concurrency control, and restart recovery handoff
  - now sits behind a runtime-mode split so API-only and worker-only processes are possible
- `backend/studio_platform/services/generation_broker.py`
  - shared queue broker abstraction for generation jobs
  - supports in-memory broker tests today and Redis-backed queue mode when available
  - now tracks claimed jobs plus stale-claim recovery so crashed workers do not silently strand brokered work
- `backend/studio_platform/services/asset_protection.py`
  - visible watermark overlay, hidden provenance embedding, and forensic verification helpers
- `backend/studio_platform/repository.py`
  - persistence seam over the current state store
  - target replacement point for durable SQLite and Postgres-backed metadata stores
- `backend/studio_platform/entitlement_ops.py`
  - server-side plan resolution for premium chat, clean export, share access, queue priority, and chat attachment limits
- `backend/studio_platform/store.py`
  - JSON fallback plus SQLite-backed metadata persistence

## Known hotspots

- `apps/studio/backend/studio_platform/service.py`
- `apps/studio/web/src/pages/MediaLibrary.tsx`
- `apps/studio/web/src/components/StudioShell.tsx`

## Safe next steps

1. Finish Sprint 8 by running the protected staging verify loop with an owner bearer token and confirming `closure_ready=true`.
2. Re-check launch readiness from a non-local runtime once protected staging actually exists.
3. Keep auth, billing, export/delete, queue recovery, and generation flows covered by regression tests.
4. Continue backend extraction from `service.py` into focused modules where it does not blur sprint boundaries.
5. Split large frontend files only behind visual no-regression checks.

## Caution areas

- Do not redesign auth or landing UI during stabilization work.
- Treat Play Store/mobile support as a later delivery track, not a current blocker.
- The `studio_platform/models/` package and backend test folder should be included in the final tracked source set.
- Manual-gated live provider smoke harness now exists at `apps/studio/backend/scripts/provider_smoke.py`; it exercises `fal` and `Runware` deliberately and only runs when `ENABLE_LIVE_PROVIDER_SMOKE=true`.
- Studio version tracking is now centralized through `apps/studio/version.json`, exposed by backend `/v1/version`, and mirrored in `apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md`.
- Generation job lifecycle has been upgraded toward durable worker semantics: canonical statuses now follow `queued`, `running`, `succeeded`, `failed`, `retryable_failed`, `cancelled`, `timed_out` while legacy values still coerce safely during transition.
- Runtime mode split now supports a shared queue handoff path: web processes can enqueue into a broker without processing locally, and worker processes can claim brokered jobs into the local dispatcher. If Redis is configured but unavailable, the backend now falls back gracefully instead of failing startup.
- Shared broker claims now receive heartbeats while local workers run jobs, and stale claims can be recycled back into the queue for crash recovery.
- Generation jobs now carry durable claim metadata (`claimed_by`, `claim_token`, `claim_expires_at`, `last_claim_heartbeat_at`), so worker ownership and stale-running recovery decisions no longer depend on broker state alone.
- Running-job recovery now treats expired claims deterministically: fresh claims are left alone, expired claims requeue when retry budget remains, and expired claims time out once retry budget is exhausted.
- Shared broker reconciliation now prunes missing jobs, terminal jobs, and duplicate queued copies of already-running jobs before the worker drains the queue, which reduces ghost work and double-processing risk.
- Worker claim leases are now configurable independently from stale-running timeout, which lets crash recovery happen faster without forcing aggressive running-job timeouts.
- `web` runtime without an active broker now degrades into explicit local processing instead of silently accepting jobs that would never be drained, so split-topology mistakes are visible in health and less likely to strand generations.
- Worker task cancellation now leaves shared broker claims intact until they expire, so shutdown/crash recovery follows the same stale-claim recycle path instead of pretending the claimed job finished cleanly.
- Google OAuth callback settlement is now fully owned by the Studio frontend: Supabase URL auto-detection is disabled, callback auth state is buffered during sign-in completion, and a capped browser-side auth trace is stored in session storage for future debugging without touching the repo.
- Local Google login no longer depends on Supabase PKCE verifier storage; the Studio SPA now uses the implicit browser callback flow and settles callback hash tokens manually, which avoids the `PKCE code verifier not found in storage` failure path.
- Local provider login now keeps the same local browser origin (`localhost` or `127.0.0.1`) that initiated sign-in, reducing split session storage during Google auth while still allowing an explicit configured redirect base for non-local environments.
- Backend runtime logs now default to an external Studio runtime directory (`%LOCALAPPDATA%\OmniaCreata\Studio\logs` on Windows), so operational logs and launcher stdout/stderr no longer belong inside the git workspace.
- `apps/studio/ops/start-studio-local.ps1` now launches both frontend and backend into that external runtime log directory, and companion install/remove scripts exist for a Windows logon startup task.
- Durable Studio SQLite metadata now defaults to the same external runtime root (`%LOCALAPPDATA%\OmniaCreata\Studio\data\studio-state.sqlite3` on Windows) instead of the workspace, while still bootstrapping once from legacy workspace SQLite or JSON state.
- Owner health detail now includes `data_authority`, exposing the active persistence backend, authority mode, live store path or redacted Postgres target, bootstrap source, and current record count.
- Backend bootstrap order now initializes `settings` before computing runtime data paths, preventing local startup crashes after the runtime-root persistence move.
- Sprint 6 chat routing now tracks in-memory provider health and cooldown state, so repeated Gemini/OpenRouter failures no longer re-hit the same broken provider/model lane multiple times before degrading.
- Chat routing summary now exposes per-provider cooldown status, last failure metadata, and remaining cooldown seconds, which makes degraded premium chat easier to diagnose from `/v1/healthz`.
- Sprint 6 premium chat now supports an optional OpenAI lane through the Responses API, including multimodal text-plus-image request shaping that matches the current official OpenAI contract.
- Chat provider config now accepts `openai` alongside `gemini`, `openrouter`, and `heuristic`, and explicit models like `gpt-5.4` resolve to the OpenAI lane instead of being coerced into another provider.
- Sprint 6 chat now derives a lightweight conversation context from prior turns, so short refinement follow-ups can reuse the last generation bridge and workflow instead of behaving like disconnected one-off prompts.
- Heuristic fallback metadata now records whether a reply is a follow-up refinement and whether a previous generation bridge was carried forward, which makes degraded chat continuity easier to inspect.
- Sprint 6 follow-up blueprint carry-forward now preserves prior edit/reference settings as well as prose direction, so chat-to-Create/Edit handoff keeps the locked execution plan instead of only reusing the previous prompt text.
- Sprint 6 degraded-chat guidance is now expected to stay profile-aware and useful; if premium providers are unavailable, fallback responses should still tell the user what lane, framing, or next pass Studio is steering toward.
- Sprint 6 chat handoff quality now includes non-visible execution metadata; if Chat opens Create, preserve assistant-authored negative prompt and reference asset context whenever the source turn can support it.
- Sprint 6 image-guided handoffs must not silently downgrade; if chat marks a Create handoff as reference-required and the reference is missing, block generation and tell the user why.
- Sprint 6 follow-up edit/image-guided suggestions should recover the nearest relevant earlier visual user turn before giving up on their source image; do not assume the immediate parent message is enough.
- Sprint 6 backend chat continuity should prefer durable reference linkage in `generation_bridge` itself; frontend ancestry recovery is still useful, but it must be a fallback rather than the only source of truth.
- Sprint 6 live model prompts should also see the active follow-up continuity constraints; carrying reference and workflow metadata in storage is not enough if the premium chat provider is still prompted like every turn is brand new.
- Sprint 6 live provider requests should also avoid shipping excess chat noise; when the conversation already has a visual bridge, prefer a small relevant-history slice over a flat last-N dump.
- Sprint 6 provider-facing history should preserve compact visual-plan metadata, not just raw prose; if a prior assistant turn carries `generation_bridge`, expose the key workflow/model/reference constraints to the live model in a short readable summary.
- Sprint 6 direct visual generation inside Chat should also prefer backend-authored planning over frontend guesses; if an assistant reply already returned a `generation_bridge`, use that execution plan before falling back to generic local defaults.
- Sprint 6 auto-run decisions inside Chat should also prefer backend-authored intent over frontend regex alone; once an assistant turn returns, let its metadata decide whether the message really belongs on a visual execution path.
- Sprint 6 reference-guided in-chat runs should try the latest successful conversation visual as a fallback source before failing; this keeps honest follow-up refinements alive without silently fabricating a new reference.
- Sprint 6 in-chat visual presentation should keep execution metadata honest too; if Chat already knows the real model, aspect ratio, workflow, or reference linkage for a run, do not replace it in the UI with generic placeholder labels.
- Sprint 6 follow-up continuity should preserve creative-direction memory as well as technical blueprint locks; short refinement turns should still carry what visual idea is being refined, not only how it was rendered.
- Sprint 6 follow-up continuity should preserve negative-prompt guardrails too; if an earlier pass already established important exclusions, do not let a short refinement silently drop them.
- Sprint 6 live provider prompts should see those preserved exclusion guardrails too; if the backend remembers earlier negative clauses but the active model call does not, refinement quality can still drift away from the protected execution lane.
- Sprint 6 should now be treated as complete; future chat work belongs to new sprint planning unless it directly supports Sprint 7 launch hardening or fixes a regression in the flagship chat surface.
- The Chat UI should expose trustworthy execution context, not just carry it invisibly; if the assistant already knows a run is degraded, reference-locked, refinement-based, or Create-ready, surface that compactly so handoff trust is visible to the user.
- Sprint 7 should now be treated as complete; future launch work should begin from the new launch-readiness report and a broad end-to-end review instead of starting another blind hardening loop.
- Sprint 8 should now be treated as active; deployment/staging/runtime truth is the priority until the product is no longer effectively trapped on a single PC.
- Live provider smoke runs should leave a durable operator breadcrumb outside the repo; if a smoke suite was executed, the latest result should survive in the external runtime directory and be visible from owner health detail.
- Owner health detail should answer launch questions explicitly. Service uptime is not enough; expose whether auth, durable state, runtime topology, premium provider lanes, external logs, and smoke freshness are actually launch-safe.
- The repo wiki should now be treated as the strategic memory layer; if product direction, planning rules, or architecture boundaries change, update `docs/wiki` instead of leaving that knowledge only in chat history.
