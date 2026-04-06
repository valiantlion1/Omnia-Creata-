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

### `0.5.1-alpha` / build `2026.04.06.04`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  stop Google OAuth from bouncing users back to `/login` without finishing the session
- What:
  Studio browser auth now uses Supabase PKCE flow for provider sign-in instead of relying on the older implicit default
  login page now explicitly completes OAuth callbacks, exchanges auth codes when needed, retries session pickup briefly, and surfaces provider callback errors instead of silently looping
  build/version bookkeeping stayed in sync so the footer shows the new build immediately after the fix

## Previous Build

### `0.5.1-alpha` / build `2026.04.06.03`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  make Studio context and release discipline easier for any future coding agent or collaborator to follow
- What:
  added a dedicated `apps/studio/AGENTS.md` with Studio product identity, sprint context, auth regression rules, and mandatory version/build bookkeeping
  reinforced the rule that every meaningful Studio change must update `version.json`, the release ledger, and the maintenance map
  footer-visible build/version remains sourced from `version.json`, so build bumps stay visible in the UI

### `0.5.1-alpha` / build `2026.04.06.02`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  reduce false logout/login regressions during active local development and keep build visibility obvious in the UI
- What:
  frontend auth now keeps the last good identity snapshot during transient `/auth/me` failures instead of bouncing straight to login
  studio tokens now clear only on confirmed auth-session failure instead of any unrelated `401`
  Studio shell footer now shows both semantic version and concrete build number, matching the public footer convention

### `0.5.1-alpha` / build `2026.04.06.01`
- Date: `2026-04-06`
- Codename: `Foundation`
- Status: `prelaunch`
- Why:
  harden backend ownership, moderation, and public/share abuse controls before wider rollout
- What:
  identities now carry durable moderation strike, temp-block, and manual-review state
  new share links store hashed public tokens and support authenticated revoke/list flows
  asset delivery re-checks live owner/share/public scope so stale share access is denied after revoke
  security-oriented rate limits and owner health detail summary were added without changing the UI contract

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
