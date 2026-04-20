# Studio Backend — Architecture Map

This file is the **entry point for AI agents and human engineers** who need
to understand the Studio backend before making changes. Read this first,
then dive into the specific module you need.

Last updated: 2026-04-20 (Wave 1 hardening). Keep this up to date when
module boundaries change.

---

## At a Glance

- **Framework:** FastAPI (async), Pydantic v2, Uvicorn.
- **State:** Pluggable store backend (JSON / SQLite / Postgres) behind a
  single `StudioPersistence` interface.
- **Queue:** Redis (via `GenerationBroker`) in production; local fallback
  queue in single-process dev.
- **Rate limiting:** Redis sliding-window with in-memory dev fallback.
- **Auth:** JWT-based; Supabase adapter available; session management via
  `security/auth.py`.
- **Observability:** Prometheus metrics at `/metrics`; structured logs with
  correlation IDs via `observability/context.py`.
- **Resilience:** Circuit breakers in `studio_platform/resilience.py`.

---

## Module Map

```
apps/studio/backend/
├── main.py                     # FastAPI entrypoint + bootstrap ordering
├── runtime_logging.py          # Logging config applied at import time
│
├── config/
│   ├── env.py                  # Settings (Pydantic BaseSettings)
│   └── feature_flags.py        # Env-backed flag registry (NEW)
│
├── security/
│   ├── auth.py                 # JWT session lifecycle, dependencies
│   ├── supabase_auth.py        # Supabase JWT adapter
│   ├── middleware.py           # RequestLoggingMiddleware + helpers
│   ├── ingress.py              # Body size caps, request_id resolution
│   ├── maintenance.py          # MaintenanceMiddleware (503 switch)
│   ├── rate_limit.py           # InMemory/Redis limiter + factory
│   ├── moderation.py           # Content moderation engine
│   ├── headers.py              # Security header middleware
│   ├── cors.py                 # CORS helper
│   ├── redaction.py            # Sensitive-text redaction utilities
│   └── logging.py              # SecurityLogger + structured audit events
│
├── observability/
│   ├── metrics.py              # PrometheusMetricsCollector
│   └── context.py              # request_id / identity_id ContextVars (NEW)
│
├── studio_platform/            # Domain code
│   ├── service.py              # StudioService — top-level orchestrator
│   ├── store.py                # JSON / SQLite / Postgres backends
│   ├── store_schema.py         # Postgres table definitions
│   ├── providers.py            # External generation vendor adapters
│   ├── router.py               # FastAPI APIRouter — every HTTP endpoint
│   ├── repository.py           # StudioRepository — transaction helpers
│   ├── resilience.py           # CircuitBreaker utility (NEW)
│   ├── models/                 # Pydantic domain models
│   ├── models.py               # Backward-compat shim (re-exports)
│   ├── services/               # Feature-specific services
│   │   ├── chat_service.py
│   │   ├── generation_service.py
│   │   ├── generation_broker.py
│   │   ├── generation_runtime.py
│   │   ├── generation_dispatcher.py
│   │   ├── identity_service.py
│   │   ├── billing_service.py
│   │   ├── library_service.py
│   │   ├── project_service.py
│   │   ├── moderation_case_service.py
│   │   ├── public_service.py
│   │   ├── shell_service.py
│   │   ├── access_session_service.py
│   │   ├── asset_protection.py
│   │   ├── health_service.py
│   │   ├── launch_readiness.py
│   │   └── provider_* (truth, smoke, economics)
│   └── (many *_ops.py helper modules)
│
├── alembic/                    # DB migrations
├── scripts/
│   └── run_migrations.py       # Alembic runner entrypoint
└── tests/                      # 583+ tests
```

---

## Responsibility Boundaries

### `main.py`
**Owns:** singleton wiring, middleware stacking, app factory, lifespan.
**Never owns:** domain logic — always delegate to `StudioService`.

### `config/env.py`
**Owns:** all environment-driven configuration, Pydantic validation,
secret reveal helpers.
**Never owns:** stateful runtime objects — settings are immutable after load.

### `config/feature_flags.py`
**Owns:** env-backed boolean switches for risky code paths.
**Call sites:** `FEATURE_FLAGS.is_enabled("...")` — avoid magic strings.

### `security/*`
**Owns:** everything that protects the app from users and vice versa —
auth, rate limits, input sanitization, CSP headers, moderation.
**Never owns:** business logic that happens AFTER the request is accepted.

### `observability/*`
**Owns:** metrics collection, structured log helpers, correlation IDs.
**Call sites:** service-layer code imports `observability.context` to thread
the current request_id into log `extra={}` dicts.

### `studio_platform/service.py` (StudioService)
**Owns:** cross-cutting orchestration that touches >1 domain.
**Delegates to:**
- `self.billing` — entitlements, cost telemetry
- `self.chat` — conversation + message lifecycle
- `self.generation` — job submission + pricing
- `self.identity` — accounts, sessions, deletions
- `self.library` — media library queries
- `self.projects` — project CRUD
- `self.public` — anon/marketing endpoints
- `self.shell` — UI shell bootstrap payloads
- `self.health_service` — health probes
- `self.moderation_cases` — case lifecycle

