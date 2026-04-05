# Studio Maintenance Map

Last updated: 2026-04-05

## Current baseline

- Backend regression tests pass.
- Root `repo:check` passes.
- Login/signup currently support Google plus email/password only.
- UI is intentionally in preservation mode unless explicitly requested.
- Frontend is under active Antigravity work, so UI-side `type-check` / build status should be re-checked after each frontend merge wave.

## Recent stabilization wins

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

1. Continue backend extraction from `service.py` into focused modules.
2. Move from JSON-backed state to a durable repository layer without breaking local owner mode.
3. Keep auth, billing, export/delete, queue recovery, and generation flows covered by regression tests.
4. Clean analytics/runtime console noise without redesigning pages.
5. Split large frontend files only behind visual no-regression checks.

## Caution areas

- Do not redesign auth or landing UI during stabilization work.
- Treat Play Store/mobile support as a later delivery track, not a current blocker.
- The `studio_platform/models/` package and backend test folder should be included in the final tracked source set.
- Manual-gated live provider smoke harness now exists at `apps/studio/backend/scripts/provider_smoke.py`; it exercises `fal` and `Runware` deliberately and only runs when `ENABLE_LIVE_PROVIDER_SMOKE=true`.
- Studio version tracking is now centralized through `apps/studio/version.json`, exposed by backend `/v1/version`, and mirrored in `apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md`.
- Generation job lifecycle has been upgraded toward durable worker semantics: canonical statuses now follow `queued`, `running`, `succeeded`, `failed`, `retryable_failed`, `cancelled`, `timed_out` while legacy values still coerce safely during transition.
