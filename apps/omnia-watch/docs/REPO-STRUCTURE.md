# Repo Structure

## Applications

- `apps/web`
  - Next.js SaaS app
  - public and authenticated surfaces
  - locale-aware routing
  - API handlers
- `apps/agent-windows`
  - Electron-based Windows companion
  - main, preload, and renderer separation

## Shared packages

- `packages/config`
  - shared TypeScript and Tailwind configuration
- `packages/design-tokens`
  - semantic colors, spacing, typography, shadows, radii, chart colors
- `packages/ui`
  - shared React UI building blocks
- `packages/types`
  - domain entities and enums
- `packages/validation`
  - Zod schemas for payloads and entities
- `packages/api-contracts`
  - typed SaaS API contract definitions
- `packages/i18n`
  - locale dictionaries and locale helpers
- `packages/utils`
  - class merging and formatting helpers

## Other folders

- `docs`
  - product and technical documentation
- `scripts`
  - reserved for future automation and build helpers
- `assets`
  - reserved for brand and media assets
- `supabase/migrations`
  - SQL schema history
