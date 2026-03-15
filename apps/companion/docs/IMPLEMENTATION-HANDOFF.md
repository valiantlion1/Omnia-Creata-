# OmniaCompanion Implementation Handoff

## Purpose

This document translates the cleaned product plan into a safe starting point for the next implementation thread.

## Recommended first implementation surface

Start Companion as a web product under:

```text
apps/companion/
  web/
  docs/
```

Do not start with multi-surface scope. The first implementation should prove the product loop in a single canonical interface.

## Recommended build order

### 1. Product skeleton

- app shell
- onboarding entry
- authenticated user area
- companion list/library
- navigation for chat, companion settings, and discovery

### 2. Core domain model

- user
- companion
- companion profile
- conversation thread
- message
- memory/settings

### 3. Creation flow

- create companion
- edit personality and guardrails
- upload or choose avatar
- save draft and publish privately

### 4. Conversation flow

- start chat
- persist thread history
- show companion metadata in context
- handle regeneration, retry, and safety fallback states

### 5. Return loop

- recent conversations
- saved companions
- memory/settings adjustments
- lightweight featured or discovery shelf

## Guardrails for the next build thread

- do not pull OCOS into the implementation scope
- do not make Studio a hard blocker
- do not make Prompt Vault a required dependency
- do not build marketplace, revenue share, or creator economics in the first pass
- do not let internal platform language leak into end-user UX

## Safe assumptions for implementation

- Companion is text-first at launch
- media features are optional follow-up work
- web is the first canonical surface
- ecosystem integrations are adapters, not foundations
- the MVP should optimize for clarity and continuity over feature volume

## What the next thread should produce

- concrete app structure for `apps/companion/web`
- initial route map
- core data model proposal
- MVP screen plan
- implementation sequence for Phase 1

## What the next thread should avoid

- rebuilding product strategy from scratch
- debating whether Companion is really an internal tool
- inventing OCOS-dependent architecture
- jumping straight into advanced creator economy systems
