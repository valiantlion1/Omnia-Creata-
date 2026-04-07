# Product North Star

## Core Definition

OmniaCreata Studio is not a generic AI tool.

It is a premium-feeling creative product with two intentional surfaces:
- `Create`: deterministic image generation and visual execution
- `Chat`: premium multimodal creative copilot

The product promise is not just "generate images."

The real promise is:
- think with the user
- shape the idea
- preserve creative continuity
- generate or edit from the same product surface
- feel controlled instead of chaotic

## User Promise

Studio should feel like:
- a creative director
- a production assistant
- a visual strategist
- a generation engine

Studio should not feel like:
- a cheap chatbot
- a random prompt playground
- a loose provider demo
- separate disconnected tools pretending to be one product

## Surface Roles

### Create

Create is where execution becomes explicit.

It owns:
- generation parameters
- workflow choice
- reference-guided execution
- output review
- deterministic reruns

### Chat

Chat is where thinking becomes actionable.

It owns:
- ideation
- prompt shaping
- image critique
- edit planning
- follow-up refinement
- handoff into Create/Edit without losing context

## Product Principles

1. `Create` and `Chat` stay distinct unless the user explicitly crosses surfaces.
2. Backend truth is more important than frontend convenience.
3. Degraded behavior is allowed, but never hidden.
4. Premium feel comes from consistency, not only model quality.
5. Follow-up continuity is a product requirement, not a nice-to-have.
6. Auth, ownership, billing, moderation, and runtime must remain server-authoritative.

## V1 Standard

Studio V1 should be considered healthy only when:
- auth is stable
- generation runtime is durable
- billing and entitlements are trustworthy
- share and asset ownership are secure
- chat feels like a real creative copilot
- create and chat handoff keeps execution context

## Public Launch Standard

Public launch should not happen just because the app "works."

Public launch should happen when:
- chat is strong enough to be the differentiator
- generation quality is predictable enough to protect trust
- logs and operational visibility are strong enough to debug real usage
- degraded states are honest
- local-only fragility is no longer part of the user experience
