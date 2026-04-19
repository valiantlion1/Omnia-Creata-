# Operations And Releases

This file explains Studio's operational truth and closure discipline.
Treat `Controlled Public Paid Launch` as the active product frame, and read protected-beta language here as preserved baseline/closure logic rather than the main product story.

## Operational Truth

Studio operational truth lives in these files:
- [Version Manifest](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/version.json)
- [Release Ledger](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md)
- [Maintenance Map](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md)

Hidden operator truth for `surface -> tier -> provider -> model -> fallback -> cost` should now be read from owner health detail `ai_control_plane`, especially `ai_control_plane.surface_matrix`, instead of being reconstructed from scattered docs.

## Production Hardening Roadmap

The canonical alpha-to-production hardening plan now lives in the [Studio Production Roadmap](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_PRODUCTION_ROADMAP.md).
Use that document when sequencing Studio's move from the current prelaunch stack to beta, public launch, growth, and future hyperscale architecture.
It defines the capacity ladder, the eight hardening pillars, and the numbered work-package catalog future Codex sessions should implement against.

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
- protected staging operator scripts should generate one effective env file under the external runtime root, hydrate placeholder secrets from the host environment when available, and keep Docker/preflight/verify aligned to that same env truth
- protected staging verify should default to the host-reachable forwarded URL for local Docker proofs unless an explicit verify URL override is provided
- protected staging verify should also sync the latest external `local-verify-latest.json` into the staging runtime root before owner-token checks, so startup verification stays visible inside staging owner health detail
- protected staging verify should also sync the latest external `provider-smoke-latest.json` into the staging runtime root before owner-token checks, so staging truth does not report a fake smoke gap while the current build already has local provider proof
- provider smoke remains visible in launch-readiness during protected-beta hardening, but it should not be mistaken for a standalone staging blocker when the selected provider lanes are already proven
- provider smoke truth should record which surface was tested (`chat` vs `image`) and whether the latest smoke report belongs to the current build; stale smoke proofs must not quietly soften launch warnings
- closure should not treat a configured launch-grade provider as healthy-for-launch unless that exact provider has a successful current-build live smoke result; runtime health without current-build smoke proof is still not closure-grade
- protected beta now narrows that launch-grade definition deliberately:
  - chat launch-grade means the selected protected-beta chat provider only
  - image launch-grade means the selected protected-beta image provider only
  - backup providers can exist, but they do not count as closure-grade proof until explicitly promoted
- smoke interpretation should aggregate probes per provider/surface so an expected-failure validation run does not overwrite a real successful smoke result for the same lane
- provider truth should also show whether chat and image lanes are merely configured for paid use or actually redundancy-safe; a single billable lane is not the same thing as a resilient rollout shape
- OpenAI Image now counts as the protected-beta launch-grade image lane too; smoke coverage and owner truth should not keep speaking as if only `fal` and `Runware` can satisfy image proof
- provider economics should not call a single healthy managed image lane `public_paid_usage_safe`; broader paid safety only becomes true once the launch-grade mix is also redundancy-safe
- chat surfaces should also distinguish static quick starts and degraded heuristic fallback from real live-provider assistant output; users should not need operator tools just to tell that difference
- chat metadata should also carry an explicit response mode (`live_provider_reply`, `premium_lane_unavailable`, `degraded_fallback_reply`) so UI honesty does not depend on reverse-engineering prose
- Pro image routing should keep managed launch-grade providers ahead of fallback-only lanes even on balanced non-premium prompts; fallback-only routes are for honesty under constraint, not the default when a selected managed lane is available
- owner truth should also expose per-provider diagnostics directly, including credential presence, runtime availability, cooldown/circuit state, recent failure state, and current-build smoke status, so provider debugging does not require terminal-only memory
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

Live provider smoke can now also load an explicit env file before Studio settings initialize:
- `python apps/studio/backend/scripts/provider_smoke.py --env-file apps/studio/deploy/.env.staging --enable-live-provider-smoke --surface chat --provider all`
- `python apps/studio/backend/scripts/provider_smoke.py --env-file apps/studio/deploy/.env.staging --enable-live-provider-smoke --surface image --provider all`
- when those runs use the same build and the same env source, Studio now merges them into one external `provider-smoke-latest.json` report instead of letting the second surface erase the first
- the protected-beta backend matrix can now be re-run consistently through `powershell -ExecutionPolicy Bypass -File apps/studio/ops/verify-protected-beta.ps1`

If you pass an owner bearer token to the verify script, it will also inspect `/v1/healthz/detail` and include launch-readiness truth in the deployment verification report.
With an owner bearer token present, staging verify now enforces the protected-beta closure gate by default; if `closure_ready` is still false, the verify command should fail instead of quietly passing with warnings.
Protected staging operator scripts now also default to a dedicated external staging runtime root and a host-reachable verify URL, so local Docker proofs can still exercise the official closure loop without relying on the public staging hostname being reachable from the same machine.
Protected staging operator scripts should accept both relative and absolute env-file paths during the start -> verify handoff; the official loop now resolves env paths once and keeps that absolute truth all the way through verify.

Protected beta closure rule:
- `local verify` passing is necessary but not sufficient
- protected staging must also pass `deploy/verify-studio-staging.ps1`
- that staging verify must be run with an owner bearer token
- the resulting deployment report should say `closure_ready=true`
- remaining warnings at that point should only belong to explicitly allowed provider/economics domains

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
- current launch truth

## Health Of The Documentation System

The documentation system is healthy when:
- a new agent can orient quickly
- a human can tell what changed recently
- a sprint can be explained without digging through chat logs
- product intent can be recovered from the repo itself
- shell route aliases like `/billing` and `/plan` resolve consistently in both guest and signed-in flows instead of drifting away from the router contract
