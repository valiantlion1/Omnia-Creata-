# Studio Production Roadmap

Status baseline: `0.6.0-alpha` / build `2026.04.19.160` / channel `alpha` / status `prelaunch`

This document is the canonical hardening roadmap for taking Studio from the current alpha-prelaunch stack to a production platform that can eventually sustain `1M+` concurrent active users with `99.9%` availability. Future Codex sessions should implement numbered packages from this document instead of creating parallel roadmap variants.

Assumptions used throughout this plan:
- Concurrent-user numbers refer to Studio-origin active sessions, not CDN-only static asset viewers.
- RPS numbers are mixed Studio API request rates and exclude direct third-party model inference throughput.
- Infra cost bands are rough platform-only ranges and do not include variable provider/model spend.
- The current baseline is a single-region web + worker deployment on Render, Vercel web delivery, Supabase-backed persistence/storage, Paddle billing, and a free Render key/value Redis layer.

## 1. Executive Summary

Studio's current safe operational ceiling should be treated as roughly `200 concurrent active users`, about `10-15 mixed API RPS`, and only `3` simultaneous generation executions. That estimate is intentionally conservative and is justified by the current repo truth: one API service plus one worker in `render.yaml`, `max_concurrent_generations=3`, `max_queue_size=100`, a Postgres pool capped at `10`, a free Redis/key/value tier, fallback paths that still allow local queue behavior outside a shared broker, and a state store whose hot mutation path still relies on global locks and rewrite-style persistence.

The target end-state is a Studio platform that can graduate through beta and public launch into a future `1M+` concurrent-user architecture with `99.9%` availability, explicit error budgets, predictable degradation, and a multi-region control plane. Hitting that end-state is not a "scale up the same alpha box" exercise; it requires replacing core persistence and state coordination patterns, then layering in observability, queue fairness, cost control, and region-aware operations.

Launch-blocking scope from the current baseline is `22 P0 packages`, estimated at roughly `44-52 engineer-weeks` across platform, backend, data, web, and operations. Those packages are: `P01`, `P02`, `P04`, `P05`, `P08`-`P12`, `P15`-`P17`, `P22`-`P24`, `P30`-`P31`, `P37`, `P44`-`P45`, `P47`, and `P49`.

Primary risks that currently cap Studio far below real public scale:
- The state store still performs rewrite-style mutations behind process-local locks, which turns persistence into the dominant scalability and correctness risk.
- Distributed security state is not fully distributed yet: JWT revocation and login-attempt tracking still have in-memory pieces in the auth layer.
- Queue coordination is not hard-fail-safe in non-dev environments: Redis is free-tier today, local broker fallback still exists, and there is no durable DLQ/replay path.
- Observability foundations are partial: request/performance middleware exists but is not mounted as the default runtime path, and metrics, tracing, dashboards, and paging are not yet canonical.
- There is no fully enforced application-owned migration, backup/restore, and promotion pipeline that can carry schema evolution safely into public traffic.

## 2. Capacity Ladder

### L0 - Current (alpha)

- Target envelope: up to `200` concurrent active users, `10-15` mixed API RPS, `3` simultaneous generation executions.
- Likely bottlenecks: single API instance, single worker, free Redis ops/memory ceilings, Postgres connection cap, whole-state persistence rewrites, Paddle webhook throughput on one process, provider rate limits, and local fallback paths that hide broken shared coordination.
- Packages required to unlock L1:
  1. `P01` Correlation IDs and structured request logging
  2. `P02` Prometheus metrics and RED/USE telemetry
  3. `P04` Error tracking integration
  4. `P08` End-to-end timeout budgets
  5. `P09` Unified circuit breakers
  6. `P10` Retry policy matrix with jitter
  7. `P15` Redis-backed JWT revocation and login-attempt state
  8. `P16` Tenant/user/IP/route Redis rate limiting
  9. `P17` Mandatory shared broker in non-dev
  10. `P22` Replace whole-state persistence with row-level domain writes
  11. `P23` Alembic migration pipeline
  12. `P24` Postgres pooling and pgbouncer sizing
  13. `P37` Request/body/header/upload size limits
  14. `P44` GitHub Actions CI pipeline
  15. `P45` Continuous delivery with preview/staging promotion gate
  16. `P47` Backup, restore, and DR drills
  17. `P49` Load-testing suite and performance budgets
- Rough infra cost band: `$0-$150/month` before provider spend.
- Exit criteria:
  - No staging or production runtime can start without shared Redis/broker state.
  - `1K` concurrent-user synthetic tests pass with `p95` reads under `350 ms`, `p95` writes under `800 ms`, and queue claim latency under `2 s`.
  - Auth revocation, login lockouts, and rate limiting survive process restart and multi-instance routing.
  - CI, backups, deploy verification, and alerting are all live and audited.

### L1 - Beta (1K concurrent)

- Target envelope: `1K` concurrent active users, `50-100` mixed API RPS.
- Likely bottlenecks: API worker count, queue backlog, Redis throughput, Postgres write pressure, Supabase storage egress, and entitlement/webhook correctness during billing churn.
- Packages required to unlock L2:
  1. `P05` Dashboards and alerting
  2. `P11` Idempotency keys for write APIs
  3. `P12` Dead letter queue and replay tooling
  4. `P18` Redis-backed feature flags
  5. `P25` Query-path audit and read-replica eligibility
  6. `P26` Redis response caching for hot reads
  7. `P27` CDN and validator strategy for public/generated assets
  8. `P30` Canonical quota service
  9. `P31` Plan enforcement from Paddle to runtime rights
  10. `P41` PII redaction v2 and log classification
  11. `P48` Environment parity and config contract checks
  12. `P50` Runbooks and on-call readiness
