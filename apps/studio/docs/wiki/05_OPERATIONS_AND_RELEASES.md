# Operations And Releases

## Operational Truth

Studio operational truth lives in these files:
- [Version Manifest](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/version.json)
- [Release Ledger](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md)
- [Maintenance Map](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md)

## Version Discipline

Every meaningful Studio change should:
- bump `build`
- keep `version` coherent with product maturity
- keep the visible footer build/version correct

## Logging Discipline

Runtime logs must not live inside the repo.

Preferred local Windows path:
- `C:\Users\valiantlion\AppData\Local\OmniaCreata\Studio\logs`

This rule exists because:
- logs are operational artifacts
- repo cleanliness matters
- launch readiness depends on usable, persistent logs

## Local Runtime Discipline

Local Studio should be easy to restart and inspect.

Important local expectations:
- frontend and backend should run from the current workspace snapshot
- backend version endpoint should match the visible footer build
- backend version endpoint should read the current Studio manifest, not a startup-frozen copy of old build metadata
- stale listeners should not silently serve old code
- stable always-on startup should be the default; hot reload should be an explicit opt-in for active coding
- startup helpers should wait for backend/frontend readiness instead of only spawning processes
- stable local frontend should prefer built preview mode over a dev server
- local verification should be scriptable through `apps/studio/ops/verify-studio-local.ps1`
- local verification should persist its latest result under the external runtime root so owner health detail can show the last proven startup state
- owner health detail should expose both the latest startup verification report and a snapshot of external runtime log files
- when a deployment verification report exists under the runtime root, owner health detail should surface that too so launch-readiness reflects deploy truth as well as startup truth
- owner health detail should also expose one explicit `launch_gate` answer, so operators can tell from a single object whether protected launch is currently safe, why it is blocked, which warnings remain, and what the last verified build was
- when protected staging verification runs with owner detail, it should prefer that explicit `launch_gate` object over re-deriving closure truth from lower-level readiness checks
- if protected staging bring-up cannot even start because Docker is missing, the staging env file is missing, preflight fails, or compose fails, the operator path should still leave an external blocked report behind instead of hiding the blocker in terminal scrollback only
- if protected staging verify itself cannot start cleanly or loses connectivity before it can finish, that verify failure should also overwrite the external deployment report with a blocked truth instead of leaving the last good report behind
- stable local startup should not accept a stale backend boot build after a version bump; if the first readiness pass still sees the old build, it should force one clean backend restart
- protected staging startup on Windows should not depend on a freshly restarted shell to find Docker; the operator script should also recognize the standard Docker Desktop install path and prepend it to the process PATH when Docker credential helpers would otherwise be invisible
- protected staging Docker proofs should bind-mount an external host runtime root into `/runtime`, so deployment reports and runtime logs can round-trip into owner health detail from the same outside-repo operator path
- protected staging verify should default to the host-reachable forwarded URL for local Docker proofs unless an explicit verify URL override is provided
- protected staging verify should also sync the latest external `local-verify-latest.json` into the staging runtime root before owner-token checks, so startup verification stays visible inside staging owner health detail
- provider smoke remains visible in launch-readiness during Sprint 8, but it is a Sprint 9 warning rather than a hard Sprint 8 deployment blocker by itself
- Sprint 9 provider smoke truth should record which surface was tested (`chat` vs `image`) and whether the latest smoke report belongs to the current build; stale smoke proofs must not quietly soften launch warnings
- Sprint 9 closure should not treat a configured launch-grade provider as healthy-for-launch unless that exact provider has a successful current-build live smoke result; runtime health without current-build smoke proof is still not closure-grade
- Sprint 9 smoke interpretation should aggregate probes per provider/surface so an expected-failure validation run does not overwrite a real successful smoke result for the same lane
- Sprint 9 provider truth should also show whether chat and image lanes are merely configured for paid use or actually redundancy-safe; a single billable lane is not the same thing as a resilient rollout shape
- Sprint 9 provider economics should not call a single healthy managed image lane `public_paid_usage_safe`; broader paid safety only becomes true once the launch-grade mix is also redundancy-safe
- Sprint 9 chat surfaces should also distinguish static quick starts and degraded heuristic fallback from real live-provider assistant output; users should not need operator tools just to tell that difference
- Sprint 9 chat metadata should also carry an explicit response mode (`live_provider_reply`, `premium_lane_unavailable`, `degraded_fallback_reply`) so UI honesty does not depend on reverse-engineering prose
- Sprint 9 Pro image routing should keep managed launch-grade providers ahead of fallback-only lanes even on balanced non-premium prompts; fallback-only routes are for honesty under constraint, not the default when `fal` or `Runware` is available
- Sprint 9 owner truth should also expose per-provider diagnostics directly, including credential presence, runtime availability, cooldown/circuit state, recent failure state, and current-build smoke status, so provider debugging does not require terminal-only memory
- a current-build owner-checked protected deployment verification report counts as valid deployment proof for launch-gate purposes; otherwise the staging closure loop can self-deadlock on the report produced by the same verify run

