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
- stable local startup should not accept a stale backend boot build after a version bump; if the first readiness pass still sees the old build, it should force one clean backend restart

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

If you pass an owner bearer token to the verify script, it will also inspect `/v1/healthz/detail` and include launch-readiness truth in the deployment verification report.
With an owner bearer token present, staging verify now enforces the Sprint 8 closure gate by default; if `closure_ready` is still false, the verify command should fail instead of quietly passing with warnings.

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