- Rough infra cost band: `$150-$600/month` before provider spend.
- Exit criteria:
  - `10K` concurrent-user tests pass on at least two API instances and two worker instances.
  - Beta availability stays at or above `99.5%` for a full week with tuned alerts and no hidden Sev-1 class incident.
  - Webhook replay is idempotent and entitlement drift stays below `0.1%`.
  - Hot read cache hit ratio exceeds `70%` on the designated public-launch paths.

### L2 - Public launch (10K concurrent)

- Target envelope: `10K` concurrent active users, `500-1,000` mixed API RPS.
- Likely bottlenecks: horizontal API scale, read-heavy Postgres traffic, Redis memory and ops/sec, Supabase asset egress, Paddle retry storms, and provider rate limits during peak bursts.
- Packages required to unlock L3:
  1. `P03` OpenTelemetry distributed tracing
  2. `P06` Centralized log shipping and retention
  3. `P13` Graceful degradation matrix
  4. `P14` Backpressure and autoscaler signals
  5. `P19` Distributed cache/session primitives
  6. `P20` Outbox and event-log pattern
  7. `P21` Durable scheduler for housekeeping and reconciliation
  8. `P28` Compression, transport, and async-purity audit
  9. `P32` Provider/model/surface usage metering
  10. `P33` Fair-share queue scheduling
  11. `P34` Cost attribution and anomaly detection
  12. `P38` Upload magic-byte validation and AV hook
  13. `P39` CSRF and cookie-flow hardening audit
  14. `P40` SQL/query safety audit after schema cutover
  15. `P46` Blue-green or canary deployment and rollback
  16. `P53` Public REST API with API keys
  17. `P54` Webhooks-out platform
  18. `P55` Realtime status via SSE/WebSocket
  19. `P58` Admin ops dashboard and control plane
- Rough infra cost band: `$1,500-$6,000/month` before provider spend.
- Exit criteria:
  - `100K` concurrent-user load or traffic-shadowing tests pass with replica lag under `5 s`.
  - Rolling `30-day` availability is at or above `99.9%`.
  - Queue `p99` wait remains under `15 s` at planned public-launch concurrency.
  - Provider, Redis, and Postgres partial-outage drills degrade honestly without silent data loss or fake success.

### L3 - Growth (100K concurrent)

- Target envelope: `100K` concurrent active users, `5,000-10,000` mixed API RPS.
- Likely bottlenecks: hot tables for jobs/usage/events, regional egress, Redis cardinality, shared-queue fairness, regional cache invalidation, and provider concentration risk.
- Packages required to unlock L4:
  1. `P07` Synthetic probes and canary trace journeys
  2. `P29` Hot-table partitioning and archival
  3. `P35` Tenant isolation, RLS, and namespace hardening
  4. `P36` Budget controls and spend throttles
  5. `P42` Secret storage and rotation runbooks
  6. `P43` Dependency scanning, SBOM, and security gates
  7. `P51` Multi-region rollout plan
  8. `P52` Hyperscale control plane and regional sharding
  9. `P56` i18n beyond TR/EN
  10. `P57` A/B testing infrastructure
- Rough infra cost band: `$12,000-$45,000/month` before provider spend.
- Exit criteria:
  - Regional traffic shifting is proven with `RPO <= 5 minutes` and `RTO <= 30 minutes`.
  - Hot tables are partitioned and archival keeps active query plans stable.
  - Per-tenant budgets, throttles, and anomaly alerts are enforced automatically.
  - Shadow traffic or synthetic tests prove the control-plane assumptions needed for `1M+` concurrent users.

### L4 - Hyperscale (1M+ concurrent)

- Target envelope: `1M+` concurrent active users, `50,000-100,000` mixed API RPS.
- Likely bottlenecks: global write coordination, multi-region primary failover, global quota consistency, provider fan-out limits, and deploy blast radius.
- Packages that define and sustain L4:
  1. `P07` Synthetic probes and canary trace journeys
  2. `P29` Hot-table partitioning and archival
  3. `P35` Tenant isolation, RLS, and namespace hardening
  4. `P36` Budget controls and spend throttles
  5. `P42` Secret storage and rotation runbooks
  6. `P43` Dependency scanning, SBOM, and security gates
  7. `P51` Multi-region rollout plan
  8. `P52` Hyperscale control plane and regional sharding
  9. `P56` i18n beyond TR/EN
  10. `P57` A/B testing infrastructure
- Rough infra cost band: `$120,000-$500,000+/month` before provider spend.
- Sustain criteria:
  - Global quota, flag, and entitlement propagation completes in under `5 s`.
  - Region-scoped canaries keep deploy blast radius below `5%` of active traffic.
  - Multi-region failover is exercised quarterly without manual heroics.
  - Provider concentration never leaves a single launch-grade lane as the only way to keep core product surfaces alive.

## 3. Pillars

### A. Observability

Objective: make every request, job, provider call, and deploy diagnosable within minutes. Today Studio already has local runtime logging and a request/performance middleware implementation, but the middleware is not the canonical mounted path and there is no Prometheus, trace, Sentry, alerting, or centralized log truth yet.

