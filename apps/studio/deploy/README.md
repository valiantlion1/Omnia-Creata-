# Studio Deployment Pack

This is the first bounded deployment pack for Studio after the initial sprint family.

It is meant to solve one concrete problem:
- stop treating a single local PC as the only runtime shape

Canonical launch stack:
- frontend: `Vercel`
- backend API: `Render`
- worker: `Render`
- auth / Postgres / storage: `Supabase`
- queue broker: `Render Key Value / Redis`
- billing backbone: `Paddle`

The Docker compose pack below still matters, but now as a bounded protected-staging proof loop and local topology rehearsal, not as the canonical public deployment target.

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
- `.env.platform.example`
- `nginx.conf`
- `verify-studio-platform.ps1`
- `../render.yaml`
- `../web/vercel.json`
- `backend/Dockerfile`
- `web/Dockerfile`

## Intended use

Use this pack for:
- protected staging
- local VM/VPS trials
- a first always-on environment that behaves closer to launch topology

Do not treat the Docker compose pack as the final public deployment contract.
For the public stack, use:
- `apps/studio/web/vercel.json` for the frontend host
- `apps/studio/render.yaml` for Render API/worker/redis
- `.env.platform.example` as the canonical non-local env checklist

## Quick start

Prerequisite:
- Docker Desktop or another compatible `docker` CLI must be installed
- the Docker engine itself must be running before protected staging bring-up; a visible `docker.exe` alone is no longer treated as enough
- `start-studio-staging.ps1` now also checks the standard Docker Desktop install path on Windows and prepends that directory to the current process `PATH`, so a fresh Docker install does not look missing just because the shell or Docker credential helper path is stale
- `start-studio-staging.ps1` and `verify-studio-staging.ps1` now also default to an external staging runtime root under `%LOCALAPPDATA%\OmniaCreata\Studio\staging`, which is bind-mounted into `/runtime` so deployment reports can round-trip back into owner health detail
- those scripts now also generate an effective staging env file under that runtime root, hydrate placeholder secrets from host environment variables when available, and keep preflight, Docker, and verify aligned to the same env snapshot
- the staging helper now also mirrors `SUPABASE_URL` and `SUPABASE_ANON_KEY` into the frontend-facing `VITE_SUPABASE_*` build args when those public browser values are not set separately, so the login shell does not render as a blank page under Docker just because only the server-side names were populated
- closure-grade staging verification should also have an owner bearer token ready through `STUDIO_HEALTH_DETAIL_TOKEN`, `-OwnerBearerToken`, or the interactive `-PromptForOwnerToken` flow

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

## Canonical platform preflight

For the real launch stack, copy `.env.platform.example` to `.env.platform`, fill the real public URLs and secrets, then run:

```powershell
python ..\backend\scripts\deployment_preflight.py --env-file .env.platform
```

That preflight now validates:
- canonical `Vercel + Render + Supabase + Redis + Paddle` stack alignment
- `PUBLIC_WEB_BASE_URL` and `PUBLIC_API_BASE_URL`
- Supabase-backed asset storage
- split API/worker runtime
- Paddle billing backbone presence

After a live Vercel/Render staging deploy exists, verify it through:

```powershell
powershell -ExecutionPolicy Bypass -File .\verify-studio-platform.ps1
```

And with owner truth:

```powershell
powershell -ExecutionPolicy Bypass -File .\verify-studio-platform.ps1 -PromptForOwnerToken -RequireClosureReady
```

## Recommended secret storage on Windows

Keep repo env files as topology checklists and placeholder maps. Store long-lived secrets once at the Windows `User` environment level, then let Studio hydrate them into runtime-only effective env files under `%LOCALAPPDATA%\OmniaCreata\Studio\staging\config`.

Current launch-critical secret families:
- Core platform: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`
- Active provider lanes: `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `RUNWARE_API_KEY`
- Optional extra providers: `GEMINI_API_KEY`, `FAL_API_KEY`, `HUGGINGFACE_TOKEN`
- Billing when Paddle is ready: `PADDLE_API_KEY`, `PADDLE_WEBHOOK_SECRET`, `PADDLE_CHECKOUT_BASE_URL`
- Owner/admin truth: `STUDIO_OWNER_EMAIL`, `STUDIO_OWNER_EMAILS`, `STUDIO_ROOT_ADMIN_EMAILS`