### `studio_platform/store.py`
**Owns:** durable persistence (JSON / SQLite / Postgres).
**Invariant:** every mutation goes through `save`/`mutate` (advisory-locked).

### `studio_platform/providers.py`
**Owns:** upstream generation API adapters + registry.
**Invariant:** providers are concurrent-safe and report health via `health()`.

### `studio_platform/resilience.py`
**Owns:** circuit breaker primitive for fast-failing unhealthy subsystems.

### `studio_platform/services/generation_broker.py`
**Owns:** in-memory + Redis job queue + claim lifecycle.

---

## Request Lifecycle

```
Client
  │
  ▼
FastAPI app (main.py)
  ├─ CORSMiddleware
  ├─ MaintenanceMiddleware        (short-circuit if enabled)
  ├─ TrustedHostMiddleware        (staging/prod only)
  ├─ IngressLimitMiddleware       (body caps + request_id)
  ├─ @app.middleware              (timing + metrics + structured log)
  │
  ▼
security/auth.py dependencies    (JWT verify, identity bind)
  │
  ▼
studio_platform/router.py        (route handler)
  │
  ▼
StudioService method             (orchestration)
  │
  ├─ sub-service call             (e.g. self.generation.create_job)
  ├─ store read/write             (transaction inside)
  ├─ provider call                (through circuit breaker)
  └─ broker enqueue               (Redis or in-memory)
  │
  ▼
Pydantic response model          (validated, typed)
```

---

## "Where Do I Change X?" — AI Quick Reference

| Task | Primary file | Supporting files |
|------|-------------|------------------|
| Add an HTTP endpoint | `studio_platform/router.py` | Service method, Pydantic model, tests |
| Add a feature flag | `config/feature_flags.py` | Check sites, README env doc |
| Add a new provider | `studio_platform/providers.py` | `config/env.py`, `provider_smoke.py`, tests |
| Harden an external call | Wrap with `CircuitBreaker` from `resilience.py` | Emit metric for CB state |
| Add a domain field | `studio_platform/models/` | Alembic migration, repository, tests |
| Add a metric | `observability/metrics.py` | Record site + `/metrics` render |
| Add a log line | Use `logger.<level>("event_name", extra=log_context() \| {...})` | `observability/context.py` |
| New background task | `StudioService.initialize` (owns cancellation) | Graceful shutdown path |
| New auth requirement | `security/auth.py` + route dependency | Policy test |
| New setting | `config/env.py` (Pydantic field) | `.env.example`, README |

---

## Invariants (Do Not Break)

1. `StudioService.initialize()` is awaited exactly once before serving.
2. Postgres writes hold advisory lock `POSTGRES_WRITE_LOCK_KEY`.
3. Providers are concurrent-safe; no mutable instance state without a lock.
4. Rate limiters have `initialize()` called before first `check`.
5. Staging/production REQUIRE Redis URL; do not silently downgrade.
6. Correlation IDs (`request_id`) are bound by middleware and read via
   `observability.context.current_request_id()` — never passed as args.
7. Feature flags are read once at registry construction — a process restart
   is required to flip one. Do not add per-request flag reads to hot paths.
8. Circuit breakers fast-fail with `CircuitOpenError`; callers MUST handle
   this as a fallback path, not a user-visible 500.

---

## Testing Map

| Concern | Test file |
|---------|-----------|
| State store durability | `tests/test_store.py`, `tests/test_alembic_setup.py` |
| Service orchestration regressions | `tests/test_service_regressions.py` |
| Router security / auth | `tests/test_router_security.py` |
| Security headers | `tests/test_main_security_headers.py` |
| Backend spine (top-level contract) | `tests/test_backend_spine_ops.py` |
| Launch readiness (provider truth) | `tests/test_launch_readiness.py` |
| Request hardening | `tests/test_request_hardening_middleware.py` |
| Metrics endpoint | `tests/test_metrics_endpoint.py` |
| Generation broker | `tests/test_generation_broker.py` |

Run everything: `pytest apps/studio/backend/tests/`.

---

## Deploy Topologies

- **`generation_runtime_mode = all`** — single process handles web + worker.
  Used in local dev. Broker may be absent (local queue fallback).
- **`generation_runtime_mode = web`** — HTTP surface only; MUST have shared
  broker so workers can pick up jobs.
- **`generation_runtime_mode = worker`** — background processor only;
  pulls from shared broker, no HTTP routes.

See `deploy/staging-runtime-helpers.ps1` and `deploy/manage-studio-staging.ps1`
for the staging stack.

---

## Recent Hardening (2026-04-20)

- Added `studio_platform/resilience.py` (CircuitBreaker utility).
- Added `observability/context.py` (request_id ContextVar propagation).
- Added `config/feature_flags.py` (env-backed flag registry).
- Module docstrings added to `service.py`, `store.py`, `providers.py`,
  `middleware.py`, `rate_limit.py`, `main.py`, `generation_broker.py`.
- Magic constants in `service.py` and `store.py` annotated with WHY.

See `CHANGELOG.md` for the full log; `docs/operations/RUNBOOK.md` for
operator playbooks.