Packages in this pillar: `P01`-`P07`.

### B. Reliability

Objective: prevent third-party and internal dependency failures from cascading into user-visible outages. The repo already contains partial cooldown and retry behavior in provider pathways, but policies are not standardized, not idempotency-aware end to end, and not backed by DLQ/replay tooling.

Packages in this pillar: `P08`-`P14`.

### C. Distributed State

Objective: remove replica-local truth and force all correctness-critical coordination through shared infrastructure. Current gaps include in-memory JWT revocation/login-attempt state, optional shared-broker behavior, limited rate-limiter policy sophistication, and the absence of a canonical feature-flag and event-log layer.

Packages in this pillar: `P15`-`P21`.

### D. Performance

Objective: replace alpha-safe persistence patterns with scalable query and caching behavior. The current state store, connection pool sizing, and asset-cache posture are the main reasons Studio is nowhere near public-launch capacity today.

Packages in this pillar: `P22`-`P29`.

### E. Multi-tenancy

Objective: let Studio sell and enforce plans honestly while protecting shared infrastructure from noisy-neighbor behavior. The repo already has plan catalog basics, queue priorities, and some cost telemetry, but it still needs an authoritative quota ledger, usage metering, entitlement enforcement, and fair-share scheduling.

Packages in this pillar: `P30`-`P36`.

### F. Security Hardening

Objective: turn current baseline protections into production-grade controls. Studio already has redaction helpers and some input validation, but it still needs request-size guards, upload validation, CSRF verification, query-safety review, formal secret rotation, and supply-chain gates.

Packages in this pillar: `P37`-`P43`.

### G. Operations

Objective: make deploys, schema changes, restores, rollbacks, and incident response boring. The repo currently has deployment verification scripts and a bounded OCOS workflow, but it does not yet have a canonical Studio CI pipeline, preview-to-prod promotion, practiced DR, or repeatable load-test gates. For schema evolution, Studio should use `Alembic` as the canonical migration runner: Supabase remains the managed Postgres platform, but migrations should stay app-authored and CI-gated in the Python service boundary.

Packages in this pillar: `P44`-`P52`.

### H. Future Features / Public Surface

Objective: add platform features only after the underlying reliability and tenancy contracts exist. Public APIs, outbound webhooks, realtime status, broader i18n, experimentation, and an internal ops dashboard all become high-value once the lower layers are trustworthy.

Packages in this pillar: `P53`-`P58`.

## 4. Work Package Catalog

Legend:
- `P0`: launch blocking from the current baseline
- `P1`: needed for public growth after launch
- `P2`: needed for later scale, hardening depth, or hyperscale

### A. Observability

#### P01 - Correlation IDs and Structured Request Logging
`Priority: P0 | Owner: Platform | Effort: 1.0 engineer-week | Unlocks: L1`
- Current gap: request and performance middleware already exist, but they are not the default mounted production path and logs are not emitted as a stable structured schema.
- Deliverable: mount correlation middleware in all runtimes and emit JSON logs with `request_id`, `trace_id`, `user_id`, `plan`, `route`, `provider`, `latency_ms`, and redaction classification.
- Depends on: none.
- Exit: every API request and worker job can be reconstructed end to end from one correlation ID.

#### P02 - Prometheus Metrics and RED/USE Telemetry
`Priority: P0 | Owner: Platform/SRE | Effort: 1.5 engineer-weeks | Unlocks: L1`
- Current gap: there is no canonical metrics endpoint or dashboard-ready RED/USE telemetry for API, worker, queue, provider, and billing flows.
- Deliverable: expose Prometheus-format metrics for request rate, errors, duration, queue age, retries, provider failures, webhook lag, and quota rejections.
- Depends on: P01.
- Exit: dashboards and alerts can consume one metrics surface without log scraping.

#### P03 - OpenTelemetry Distributed Tracing
`Priority: P1 | Owner: Platform | Effort: 2.0 engineer-weeks | Unlocks: L3`
- Current gap: `opentelemetry_endpoint` exists as config, but tracing is not a wired runtime feature and cross-service latency attribution is opaque.
- Deliverable: OpenTelemetry spans across web, API, worker, Redis, Postgres, Supabase, Paddle, and provider clients.
- Depends on: P01, P02.
- Exit: one user action can be visualized as a full trace across queueing and provider work.

#### P04 - Error Tracking Integration
`Priority: P0 | Owner: Platform/SRE | Effort: 1.0 engineer-week | Unlocks: L1`
- Current gap: `sentry_dsn` exists in config, but there is no canonical exception/event pipeline with environment, release, and user context.
- Deliverable: Sentry or self-hosted equivalent for backend, worker, and web with release tagging and redaction-aware context.
- Depends on: P01.
- Exit: unhandled exceptions generate actionable grouped events tied to the current build and environment.

#### P05 - Dashboards and Alerting
`Priority: P0 | Owner: SRE/Ops | Effort: 1.5 engineer-weeks | Unlocks: L2`
- Current gap: there is no single operator dashboard for availability, queue health, provider degradation, billing health, or quota burn.
- Deliverable: production dashboards and alert routes for availability, latency, queue backlog, provider error spikes, Redis saturation, and billing webhook failure.
- Depends on: P02, P04.
- Exit: the on-call engineer can answer "what is broken right now?" in under five minutes.

