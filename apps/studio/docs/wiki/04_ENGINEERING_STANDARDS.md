# Engineering Standards

## Why This Exists

Studio is now too large for improvisation-only development.

The repo needs explicit standards so future work stays:
- understandable
- testable
- scalable
- trustworthy

## Product Engineering Standards

### 1. Server-Authoritative Decisions

The backend decides:
- auth truth
- billing truth
- entitlement truth
- ownership truth
- moderation truth
- runtime truth

The frontend may present state, but it should not invent it.

### 2. Explicit Degraded States

If a provider or subsystem is degraded:
- it must be visible in metadata or logs
- it must not silently impersonate premium success
- the user experience should remain useful when possible

### 3. Durable Runtime

Job systems must be:
- recoverable
- inspectable
- deterministic

No silent strandings.
No magical restarts that cannot be explained.

### 4. Security By Default

All protected behavior should assume:
- ownership matters
- revoked access matters
- stale tokens matter
- abuse escalation matters

Security rules should be simple, explicit, and testable.

### 5. Documentation As Memory

If the repo learns something important, the repo should remember it.

That means:
- version manifest
- release ledger
- maintenance map
- agent rules
- wiki

must stay aligned.

### 6. Product Consistency Over Feature Count

New features are not automatically good.

Studio should prefer:
- fewer stronger flows
- less hidden magic
- tighter continuity
- better trust

over:
- extra surfaces
- scattered experiments
- provider-driven complexity

## World-Standard Development Practices To Follow

Studio should align with widely accepted product engineering practices:

- single source of truth for version/build
- release notes for meaningful changes
- explicit architecture boundaries
- regression tests for critical flows
- operational logging outside source control
- graceful degradation instead of silent corruption
- environment-specific runtime configuration
- least-privilege access assumptions
- clear ownership of data and binary assets
- auditability of billing and security-sensitive actions

## Change Control Standard

A meaningful Studio change should usually include:
- code or docs update
- release bookkeeping
- verification
- explanation of why the change exists

If a change touches auth, billing, ownership, runtime, or chat backbone, regression expectations go up.

## Documentation Standard

The docs system has layers:

- `version.json`: current build truth
- release ledger: chronological change history
- maintenance map: operational/stabilization memory
- wiki: strategic product and engineering memory
- AGENTS.md: implementation rules for AI agents and maintainers

These layers should reinforce each other, not drift.

## Launch Readiness Standard

Studio should not be treated as ready for broad public launch until:
- logs are usable
- failure modes are diagnosable
- auth is boringly stable
- chat quality is trustworthy enough for the flagship promise
- runtime and billing are explainable under stress
