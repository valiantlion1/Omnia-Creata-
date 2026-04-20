# Studio Operator Runbook

Written for: on-call engineer or AI agent responding to a Studio incident.
Pairs with `apps/studio/backend/ARCHITECTURE.md` (module map) and
`STUDIO_MAINTENANCE_MAP.md` (long-running concerns).

**Principle:** every playbook here is reversible and safe. Destructive
actions (data loss, credential rotation, etc.) are called out with a ⚠️
marker and require confirmation.

---

## Quick Triage

1. **Is the app responding?** `curl -sSf $STUDIO_BASE/healthz` — a 200
   with `status: healthy` means the process is up and the store loaded.
2. **Is degradation hinted?** `GET /healthz/detail` exposes the per-
   subsystem state (broker, rate limiter, providers, circuit breakers).
   Look for `degraded: true` or `detail:` strings.
3. **Is it a known flag?** `detail` values include
   `redis_unavailable_fallback_local_queue`,
   `web_runtime_local_fallback_no_shared_broker` — these are *degraded
   modes*, not outages. See below for recovery.
4. **Are errors spiking?** Prometheus:
   `rate(studio_http_request_exceptions_total[5m])` — if non-zero,
   inspect by `exception_type` label.

---

## Playbooks

### 1. Redis unreachable

**Symptom:** rate limiter logs
`"Redis unavailable in development; falling back to in-memory rate limiter"`;
OR generation broker logs
`"Generation broker unavailable; falling back to local queue behavior"`.

**Impact:**
- In **dev**: in-memory fallbacks kick in. No user-visible impact.
- In **staging/production web runtime**: the service refuses to start
  (by design — see `_requires_strict_shared_generation_broker`). Until
  Redis is back, the deployment is down.

**Recovery:**
1. Check Redis provider status. If the outage is upstream, open a
   status-page entry so users see a cause.
2. Once Redis recovers, restart web + worker pods. The bootstrap will
   re-initialise the broker and rate limiter.
3. Verify: `GET /healthz/detail` — `generation_broker.enabled: true`,
   `generation_broker.degraded: false`.
4. Spot-check a generation: submit a tiny text-to-image through the UI.

**Do NOT:** edit the strict-broker check to "just get things running".
If you genuinely need to run without Redis, do it via the
`STUDIO_FLAG_BROKER_INMEMORY_FALLBACK=1` flag AND downgrade the runtime
to `all` (single process). Document the reason in the incident log.

---

### 2. Postgres unreachable

**Symptom:** Startup fails with connection errors; OR live requests return
500 with `psycopg` / `OperationalError` in logs.

**Impact:** Most write paths fail (auth session save, generation create,
billing updates). Read paths may succeed briefly from in-memory caches.

**Recovery:**
1. Check Postgres provider / primary instance health.
2. Confirm connection string in env (`DATABASE_URL`). Look for quoting
   or trailing-newline issues introduced by copy-paste.
3. If the pool is simply exhausted under load, consider raising
   `STUDIO_DB_POOL_MAX` — but first confirm the upstream isn't throttling.
4. Once Postgres is back, pods do NOT need a restart (the pool reconnects
   on next borrow). Watch `studio_http_request_exceptions_total{exception_type=~".*Postgres.*"}`
   drop to zero before declaring recovery.

**⚠️ Do NOT** `DROP` or `TRUNCATE` any table to "reset" a bad state —
the records include live user projects/billing. Roll back with Alembic
`downgrade` if a migration is at fault.

---

### 3. Provider outage (OpenAI / Runware / etc.)

**Symptom:** Generation jobs complete with `status: failed`; provider
health shows `status: unhealthy`; circuit breaker opens (once wired).

**Impact:** User-facing generation errors for the affected provider.
Other providers continue serving.

**Recovery:**
1. Check the provider's status page.
2. Review `GET /healthz/detail` → `providers[].health` section.
3. If the outage is short: the local per-provider circuit state will
   skip the bad provider automatically. No action needed.
4. If the outage is long: consider explicitly disabling the provider
   via its `enabled` flag in settings so the registry stops routing to it.
5. Once recovered, flip the flag back and wait for health probes to
   confirm before clearing any customer-facing messaging.

---

### 4. High error rate (500s)

**Symptom:** `rate(studio_http_request_exceptions_total[5m]) > 0.01`.

**Triage:**
1. Top exception types:
   `topk(5, sum by (exception_type) (increase(studio_http_request_exceptions_total[10m])))`.
2. Which route? Same query with `path` label.
3. Fetch a recent error log line with that exception type and look at the
   `request_id` field. Cross-reference in the app log to find the full
   stack and user context.
4. If a single user/IP is driving the spike, rate limiting should have
   caught it — check `GET /metrics` for `studio_rate_limit_*` counters.

**Rollback criteria:** if error rate started within 10 minutes of a
deploy, roll the deploy back. Do not debug in production.

---

### 5. Maintenance mode

**Symptom:** Need to drain traffic for a migration or provider cutover.

**Action:**
1. Set `STUDIO_MAINTENANCE_ENABLED=1` in the running env and redeploy
   (or toggle the feature-flag equivalent if set up).
2. `MaintenanceMiddleware` returns 503 with a JSON body for every route
   except health checks.
3. Legitimate operators can bypass with
   `X-Maintenance-Override: <token>` matching
   `STUDIO_MAINTENANCE_OVERRIDE_TOKEN`.
4. Do migration / cutover work.
5. Flip the flag back off and redeploy.

---

### 6. Memory / CPU spike

**Symptom:** Pod restarts, OOM logs, or sustained high CPU.

**Triage:**
1. Check in-flight requests: `studio_http_requests_in_progress` gauge.
   Sustained high in-flight count suggests a slow downstream.
2. Check generation queue size: broker metrics via `/healthz/detail`.
3. If a specific route is dominant, look for a recent change to that
   handler — pagination or N+1 queries are the usual suspects.
4. As an immediate mitigation, lower
   `STUDIO_MAX_CONCURRENT_GENERATIONS` — this throttles the dispatcher.

---

### 7. Credential rotation ⚠️

**When:** Scheduled rotation, or a secret is suspected compromised.

**Action:**
1. Generate new secret in the upstream provider console.
2. Add the new secret as `*_SECONDARY` env var where a rotation slot
   exists (e.g. asset token secrets).
3. Deploy with both old and new present — the code accepts either.
4. After confirming everything's green (check auth sessions, asset
   deliveries), remove the old secret and deploy again.
5. Revoke the old secret at the provider.

**⚠️ For JWT signing secrets:** live sessions WILL be invalidated when
the primary secret changes. Schedule rotation during a maintenance
window, OR implement dual-secret verification first.

---

## Observability Shortcuts

- **Live uptime:** `studio_backend_uptime_seconds`
- **In-flight:** `studio_http_requests_in_progress`
- **Error rate:**
  `rate(studio_http_request_exceptions_total[5m])`
- **P95 latency:**
  `histogram_quantile(0.95, rate(studio_http_request_duration_seconds_bucket[5m]))`
- **Broker state** (once wired): `studio_circuit_breaker_state{subsystem=~".*"}`

---

## Escalation

- Founder / owner: ghostsofter12@gmail.com
- Ops concerns live in: `apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md`
- Architecture map for AI agents: `apps/studio/backend/ARCHITECTURE.md`