#### P06 - Centralized Log Shipping and Retention
`Priority: P1 | Owner: Platform/Ops | Effort: 1.5 engineer-weeks | Unlocks: L3`
- Current gap: logs are local-runtime oriented and not retained/searchable as a central operations dataset.
- Deliverable: centralized log shipping with retention policy, search, structured field indexing, and cost-aware sampling.
- Depends on: P01, P41.
- Exit: multi-instance incidents can be debugged from one retained log surface.

#### P07 - Synthetic Probes and Canary Trace Journeys
`Priority: P2 | Owner: SRE | Effort: 1.5 engineer-weeks | Unlocks: L4`
- Current gap: Studio lacks continuous synthetic proof for signup, login, quota checks, generation submit, billing entitlements, and provider failover.
- Deliverable: synthetic journey probes that run per region and emit trace-linked health evidence.
- Depends on: P03, P05, P46.
- Exit: canary probes detect broken core journeys before broad customer traffic does.

### B. Reliability

#### P08 - End-to-End Timeout Budgets
`Priority: P0 | Owner: Backend/Platform | Effort: 1.0 engineer-week | Unlocks: L1`
- Current gap: timeouts are inconsistent across providers, LLM flows, and internal work; there is no single deadline budget model.
- Deliverable: ingress-to-provider timeout budgets with propagated deadlines and per-hop allocations.
- Depends on: P01.
- Exit: every external and internal dependency call has an explicit bounded timeout and a recorded timeout reason.

#### P09 - Unified Circuit Breakers for External Dependencies
`Priority: P0 | Owner: Backend/Platform | Effort: 1.5 engineer-weeks | Unlocks: L1`
- Current gap: provider pathways already contain partial cooldown/circuit logic, but Redis, Postgres, Supabase, Paddle, and all provider clients do not share one breaker policy.
- Deliverable: common dependency client wrappers with open/half-open/closed state, telemetry, and per-surface fallback behavior.
- Depends on: P08, P02.
- Exit: dependency failures trip visibly and recover predictably instead of causing cascading timeouts.

#### P10 - Retry Policy Matrix with Exponential Backoff and Jitter
`Priority: P0 | Owner: Backend | Effort: 1.0 engineer-week | Unlocks: L1`
- Current gap: retries are partially hard-coded and not consistently jittered, idempotent, or bounded by dependency class.
- Deliverable: one retry matrix for provider, webhook, queue, and storage operations with idempotency awareness and jitter.
- Depends on: P08, P09.
- Exit: transient failures recover automatically without synchronized retry storms.

#### P11 - Idempotency Keys for Write APIs
`Priority: P0 | Owner: Backend/Data | Effort: 1.5 engineer-weeks | Unlocks: L2`
- Current gap: duplicate client submits, webhook replays, and retried mutations can still create duplicated side effects.
- Deliverable: idempotency key middleware and storage for generation submit, billing webhooks, account mutations, and future public APIs.
- Depends on: P23.
- Exit: duplicate requests return the same persisted outcome instead of creating new writes.

#### P12 - Dead Letter Queue and Replay Tooling
`Priority: P0 | Owner: Backend/Platform | Effort: 1.5 engineer-weeks | Unlocks: L2`
- Current gap: the generation broker supports retry and stale-claim recovery, but there is no DLQ, replay control, or poison-message analysis path.
- Deliverable: DLQ storage, replay tooling, failure classification, and operator visibility.
- Depends on: P17, P20.
- Exit: poison jobs stop hot-looping and are replayable with audit history.

#### P13 - Graceful Degradation Matrix
`Priority: P1 | Owner: Platform/Product | Effort: 1.0 engineer-week | Unlocks: L3`
- Current gap: some degraded behavior exists today, but there is no product-wide contract for "what users see when X is down."
- Deliverable: explicit degradation rules for auth, billing, generation submit, provider outage, queue overload, and read-only mode.
- Depends on: P09, P30, P31.
- Exit: outage drills produce honest degraded UX instead of silent failure or fake success.

#### P14 - Backpressure and Autoscaler Signals
`Priority: P1 | Owner: Platform/SRE | Effort: 1.5 engineer-weeks | Unlocks: L3`
- Current gap: Studio does not yet expose queue-age and saturation signals as first-class scaling and rejection inputs.
- Deliverable: queue age, active worker slots, provider saturation, and DB pool pressure wired into autoscaling and early rejection logic.
- Depends on: P02, P12, P33.
- Exit: the platform sheds load gracefully before brownout conditions.

### C. Distributed State

#### P15 - Redis-Backed JWT Revocation and Login-Attempt State
`Priority: P0 | Owner: Security/Backend | Effort: 1.5 engineer-weeks | Unlocks: L1`
- Current gap: auth still keeps revocation and login-attempt state in process memory, which is not replica-safe.
- Deliverable: Redis-backed token revocation, login-attempt counters, lockout TTLs, and restart-safe audit events.
- Depends on: P23.
- Exit: revocation and lockout behavior is identical across replicas and after restart.

#### P16 - Tenant/User/IP/Route Redis Rate Limiting
`Priority: P0 | Owner: Security/Backend | Effort: 1.5 engineer-weeks | Unlocks: L1`
- Current gap: the rate limiter exists, but policy granularity is still too generic for tenant-aware public traffic.
- Deliverable: declarative rate-limit policies by IP, user, tenant, route, plan, and provider surface.
- Depends on: P15, P30.
- Exit: all externally exposed flows have replica-safe rate limiting with observable reject metrics.

