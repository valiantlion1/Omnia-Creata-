# Studio Backend Changelog

Format: loose Keep-a-Changelog. Dates are ISO (YYYY-MM-DD).

The goal of this file is to give future AI agents (and humans) a fast way
to understand what changed and why, without having to read every commit.

---

## [Unreleased] — Wave 1 Hardening (2026-04-20)

### Added
- `studio_platform/resilience.py` — `CircuitBreaker` primitive with CLOSED /
  OPEN / HALF_OPEN state machine. Tunable via `STUDIO_CB_*` env vars.
- `observability/context.py` — `request_id` / `identity_id` `ContextVar`s
  for propagating correlation IDs across async call stacks.
- `config/feature_flags.py` — env-backed flag registry
  (`FEATURE_FLAGS.is_enabled("...")`) for kill-switching risky paths.
- `ARCHITECTURE.md` — AI-friendly module map and responsibility boundaries.
- `docs/operations/RUNBOOK.md` — operator playbooks for common incidents.

### Changed
- Module-level docstrings added to `service.py`, `store.py`, `providers.py`,
  `middleware.py`, `rate_limit.py`, `main.py`, `generation_broker.py`.
  No behavior change.
- Magic constants in `service.py` (`_MODERATION_RESET_WINDOW`,
  `_TEMP_BLOCK_AFTER_*`, `_PROVIDER_SPEND_GUARDRAIL_USER_MESSAGE`) now
  carry explicit WHY comments.
- `POSTGRES_WRITE_LOCK_KEY` in `store.py` now carries a warning comment
  about append-only semantics (changing the value would break concurrent
  rollouts).
- `build_generation_broker` docstring documents the intentional `None`
  return when `redis_url` is empty and the contract tests rely on.
- Removed unused `fastapi.middleware.cors.CORSMiddleware` import from
  `security/middleware.py`.

### Deferred (planned, not yet implemented)
- Wave 4: DB transaction boundary review, connection pool hardening,
  index audit, batch job recovery.
- Wave 5: Security tighten (RFC5322 email validation, prompt injection
  filter, cookie SameSite, secret rotation).
- Wave 8: Integration test coverage — job lifecycle, failure injection,
  asset delivery.
- Wildcard import cleanup in `services/chat_service.py` and
  `services/generation_service.py` (requires touching many call sites).
- Bare `except Exception` replacement across 40+ sites (requires per-site
  specific exception analysis).

### Notes for AI Maintainers
- `CircuitBreaker` is not yet wired into `generation_broker`, `providers`,
  or the Postgres pool. That integration is intentionally deferred so the
  utility can be reviewed and tested in isolation first.
- `observability.context.ContextVar`s are set up but not yet bound by
  middleware — the next wave will update `security/middleware.py` to call
  `bind_request_id` / `reset_request_id` around `call_next`.
- `FEATURE_FLAGS` snapshot is not yet exposed via `/healthz/detail`;
  planned for Wave 7.

---

## [0.6.0-alpha] — Build 167 (pre-hardening baseline)

See `apps/studio/version.json` and `docs/operations/STUDIO_RELEASE_LEDGER.md`
for full build history. Notable state at this point:

- 78 HTTP routes, 583 passing backend tests
- 4 Alembic migrations applied
- Prometheus metrics exposed at `/metrics`
- Protected-beta launch tier active
- Provider economics / multi-provider failover / paid image usage are the
  remaining public-launch blockers (tracked separately, require provider
  accounts and external economics work).
