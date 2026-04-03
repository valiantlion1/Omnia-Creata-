# Studio Maintenance Map

Last updated: 2026-04-03

## Current baseline

- Frontend `type-check` passes.
- Frontend production `build` passes.
- Backend regression tests pass.
- Root `repo:check` passes.
- Login/signup currently support Google plus email/password only.
- UI is intentionally in preservation mode unless explicitly requested.

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
- `backend/studio_platform/providers.py`
  - model/provider integration layer
- `backend/studio_platform/store.py`
  - JSON state persistence

## Known hotspots

- `apps/studio/backend/studio_platform/service.py`
- `apps/studio/web/src/pages/MediaLibrary.tsx`
- `apps/studio/web/src/components/StudioShell.tsx`

## Safe next steps

1. Continue backend extraction from `service.py` into focused modules.
2. Keep auth, billing, export/delete, and generation flows covered by regression tests.
3. Clean analytics/runtime console noise without redesigning pages.
4. Split large frontend files only behind visual no-regression checks.

## Caution areas

- Do not redesign auth or landing UI during stabilization work.
- Treat Play Store/mobile support as a later delivery track, not a current blocker.
- The `studio_platform/models/` package and backend test folder should be included in the final tracked source set.