Example one-time setup:

```powershell
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY", "<value>", "User")
[Environment]::SetEnvironmentVariable("OPENROUTER_API_KEY", "<value>", "User")
[Environment]::SetEnvironmentVariable("RUNWARE_API_KEY", "<value>", "User")
```

`start-studio-local.ps1`, `start-studio-staging.ps1`, and `verify-studio-staging.ps1` now read those user-level variables automatically, so you do not have to keep retyping provider, billing, or owner secrets into repo-local env files.

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
powershell -ExecutionPolicy Bypass -File .\verify-studio-platform.ps1
```

If you want the verify step to inspect owner-only launch readiness, pass an owner bearer token:

```powershell
powershell -ExecutionPolicy Bypass -File .\verify-studio-platform.ps1 -OwnerBearerToken "<owner-token>"
```

If you do not want that token living in shell history or command arguments, use the prompt flow instead:

```powershell
powershell -ExecutionPolicy Bypass -File .\verify-studio-platform.ps1 -PromptForOwnerToken
```

By default the verify script now targets the local forwarded staging URL (`http://127.0.0.1:<WEB_PORT>`) for Docker proofs.
If you need different operator behavior, set one or both of these optional values in `.env.staging`:

```dotenv
STAGING_VERIFY_BASE_URL=http://127.0.0.1:8080
STAGING_RUNTIME_ROOT=C:\Users\<you>\AppData\Local\OmniaCreata\Studio\staging
```

When an owner bearer token is present, the verify script now enforces the Protected Beta Hardening closure gate by default. That means a staging run only counts as closure-ready when the resulting report says `closure_ready=true`.

If you want to enforce that gate explicitly from startup too, use:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-studio-staging.ps1 -OwnerBearerToken "<owner-token>" -RequireClosureReady
```

Or prompt once, let the script use it for the run, then restore the previous shell env afterward:

```powershell
powershell -ExecutionPolicy Bypass -File .\start-studio-staging.ps1 -PromptForOwnerToken -RequireClosureReady
```

When `-RequireClosureReady` is used, startup now fails before compose bring-up if the owner bearer token is missing. The verify script also fails early on the same condition instead of silently turning a requested closure run into an advisory-only pass.
Protected staging scripts now also prefer handing that token to Python through a short-lived process environment variable instead of a command-line argument, which reduces local exposure in shell history and process listings.

That verify step persists an external deployment verification report under the Studio runtime root, following the same non-repo operator-artifact discipline as local startup verification and runtime logs.
It also mirrors the latest local startup verification and provider smoke reports into the staging runtime root before owner checks, so staging truth does not drift away from current-build local proof.

If the verify step is run from the same runtime root that Studio is using, owner health detail can also surface that latest deployment verification report back through the launch-readiness view.
That same owner detail now also exposes a single `launch_gate` object for operators, so protected-launch safety, blockers, warnings, and last verified build can be read without manually interpreting every readiness check.
Protected staging verification prefers that explicit launch gate when it exists, so the closure decision matches the same truth surface humans read from owner health detail.
If staging bring-up cannot even start because Docker is missing, the env file is missing, preflight fails, or compose fails, `start-studio-staging.ps1` now writes an external blocked report to `reports/protected-staging-verify-latest.json` so Protected Beta Hardening keeps an honest environment blocker trail outside the repo too.
If `verify-studio-staging.ps1` cannot even begin cleanly because its env file is missing, or if `deployment_verify.py` cannot reach the deployed stack or owner health detail, that same external report is now overwritten with an explicit blocked verification record instead of leaving the failure only in terminal output.

Protected Beta Hardening closure expectation:
- a passing local verify report is not enough on its own
- protected staging should also be verified through `verify-studio-staging.ps1`
- run that verify step with an owner bearer token whenever possible
- the resulting report now carries `closure_ready`, `closure_summary`, and `closure_gaps`
- Protected Beta Hardening should only be treated as closed once protected staging verification reports `closure_ready=true`

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