#### P17 - Mandatory Shared Broker in Non-Dev
`Priority: P0 | Owner: Platform/Backend | Effort: 1.0 engineer-week | Unlocks: L1`
- Current gap: Studio can still fall back to local queue semantics when shared Redis/broker state is missing.
- Deliverable: fail-closed startup for staging and production if shared broker coordination is not available.
- Depends on: P15.
- Exit: local queue fallback is impossible outside explicitly labeled dev mode.

#### P18 - Redis-Backed Feature Flags with Polling and Audit
`Priority: P1 | Owner: Platform/Product | Effort: 1.0 engineer-week | Unlocks: L2`
- Current gap: there is no canonical feature-flag system for staged rollout, kill switches, or experiments.
- Deliverable: Redis-backed flag registry, poll/refresh semantics, audit trail, and environment scoping.
- Depends on: P17.
- Exit: operators can change rollout flags without redeploying services.

#### P19 - Distributed Cache and Stateless Session Primitives
`Priority: P1 | Owner: Platform | Effort: 1.5 engineer-weeks | Unlocks: L3`
- Current gap: Studio does not yet formalize stateless serving rules or shared cache invalidation semantics for multi-instance traffic.
- Deliverable: cache key contract, invalidation model, and a documented no-sticky-session runtime posture.
- Depends on: P16, P18.
- Exit: any healthy instance can serve any request without session affinity.

#### P20 - Outbox and Event-Log Pattern
`Priority: P1 | Owner: Backend/Data | Effort: 2.0 engineer-weeks | Unlocks: L3`
- Current gap: cross-process side effects are not yet anchored by a durable event-log contract.
- Deliverable: transactional outbox for entitlements, usage, notifications, queue events, and future webhooks/API events.
- Depends on: P22, P23.
- Exit: crash recovery can replay durable events without reconstructing state from logs.

#### P21 - Durable Scheduler for Housekeeping and Reconciliation
`Priority: P1 | Owner: Platform/Backend | Effort: 1.5 engineer-weeks | Unlocks: L3`
- Current gap: recurring cleanup and reconciliation work is still too dependent on process-local timing and ad hoc operator runs.
- Deliverable: durable scheduled jobs with leader election, locking, and observable execution history.
- Depends on: P17, P20.
- Exit: scheduled maintenance and reconciliation survive restarts and run exactly once per intended window.

### D. Performance

#### P22 - Replace Whole-State Persistence with Row-Level Domain Writes
`Priority: P0 | Owner: Data/Backend | Effort: 4.0 engineer-weeks | Unlocks: L1`
- Current gap: the current state store mutates behind global locks and rewrite-style persistence, which is the dominant scale and correctness risk in the repo.
- Deliverable: normalized domain tables and targeted writes for accounts, jobs, usage, entitlements, provider state, and audit events.
- Depends on: P23.
- Exit: no hot path rewrites the full state blob or full record set to persist one logical change.

#### P23 - Alembic Migration Pipeline
`Priority: P0 | Owner: Data/Backend | Effort: 1.5 engineer-weeks | Unlocks: L1`
- Current gap: there is no canonical migration runner, and `alembic` is still commented out in backend requirements.
- Deliverable: Alembic baseline, migration review rules, reversible schema changes, and CI migration smoke tests.
- Depends on: none.
- Exit: every schema change ships as a reviewed migration owned by the application repo.

#### P24 - Postgres Pooling and Pgbouncer Sizing
`Priority: P0 | Owner: Data/Platform | Effort: 1.0 engineer-week | Unlocks: L1`
- Current gap: the current Postgres pool is sized conservatively and tied to the old store design.
- Deliverable: production pool sizing, pgbouncer or equivalent, async-safe DB access patterns, and separate web/worker pool budgets.
- Depends on: P22, P23.
- Exit: pool saturation stays below `70%` at L1 load with stable p95 query latency.

#### P25 - Query-Path Audit and Read-Replica Eligibility
`Priority: P1 | Owner: Data/Backend | Effort: 2.0 engineer-weeks | Unlocks: L2`
- Current gap: hot paths are not yet formally classified as write-authoritative, cacheable read, or replica-safe read.
- Deliverable: query inventory, index plan, hotspot remediation, and read-replica eligibility matrix.
- Depends on: P22, P24.
- Exit: the top ten hot reads are index-backed and ready for replica offload.

#### P26 - Redis Response Caching for Hot Reads
`Priority: P1 | Owner: Backend/Platform | Effort: 1.5 engineer-weeks | Unlocks: L2`
- Current gap: hot reads rely too heavily on live DB/service recomputation.
- Deliverable: cache layer for manifests, plan catalog, entitlements read models, provider health summaries, and future public API reads.
- Depends on: P19, P25.
- Exit: target hot paths maintain at least `70%` cache hit ratio under beta traffic.

#### P27 - CDN and Validator Strategy for Public and Generated Assets
`Priority: P1 | Owner: Web/Platform | Effort: 1.0 engineer-week | Unlocks: L2`
- Current gap: strong cache headers already exist for static web assets, but user/generated/public asset delivery is not yet a complete CDN-plus-validator story.
- Deliverable: ETag/Last-Modified, signed URLs, cache-control policy, and CDN offload for user-facing assets.
- Depends on: P25.
- Exit: asset-heavy reads no longer hit origin unnecessarily and validator behavior is measurable.

