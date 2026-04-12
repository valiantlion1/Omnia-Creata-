# OmniaCreata Studio Replit Migration Map

Last updated: 2026-03-25

## Purpose

This document defines how the Replit donor project should be harvested and migrated into the real OmniaCreata Studio codebase.

The donor project is here:
- `apps/studio/OmniaCreata-Studio-staging/OmniaCreata-Studio`

It is valuable, but it should not be merged raw.

## Executive Summary

The Replit project contains strong product architecture ideas:
- separate web and mobile apps
- dedicated API server
- shared typed contracts
- chat and create as distinct surfaces
- conversations, generations, credits, and collections

It also contains non-portable assumptions:
- Replit Auth
- Replit-hosted Gemini integration
- workspace-specific monorepo wiring
- theme and brand choices that do not match final Omnia direction

Migration rule:
- keep the product structure
- replace the platform bindings
- redesign the visual language
- preserve the layout quality and UX completeness

## Source Areas

### Web

Source:
- `artifacts/omniacreata-web`

Contains:
- route shell
- responsive layout
- home
- chat
- create
- explore
- gallery
- models
- settings
- large reusable component library

### Mobile

Source:
- `artifacts/omniacreata-mobile`

Contains:
- Expo app shell
- chat
- create
- gallery
- settings
- native-ish interaction patterns

### API

Source:
- `artifacts/api-server`

Contains:
- auth routes
- generate routes
- chat routes
- gallery routes
- credits routes
- health

### Shared packages

Source:
- `lib/db`
- `lib/api-zod`
- `lib/api-client-react`
- `lib/api-spec`

Contains:
- schema
- typed request/response contracts
- OpenAPI-style thinking
- React Query client layer

## What We Should Keep

### Product structure

Keep:
- Chat as a first-class multimodal workspace
- Create as a separate fast generation workspace
- Gallery / collections
- Credits ledger
- Conversations and messages
- Shared web/mobile/backend contracts
- Separate web and mobile deployment model

### Backend/domain ideas

Keep:
- `credit_transactions`
- `generations`
- `conversations`
- `messages`
- `collections`
- `collection_items`

Reference:
- `lib/db/src/schema/studio.ts`

### Web UX ideas

Keep:
- strong app shell separation
- optional right-panel layout behavior
- dedicated Chat page
- dedicated Create page
- gallery selection and collections behavior
- mobile bottom-nav logic as a concept, not as final visual style

References:
- `artifacts/omniacreata-web/src/components/layout/AppLayout.tsx`
- `artifacts/omniacreata-web/src/pages/ChatPage.tsx`
- `artifacts/omniacreata-web/src/pages/CreatePage.tsx`
- `artifacts/omniacreata-web/src/pages/GalleryPage.tsx`

### Mobile UX ideas

Keep:
- chat quick action flow
- upload / save / haptic interaction ideas
- separate mobile app mentality rather than responsive-only web thinking

Reference:
- `artifacts/omniacreata-mobile/app/(tabs)/chat.tsx`

## What We Should Adapt

### Auth

Current donor approach:
- Replit Auth
- cookie-based web sessions
- mobile bearer token exchange

Adapt to:
- Omnia identity
- Supabase Auth or equivalent Omnia-owned auth layer
- shared session and ownership rules across web/mobile

### AI integration

Current donor approach:
- Gemini via Replit AI integrations

Adapt to:
- Omnia-owned provider layer
- support for:
  - chat vision
  - prompt rewrite
  - image generation
  - image editing
  - inpaint / variation flows

Recommended boundary:
- `studio-api` orchestrates
- `studio-ai-services` executes provider-specific tasks

### Theme and visual design

Current donor approach:
- dark purple / indigo AI SaaS look

Adapt to:
- new Omnia palette reset
- cream / soft white / ice blue / slate / charcoal exploration
- premium layout quality without generic purple SaaS identity

### Route and product IA

Current donor routes:
- home
- chat
- create
- explore
- gallery
- models
- settings

Adapt to final IA:
- home
- dashboard
- chat
- create
- project
- history
- media
- billing
- settings

Potential handling:
- `gallery` evolves into `media`
- `explore` becomes optional or later-phase
- `models` becomes an internal panel or settings sub-surface instead of a top-level nav item

## What We Should Not Carry Forward As-Is

- Replit-specific runtime wiring
- `.git` history from the zip
- `.expo` cache artifacts
- `.config`, local agent folders, and staging clutter
- default violet branding
- exact route names where they conflict with final Studio IA

## Target Architecture Mapping

### Current Omnia Studio target

- `apps/studio/web`
- `apps/studio/backend`

### Recommended next target

- `apps/studio/web`
- `apps/studio/mobile`
- `apps/studio/backend`
- optional future `apps/studio/ai-services` or backend submodule
- `packages/studio-contracts`
- `packages/studio-db-schema`
- `packages/studio-ui`

### Mapping

- donor `artifacts/omniacreata-web` -> Omnia `apps/studio/web` concepts and selected components
- donor `artifacts/omniacreata-mobile` -> Omnia `apps/studio/mobile`
- donor `artifacts/api-server` -> Omnia `apps/studio/backend` TypeScript track or reference implementation
- donor `lib/db`, `api-zod`, `api-client-react` -> shared packages / contracts reference

## Harvest Decisions

### Take almost directly

- conversation model
- gallery collections model
- credit transaction model
- chat quick actions concept
- create/chat split
- separate mobile app concept

### Take with strong refactor

- web app shell
- create page UX
- gallery page UX
- API routes
- typed clients
- mobile navigation and screen structure

### Use as inspiration only

- final branding
- palette
- top-level IA labels
- marketing/home messaging

## Priority Migration Order

### Phase A

Establish architecture and donor extraction:
- create migration-safe notes
- identify reusable backend/domain contracts
- decide whether final backend stays Python-first or shifts Studio app backend to TypeScript

### Phase B

Lift the domain model:
- credits
- generations
- conversations
- messages
- collections

### Phase C

Lift the UX model:
- Chat
- Create
- Media

### Phase D

Rebuild brand layer:
- palette reset
- typography reset
- Omnia layout rules
- premium interaction polish

### Phase E

Bring mobile into the official Studio tree.

## Recommended Immediate Tasks

1. Create a clean donor inventory document.
2. Compare donor DB schema with current Studio backend entities.
3. Decide final backend operating model:
   - Python orchestrator + TS BFF
   - or TypeScript Studio backend with separate AI execution service
4. Port conversation + gallery + credits domain into official Studio contracts.
5. Add official `apps/studio/mobile` scaffold using donor mobile app as reference.
6. Rebuild web shell around final IA and palette.

## Final Rule

The Replit project already proved:
- the product can feel complete
- chat and create can coexist
- mobile should exist

Our job is not to replace those ideas.
Our job is to make them portable, brand-correct, and production-owned by OmniaCreata Studio.
