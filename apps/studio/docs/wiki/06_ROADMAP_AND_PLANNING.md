# Roadmap And Planning

## Planning Philosophy

Studio should now be planned around release-shaping gates, not endless new sprint names.

Each planning step should answer:
- what contract is being protected
- what operator truth is being tightened
- what proof is missing today
- what would count as closure on the current build

## Active Track

### Protected Beta Hardening

Sequence:
- `contract`
- `truth sync`
- `provider proof`
- `closure`

Purpose:
- reduce backend/ops spaghetti risk before scale
- keep one canonical signed-in contract
- keep one artefact chain for the current build
- prove Docker staging and owner verification on the same truth surface

## Near-Term Order

### 1. Contract

- keep `/v1/assets`, `/v1/projects`, `/v1/settings/bootstrap`, `/v1/auth/me`, and `/v1/healthz/detail` stable
- avoid silent alias drift
- add route-level regressions before changing shared payloads

### 2. Truth Sync

- keep `version`, `local verify`, `provider smoke`, and `protected staging verify` on the same build
- mirror smoke/startup artefacts into the staging runtime root
- keep runtime logs classified as operator artefacts, not repo content

### 3. Provider Proof

- protected-beta chat lane: `OpenAI`
- protected-beta image lane: `OpenAI gpt-image-1-mini`
- owner-only premium image QA remains explicit
- other providers may exist as backups or experiments, but they do not count as launch-grade proof until they are deliberately promoted
- this narrow provider lock only exists for protected-beta proof; public-paid provider strategy stays open until after closure
- operator-facing `surface -> tier -> provider -> model` truth should live in `ai_control_plane.surface_matrix`, not in scattered docs or terminal memory

### 4. Closure

- local restart on current build
- local verify
- provider smoke
- staging bring-up
- owner-token staging verify
- truth-sync confirmation
- `closure_ready=true`

## Historical Sprint Map

The Sprint 1-9 chain remains useful as history, but it is no longer the active planning frame.

- Sprint 8 explains how deployment/staging arrived
- Sprint 9 explains why provider truth and economics became first-class
- the active system now uses `Protected Beta Hardening` as the working frame

## Rules

1. Do not start a new large backend feature while `Protected Beta Hardening` is still open.
2. Prefer one current truth source over several half-overlapping summaries.
3. If a bug fits one of the standard classes, document it that way:
   - contract drift
   - route integration gap
   - provider/config fragility
   - environment/staging drift
   - UI/backend truth mismatch
4. A passing test shard is not closure on its own; the artefact chain still has to prove the current build.
5. Public-paid planning should remain downstream of protected-beta closure, not compete with it.

## Backlog Shape

### Before Protected Beta Closure

- current-build provider proof
- staging truth and owner verification
- current-build artefact sync
- backend contract freeze

### After Protected Beta Closure

- broader provider economics decisions
- public-paid resilience
- launch polish and operator UX

### Later

- wider modality expansion
- deeper analytics
- broader team workflows