#### P28 - Compression, Transport, and Async-Purity Audit
`Priority: P1 | Owner: Platform | Effort: 1.0 engineer-week | Unlocks: L3`
- Current gap: Studio does not yet have a formal gzip/brotli/HTTP2 posture or a completed blocking-I/O audit for all async paths.
- Deliverable: compression middleware, payload-size budget review, async client audit, and removal of blocking hot-path calls.
- Depends on: P02.
- Exit: payload sizes drop measurably and no blocking call remains on critical request paths.

#### P29 - Hot-Table Partitioning and Archival
`Priority: P2 | Owner: Data | Effort: 2.0 engineer-weeks | Unlocks: L4`
- Current gap: future job, usage, event, and audit tables will become concentrated hotspots if retained flat forever.
- Deliverable: partitioning strategy, archival retention windows, and operator tooling for cold-path access.
- Depends on: P25, P32.
- Exit: hot tables remain within predictable active windows even at L3 traffic.

### E. Multi-tenancy

#### P30 - Canonical Quota Service
`Priority: P0 | Owner: Backend/Product | Effort: 2.0 engineer-weeks | Unlocks: L2`
- Current gap: service catalog limits exist, but Studio still lacks one authoritative quota engine across all surfaces.
- Deliverable: a central quota evaluator for generation count, storage, API calls, incomplete jobs, and per-window submit limits.
- Depends on: P22, P23.
- Exit: every write path checks one quota service before allocating shared capacity.

#### P31 - Plan Enforcement from Paddle to Runtime Rights
`Priority: P0 | Owner: Backend/Billing | Effort: 2.0 engineer-weeks | Unlocks: L2`
- Current gap: plan/catalog truth and billing-webhook truth can still drift without a durable entitlement contract.
- Deliverable: durable entitlements table, webhook idempotency, grace windows, downgrade handling, and runtime cache invalidation.
- Depends on: P11, P20, P30.
- Exit: plan changes propagate within SLO and replay safely.

#### P32 - Provider, Model, and Surface Usage Metering
`Priority: P1 | Owner: Backend/Data | Effort: 2.0 engineer-weeks | Unlocks: L3`
- Current gap: there is cost telemetry groundwork, but not a full authoritative per-tenant usage ledger across every billable surface.
- Deliverable: append-only metering records tagged by tenant, provider, model, surface, and region.
- Depends on: P22, P30.
- Exit: every billable action writes a usage record that can be reconciled later.

#### P33 - Fair-Share Queue Scheduling
`Priority: P1 | Owner: Backend/Platform | Effort: 1.5 engineer-weeks | Unlocks: L3`
- Current gap: queue priority exists by plan, but there is no full fair-share model to protect shared capacity across tenants.
- Deliverable: weighted fair scheduling across plan, tenant, backlog age, and provider lane.
- Depends on: P17, P30, P32.
- Exit: one noisy tenant cannot starve equal or higher tier traffic.

#### P34 - Cost Attribution and Anomaly Detection
`Priority: P1 | Owner: Data/FinanceOps | Effort: 1.5 engineer-weeks | Unlocks: L3`
- Current gap: spend visibility exists in pieces, but there is no strong anomaly-detection and budget-warning system.
- Deliverable: per-tenant and per-provider cost views, anomaly alerts, and operator drill-downs.
- Depends on: P05, P32.
- Exit: unusual spend growth is detected before it becomes a monthly billing surprise.

#### P35 - Tenant Isolation, RLS, and Namespace Hardening
`Priority: P2 | Owner: Data/Security | Effort: 2.0 engineer-weeks | Unlocks: L4`
- Current gap: most tenancy protection is still application-enforced rather than backed by database/storage isolation.
- Deliverable: tenant scoping keys, row-level security or equivalent DB enforcement, and storage namespace hardening.
- Depends on: P22, P31.
- Exit: cross-tenant read/write tests fail at both app and data layers.

#### P36 - Budget Controls and Spend Throttles
`Priority: P2 | Owner: Product/Platform | Effort: 1.5 engineer-weeks | Unlocks: L4`
- Current gap: there is no full hard-stop spend control system for abusive or unexpectedly expensive usage.
- Deliverable: per-plan and per-tenant spend ceilings, throttles, and manual override workflow.
- Depends on: P34, P35.
- Exit: budget breaches trigger deliberate throttle behavior instead of hidden overspend.

### F. Security Hardening

#### P37 - Request, Header, Body, and Upload Size Limits
`Priority: P0 | Owner: Security/Platform | Effort: 1.0 engineer-week | Unlocks: L1`
- Current gap: field-level validation exists, but there is no global ingress guardrail for oversized bodies, headers, and uploads.
- Deliverable: ASGI and proxy-level limits for headers, body size, multipart uploads, and request buffering.
- Depends on: none.
- Exit: oversized requests fail early and consistently before expensive parsing or provider work.

#### P38 - Upload Magic-Byte Validation and AV Integration Point
`Priority: P1 | Owner: Security/Backend | Effort: 1.5 engineer-weeks | Unlocks: L3`
- Current gap: there is no verified magic-byte validation or virus-scan handoff for uploads.
- Deliverable: allowlisted content sniffing, file signature checks, and an AV scanning integration point.
- Depends on: P37.
- Exit: unsupported or suspicious files are blocked before storage or downstream processing.

