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

## Previous Build

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
