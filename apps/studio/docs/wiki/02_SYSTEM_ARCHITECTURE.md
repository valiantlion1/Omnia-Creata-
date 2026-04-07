# System Architecture

## Architecture Goal

Studio should scale as a controlled product system, not as a pile of routes and provider hacks.

The architecture is organized around clear responsibility boundaries.

## Main Layers

### Web Layer

Path:
- `apps/studio/web`

Responsibilities:
- route shell
- auth-aware product surfaces
- Create and Chat UI
- typed API consumption
- local UX state only

The web layer must never become the source of truth for:
- billing
- ownership
- moderation
- runtime job state
- provider routing

### Backend Layer

Path:
- `apps/studio/backend`

Responsibilities:
- auth/session validation
- generation orchestration
- chat orchestration
- entitlement enforcement
- ownership rules
- billing resolution
- share/public access control

The backend is the authoritative decision layer.

### Persistence Layer

Current direction:
- local durable metadata through runtime-root SQLite
- future staging/production authority through Postgres/Supabase

Responsibilities:
- identities
- projects
- conversations
- generations
- assets
- shares
- credit/billing records

### Provider Layer

Responsibilities:
- image provider routing
- chat provider routing
- quality policy
- fallback control
- cost-aware execution

Provider choice is not product identity.

Provider orchestration must remain replaceable.

## Critical Product Domains

### Auth And Identity

Rules:
- one identity, many protected actions
- local owner mode can bypass economics, not safety
- auth stability matters because every premium surface depends on it

### Generation Runtime

Rules:
- web and worker runtime must remain durable
- claims, retries, timeouts, and recovery must be deterministic
- jobs must not disappear silently

### Chat Backbone

Rules:
- chat is not generic text generation
- chat must preserve continuity
- chat should emit execution-ready metadata when appropriate
- chat should bridge into Create/Edit without guesswork

### Billing And Entitlements

Rules:
- credit logic must be server-authoritative
- reservation and settlement must be traceable
- plan access and usage rights must resolve from one unified state model

### Security And Ownership

Rules:
- asset access must respect owner/share/public scope
- moderation state must be durable
- abuse controls must be real backend policy, not frontend theatre

## Source Of Truth Files

For live operational truth:
- [Version Manifest](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/version.json)
- [Release Ledger](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md)
- [Maintenance Map](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md)

For implementation truth:
- `apps/studio/backend/studio_platform/service.py`
- `apps/studio/backend/studio_platform/router.py`
- `apps/studio/backend/studio_platform/repository.py`
- `apps/studio/backend/studio_platform/services/`
- `apps/studio/web/src/pages/`

## Architecture Quality Standard

A Studio architectural change is healthy when:
- responsibility gets clearer
- testing gets easier
- product intent gets more explicit
- state authority gets more centralized
- future provider or infrastructure changes get easier

It is unhealthy when:
- frontend starts inferring backend truth
- provider quirks leak into product semantics
- a fix works only locally and cannot be explained operationally