#### P39 - CSRF and Cookie-Flow Hardening Audit
`Priority: P1 | Owner: Security/Web | Effort: 1.0 engineer-week | Unlocks: L3`
- Current gap: cookie and CSRF expectations appear in product/legal surfaces, but backend enforcement is not yet proven as a first-class contract.
- Deliverable: explicit cookie-flow map, CSRF protection where needed, and regression tests for browser-auth mutations.
- Depends on: P01, P37.
- Exit: browser auth and billing-affecting flows pass CSRF verification tests.

#### P40 - SQL and Query Safety Audit After Schema Cutover
`Priority: P1 | Owner: Security/Data | Effort: 1.5 engineer-weeks | Unlocks: L3`
- Current gap: the planned schema cutover introduces many more query paths that need explicit safety review.
- Deliverable: ORM/parameterized-query audit, banned patterns list, and regression coverage for user-controlled inputs.
- Depends on: P22, P23.
- Exit: no user-controlled SQL string building survives in production paths.

#### P41 - PII Redaction v2 and Log Classification
`Priority: P1 | Owner: Security/Platform | Effort: 1.0 engineer-week | Unlocks: L2`
- Current gap: there is already a redaction helper, but structured logging and error tracking need field-level classification and enforcement.
- Deliverable: log field classification, safe sampling rules, redaction test corpus, and explicit high-risk field denylist.
- Depends on: P01, P04.
- Exit: logs and error events contain only approved fields or redacted placeholders.

#### P42 - Secret Storage and Rotation Runbooks
`Priority: P2 | Owner: Security/Ops | Effort: 1.0 engineer-week | Unlocks: L4`
- Current gap: Studio spans Render, Vercel, Supabase, Paddle, and provider credentials, but rotation remains too manual and person-dependent.
- Deliverable: secret inventory, ownership map, rotation cadence, dual-secret rollout steps, and rollback instructions.
- Depends on: P45, P50.
- Exit: a quarterly rotation drill can be run without service outage.

#### P43 - Dependency Scanning, SBOM, and Security Gates
`Priority: P2 | Owner: Security/Ops | Effort: 1.0 engineer-week | Unlocks: L4`
- Current gap: Studio has no canonical supply-chain security gate in CI for dependencies and generated artifacts.
- Deliverable: dependency scanning, CodeQL or equivalent, SBOM generation, and merge/deploy gates for critical risk.
- Depends on: P44.
- Exit: critical known-vulnerable dependency updates cannot land silently.

### G. Operations

#### P44 - GitHub Actions CI Pipeline
`Priority: P0 | Owner: Ops/Platform | Effort: 1.5 engineer-weeks | Unlocks: L1`
- Current gap: the repo has an organizer release workflow and a bounded OCOS Studio action, but not a canonical Studio lint/type/test/build pipeline.
- Deliverable: Studio-specific CI covering backend lint/test, web type/build, migration smoke, and docs link validation.
- Depends on: P23.
- Exit: every Studio PR is gated by required automated checks.

#### P45 - Continuous Delivery and Preview-to-Staging Promotion Gate
`Priority: P0 | Owner: Ops/Platform | Effort: 1.5 engineer-weeks | Unlocks: L1`
- Current gap: deploy verification scripts exist, but the default path from preview to staging to production is not a canonical automated contract.
- Deliverable: preview deploys, protected staging promotion gate, evidence attachment, and manual approval points for production.
- Depends on: P44, P05.
- Exit: no production deploy bypasses preview and protected-staging evidence.

#### P46 - Blue-Green or Canary Deployment and Rollback
`Priority: P1 | Owner: Ops/SRE | Effort: 2.0 engineer-weeks | Unlocks: L3`
- Current gap: rollout shape is still effectively single-track with manual verification.
- Deliverable: canary percentages, rollback triggers, compatibility rules for DB/schema changes, and rollout observability.
- Depends on: P45, P49.
- Exit: bad deploys can be rolled back automatically before full blast radius.

#### P47 - Backup, Restore, DR, and Game Days
`Priority: P0 | Owner: Ops/Data | Effort: 1.5 engineer-weeks | Unlocks: L1`
- Current gap: backup and restore truth is not yet practiced as a routine release gate.
- Deliverable: RPO/RTO targets, automated backups, restore runbooks, and scheduled DR drills.
- Depends on: P23, P45.
- Exit: restore drills meet defined RPO/RTO targets on a staging clone.

#### P48 - Environment Parity and Config Contract Checks
`Priority: P1 | Owner: Ops/Platform | Effort: 1.0 engineer-week | Unlocks: L2`
- Current gap: local, staging, and production config drift can still surface as runtime surprises instead of preflight failures.
- Deliverable: machine-readable env contract, required-secret matrix, and startup validation across all environments.
- Depends on: P44, P45.
- Exit: missing or contradictory environment state blocks deploy before serving traffic.

#### P49 - Load-Testing Suite and Performance Budgets
`Priority: P0 | Owner: Platform/SRE | Effort: 2.0 engineer-weeks | Unlocks: L1`
- Current gap: current capacity estimates are inferred from repo truth and not yet backed by repeatable load reports.
- Deliverable: k6/Locust scenarios for auth, browse, generation submit, polling, billing webhooks, and provider degradation.
- Depends on: P02, P22, P24, P44.
- Exit: each ladder transition is proven by a repeatable load report with explicit pass/fail budgets.

