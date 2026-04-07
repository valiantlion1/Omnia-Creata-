# Studio Deployment Pack

This is the first bounded deployment pack for Studio after the initial sprint family.

It is meant to solve one concrete problem:
- stop treating a single local PC as the only runtime shape

## What this pack gives us

- a containerized frontend
- a containerized backend
- a dedicated worker process
- Redis for shared queue/runtime coordination
- Postgres for staging-style metadata authority
- one `docker compose` entrypoint for a protected staging-like stack

## Files

- `docker-compose.staging.yml`
- `.env.staging.example`
- `nginx.conf`
- `backend/Dockerfile`
- `web/Dockerfile`

## Intended use

Use this pack for:
- protected staging
- local VM/VPS trials
- a first always-on environment that behaves closer to launch topology

Do not treat it as the final production platform contract yet.

## Quick start

Prerequisite:
- Docker Desktop or another compatible `docker` CLI must be installed and available on `PATH`

1. Copy `.env.staging.example` to `.env.staging`
2. Fill in the real secrets
3. From `apps/studio/deploy`, run:

```powershell
python ..\backend\scripts\deployment_preflight.py --env-file .env.staging
```

If preflight passes, then run:

```powershell
docker compose -f docker-compose.staging.yml --env-file .env.staging up --build -d
```

Or use the bounded operator script:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-studio-staging.ps1
```

4. Open:
- frontend: `http://localhost:8080`
- backend health: `http://localhost:8080/api/v1/healthz`

## Important expectations

- Use `STATE_STORE_BACKEND=postgres`
- Keep `GENERATION_RUNTIME_MODE_WEB=web`
- Keep `GENERATION_RUNTIME_MODE_WORKER=worker`
- Point `PUBLIC_WEB_BASE_URL` to the real staging URL before testing OAuth
- Keep runtime logs and durable metadata outside the repo in launch environments

## Next step after this pack

This pack is the bridge into a real staging environment.

The next operational step is:
- run protected staging
- verify auth callbacks against the real staging URL
- run live provider smoke intentionally
- re-check `/v1/healthz/detail` launch readiness from that environment
- keep `python ..\backend\scripts\deployment_preflight.py --env-file .env.staging` in the operator loop before restarts or secret edits

After deploy, you can also verify the public staging stack explicitly:

```powershell
powershell -ExecutionPolicy Bypass -File .\verify-studio-staging.ps1
```

If you want the verify step to inspect owner-only launch readiness, pass an owner bearer token:

```powershell
powershell -ExecutionPolicy Bypass -File .\verify-studio-staging.ps1 -OwnerBearerToken "<owner-token>"
```

When an owner bearer token is present, the verify script now enforces the Sprint 8 closure gate by default. That means a staging run only counts as closure-ready when the resulting report says `closure_ready=true`.

If you want to enforce that gate explicitly from startup too, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-studio-staging.ps1 -OwnerBearerToken "<owner-token>" -RequireClosureReady
```

That verify step persists an external deployment verification report under the Studio runtime root, following the same non-repo operator-artifact discipline as local startup verification and runtime logs.

If the verify step is run from the same runtime root that Studio is using, owner health detail can also surface that latest deployment verification report back through the launch-readiness view.
That same owner detail now also exposes a single `launch_gate` object for operators, so protected-launch safety, blockers, warnings, and last verified build can be read without manually interpreting every readiness check.
Protected staging verification prefers that explicit launch gate when it exists, so the closure decision matches the same truth surface humans read from owner health detail.

Sprint 8 closure expectation:
- a passing local verify report is not enough on its own
- protected staging should also be verified through `verify-studio-staging.ps1`
- run that verify step with an owner bearer token whenever possible
- the resulting report now carries `closure_ready`, `closure_summary`, and `closure_gaps`
- Sprint 8 should only be treated as closed once protected staging verification reports `closure_ready=true`

## Local always-on companion

For local always-on use, prefer:

```powershell
powershell -ExecutionPolicy Bypass -File apps/studio/ops/start-studio-local.ps1
```

Stable local mode now:
- runs backend in stable mode
- builds the frontend
- serves the built frontend through `vite preview`
- waits for backend and frontend readiness instead of only spawning processes

For active coding with hot reload, use:

```powershell
powershell -ExecutionPolicy Bypass -File apps/studio/ops/start-studio-local.ps1 -HotReload
```

If you want to verify the local stack after startup, run:

```powershell
powershell -ExecutionPolicy Bypass -File apps/studio/ops/verify-studio-local.ps1
```

That verify step now writes `reports/local-verify-latest.json` under the external Studio runtime root, and owner health detail surfaces both that startup report and the current runtime-log snapshot.
