# OmniaCompanion Boundaries

## Canonical role

OmniaCompanion is a user-facing product in the Omnia Creata portfolio.

Its job is to deliver a strong companion experience. It should not absorb platform, monitoring, or operations responsibilities that belong elsewhere.

## In scope

- companion identity and personality modeling
- chat and conversation continuity
- user-controlled companion editing
- memory controls and relationship continuity
- private library management
- selective discovery of public or featured companions
- safety, consent, and user-facing guardrails

## Out of scope

- infrastructure monitoring
- automated incident response
- deployment orchestration
- control-center workflows
- general-purpose prompt management for the whole ecosystem
- unrelated asset generation tooling

## OCOS relationship

OCOS is a future internal Omnia control plane, not a Companion feature.

Rules:

- the end user should not need to know OCOS exists
- Companion must not require OCOS concepts in its product UX
- Companion planning should not assume OCOS is already built
- operational integrations with OCOS, if they exist later, belong to internal operations and observability layers

## Studio relationship

Omnia Creata Studio may later provide generation capabilities for avatars, scenes, or media enrichments, but Companion must not be architected as a thin wrapper around Studio.

Rules:

- Companion owns the user experience
- Studio, if used, is an optional downstream capability provider
- the MVP must not fail simply because Studio integration is not ready

## Prompt Vault relationship

Prompt Vault may later act as a source of templates, persona seeds, or reusable prompt assets, but Companion must not depend on Prompt Vault to make basic character creation work.

Rules:

- Companion needs native character creation
- Prompt Vault integration is optional and additive
- Companion-specific personality logic should stay Companion-owned unless a later cross-product abstraction is clearly justified

## Shared platform services

Shared authentication, billing, credits, notifications, or creator-economy services may be adopted later, but they should be treated as replaceable platform services rather than product identity.

Rules:

- Companion should define its own product model first
- shared services should reduce duplication, not drive product scope
- no placeholder dependency should block the first implementation

## Brand and UX rules

- users interact with OmniaCompanion as a standalone product experience
- internal system names must stay out of end-user language unless intentionally branded later
- the product should feel emotionally coherent, not like a dashboard of attached services

## Data ownership expectations

Companion should own its core product data model:

- companions
- persona configuration
- conversation threads
- memory/profile state
- user preferences
- library and discovery metadata specific to the product

External services may support Companion, but they should not erase clear ownership of Companion's primary data and UX contracts.
