# OmniaCreata Studio Direction Lock

Last updated: 2026-03-25

## Product Position

OmniaCreata Studio (OCS) is a premium AI visual product for everyone, not only for creators.

Target audience includes:
- everyday users
- entrepreneurs
- marketers
- students
- hobbyists
- designers
- storytellers
- founders
- professionals who need visual output fast

The product should feel:
- premium
- modern
- useful
- beautiful
- intuitive
- powerful without being intimidating

It should not be marketed as an ecosystem.

## Core Product Split

Two core creation modes are locked in:

### Chat

Chat is a multimodal conversational workspace.

The user can:
- talk to the AI like ChatGPT or Grok
- upload images
- upload files
- ask for prompt help
- ask for edits
- ask for inpainting
- ask for variations
- ask for analysis and transformation workflows

Chat is a major differentiator and should be treated as a first-class product surface.

### Create

Create is the direct, deterministic generation workspace.

The user can:
- write prompts directly
- choose models
- choose styles
- pick aspect ratios
- configure generation controls
- run focused image generations quickly

Chat and Create must remain separate because they solve different user intents.

## Platform Structure

Web and mobile should remain separate applications.

Recommended shape:
- `studio-web`
- `studio-mobile`
- `studio-api`
- `studio-ai-services`

### Recommended architecture

- `studio-web`
  Product-grade React web app
- `studio-mobile`
  Expo / React Native mobile app
- `studio-api`
  TypeScript BFF for auth, app data, projects, chat sessions, generations, gallery, credits, billing
- `studio-ai-services`
  Python or provider-focused AI execution layer for generation, inpaint, image analysis, and model orchestration

This preserves the strengths of the current repo and the Replit donor project:
- shared typed contracts for web/mobile/app backend
- dedicated AI execution layer for generation-heavy workflows

## Replit Donor Project Verdict

The Replit export is valuable and should be treated as a donor project, not merged raw.

### Keep

- separate web and mobile concept
- chat/create split
- gallery, collections, credits, conversation model
- typed API / schema thinking
- responsive layout structure
- stronger product completeness than the older Studio prototype

### Replace or adapt

- Replit Auth bindings
- Replit-hosted Gemini integration assumptions
- workspace-specific monorepo wiring
- direct dependency on Replit platform services

### Do not merge directly

Reasons:
- includes `.git`, caches, internal config, and Replit-specific runtime assumptions
- current theme is not the final Omnia direction
- some routes and naming are useful, but not all belong in V1 exactly as-is

## Visual Direction Reset

Layout quality from the Replit work is strong and should be preserved.

Color direction should be reset.

Preferred exploration direction:
- cream / soft white
- ice blue / mist blue
- muted graphite / slate / charcoal support tones
- premium contrast without looking corporate

Visual goals:
- clean but not sterile
- premium but not cold
- detailed but not crowded
- strong placement and spacing
- high-end interaction quality

Avoid:
- generic purple SaaS feel as the default whole-brand identity
- private bank / real estate / consultancy vibes
- over-branded luxury copy

## UX Principles

- explain the product quickly
- let normal people understand what they can do on the first screen
- keep interfaces beautiful and practical at the same time
- prioritize layout quality over decorative styling
- make upload, transformation, and generation actions feel effortless

## Product Priorities

### V1 pillars

1. Chat with multimodal image/file understanding
2. Create with direct generation controls
3. Gallery / media continuity
4. Projects and history
5. Credits / billing / quotas
6. Web and mobile parity at the experience level

### Key AI actions

- generate
- analyze
- rewrite prompt
- vary
- upscale
- inpaint
- edit from uploaded image
- continue a visual direction through conversation

## Recommended Next Build Strategy

1. Use the Replit project as the product and UX donor.
2. Keep web and mobile as separate apps in the final architecture.
3. Rebuild the app shell around Omnia brand rules and the updated palette.
4. Move auth and provider logic away from Replit-specific services.
5. Keep typed contracts shared across web, mobile, and API.
6. Keep AI execution behind a dedicated service boundary.
7. Treat chat as a flagship surface, not a side experiment.

## Working Rule

From this point on:
- Replit is a donor baseline
- OmniaCreata Studio is the real product
- layout and interaction quality should stay high
- brand language, palette, integrations, and architecture should be owned by the Omnia implementation