## Deployment Discipline

Studio now has a bounded deployment pack under `apps/studio/deploy`.

Use it to move toward:
- protected staging
- split web/worker topology
- postgres metadata authority
- redis-backed broker/runtime coordination

Do not confuse this with full public-launch readiness.

Before bringing up staging compose, run deployment preflight against the env file:
- `python apps/studio/backend/scripts/deployment_preflight.py --env-file apps/studio/deploy/.env.staging`

Protected staging now also has operator scripts:
- `powershell -ExecutionPolicy Bypass -File apps/studio/deploy/start-studio-staging.ps1`
- `powershell -ExecutionPolicy Bypass -File apps/studio/deploy/verify-studio-staging.ps1`

Sprint 9 live provider smoke can now also load an explicit env file before Studio settings initialize:
- `python apps/studio/backend/scripts/provider_smoke.py --env-file apps/studio/deploy/.env.staging --enable-live-provider-smoke --surface chat --provider all`
- `python apps/studio/backend/scripts/provider_smoke.py --env-file apps/studio/deploy/.env.staging --enable-live-provider-smoke --surface image --provider all`
- when those runs use the same build and the same env source, Studio now merges them into one external `provider-smoke-latest.json` report instead of letting the second surface erase the first

If you pass an owner bearer token to the verify script, it will also inspect `/v1/healthz/detail` and include launch-readiness truth in the deployment verification report.
With an owner bearer token present, staging verify now enforces the Sprint 8 closure gate by default; if `closure_ready` is still false, the verify command should fail instead of quietly passing with warnings.
Protected staging operator scripts now also default to a dedicated external staging runtime root and a host-reachable verify URL, so local Docker proofs can still exercise the official closure loop without relying on the public staging hostname being reachable from the same machine.
Protected staging operator scripts should accept both relative and absolute env-file paths during the start -> verify handoff; the official loop now resolves env paths once and keeps that absolute truth all the way through verify.

Sprint 8 closure rule:
- `local verify` passing is necessary but not sufficient
- protected staging must also pass `deploy/verify-studio-staging.ps1`
- that staging verify must be run with an owner bearer token
- the resulting deployment report should say `closure_ready=true`
- remaining warnings at that point should only belong to Sprint 9 domains such as premium provider reliability or economics

## Release Documentation Expectations

### Release Ledger

Use it for:
- build-by-build history
- why a change shipped
- what changed

### Maintenance Map

Use it for:
- stabilizations that matter operationally
- hotspots
- caution areas
- current safe assumptions

### Wiki

Use it for:
- durable product meaning
- architecture boundaries
- planning standards
- sprint truth

## Health Of The Documentation System

The documentation system is healthy when:
- a new agent can orient quickly
- a human can tell what changed recently
- a sprint can be explained without digging through chat logs
- product intent can be recovered from the repo itself