#### P50 - Runbooks and On-Call Readiness
`Priority: P1 | Owner: Ops | Effort: 1.0 engineer-week | Unlocks: L2`
- Current gap: operational knowledge is spread across scripts, docs, and chat history rather than incident-grade runbooks.
- Deliverable: Sev-1 and Sev-2 runbooks, ownership matrix, alert routes, and incident templates.
- Depends on: P05, P45, P47.
- Exit: a newly assigned on-call engineer can execute the first-response path without historical context.

#### P51 - Multi-Region Rollout Plan
`Priority: P2 | Owner: Platform/Ops | Effort: 2.0 engineer-weeks | Unlocks: L4`
- Current gap: Studio is still planned as a single-region service and lacks a concrete regional expansion playbook.
- Deliverable: region selection, read/write traffic strategy, residency requirements, and staged regional rollout plan.
- Depends on: P29, P35, P47.
- Exit: one secondary region can serve read-heavy traffic safely and intentionally.

#### P52 - Hyperscale Control Plane and Regional Sharding
`Priority: P2 | Owner: Platform/Data | Effort: 3.0 engineer-weeks | Unlocks: L4`
- Current gap: `1M+` concurrent users will require control-plane and data-plane separation rather than more replicas of the current shape.
- Deliverable: regional shards, global control plane for quotas/flags/entitlements, and inter-region routing strategy.
- Depends on: P29, P33, P51.
- Exit: new shards can be added without replatforming the entire product each time.

### H. Future Features / Public Surface

#### P53 - Public REST API with API Keys, Scopes, and Quotas
`Priority: P1 | Owner: Backend/Product | Effort: 2.0 engineer-weeks | Unlocks: L3`
- Current gap: Studio has no external API contract or lifecycle for scoped API keys.
- Deliverable: versioned REST surface, API key issuance and rotation, scopes, quotas, and audit logging.
- Depends on: P30, P31, P37, P43.
- Exit: external clients can integrate without bypassing tenant, quota, or security rules.

#### P54 - Webhooks-Out Platform
`Priority: P1 | Owner: Backend/Product | Effort: 2.0 engineer-weeks | Unlocks: L3`
- Current gap: there is no user-facing outbound event system for automations or integrations.
- Deliverable: signed webhook subscriptions, retry policy, replay tooling, secret rotation, and per-subscriber delivery logs.
- Depends on: P11, P12, P20, P53.
- Exit: subscribers receive durable event delivery with idempotent integration guidance.

#### P55 - Realtime Status via SSE or WebSocket
`Priority: P1 | Owner: Web/Backend | Effort: 2.0 engineer-weeks | Unlocks: L3`
- Current gap: status delivery is still polling-oriented and wastes request budget at scale.
- Deliverable: realtime generation and job-status channel with auth, reconnect, backpressure, and degraded fallback to polling.
- Depends on: P17, P30, P33.
- Exit: active jobs no longer require high-frequency polling to feel live.

#### P56 - i18n Beyond TR and EN
`Priority: P2 | Owner: Web/Product | Effort: 1.5 engineer-weeks | Unlocks: L4`
- Current gap: current localization posture is not designed for broad public-market expansion.
- Deliverable: message catalog pipeline, locale negotiation, fallback policy, and translation QA workflow.
- Depends on: P18, P53.
- Exit: a new locale can ship without branching the app logic.

#### P57 - A/B Testing Infrastructure
`Priority: P2 | Owner: Product/Data | Effort: 1.5 engineer-weeks | Unlocks: L4`
- Current gap: Studio has no canonical assignment, exposure, or kill-switch system for experiments.
- Deliverable: experiment registry, assignment service, exposure logs, and rollout safety guardrails.
- Depends on: P18, P32, P58.
- Exit: experiments can be launched and stopped without bespoke branching per feature.

#### P58 - Admin Ops Dashboard and Control Plane
`Priority: P1 | Owner: Web/Ops | Effort: 2.0 engineer-weeks | Unlocks: L3`
- Current gap: operator truth is spread across docs, scripts, logs, and health endpoints instead of a single control plane.
- Deliverable: internal dashboard for queue health, provider state, entitlements, feature flags, DLQ, replay, and incident actions.
- Depends on: P02, P05, P12, P32, P50.
- Exit: on-call can inspect and perform first-line operational actions without shell-only workflows.

## 5. Recommended Execution Waves

1. Wave 0 - Foundation truth: `P23`, `P22`, `P24`, `P01`, `P02`, `P04`, `P08`, `P09`, `P10`, `P15`, `P16`, `P17`, `P37`
2. Wave 1 - Launch gate: `P05`, `P11`, `P12`, `P30`, `P31`, `P44`, `P45`, `P47`, `P49`
3. Wave 2 - Public launch hardening: `P18`, `P25`, `P26`, `P27`, `P41`, `P48`, `P50`
4. Wave 3 - Growth readiness: `P03`, `P06`, `P13`, `P14`, `P19`, `P20`, `P21`, `P28`, `P32`, `P33`, `P34`, `P38`, `P39`, `P40`, `P46`, `P53`, `P54`, `P55`, `P58`
5. Wave 4 - Hyperscale architecture: `P07`, `P29`, `P35`, `P36`, `P42`, `P43`, `P51`, `P52`, `P56`, `P57`

Implementation rule for future sessions: do not open later-wave work while `P22`, `P23`, `P24`, `P15`, `P16`, and `P17` remain unfinished. Those packages are the real boundary between alpha-safe behavior and a production-capable platform.
