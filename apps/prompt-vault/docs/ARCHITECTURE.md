# Architecture

## Repo shape

```text
/apps/web
/packages/config
/packages/i18n
/packages/types
/packages/validation
/docs
/supabase/migrations
```

## Application layers

### 1. Shared packages

- `@prompt-vault/types`
  Domain types for prompts, versions, collections, tags, preferences, activities, and auth mode.
- `@prompt-vault/config`
  Brand metadata, navigation, category catalog, platform catalog, and pricing tiers.
- `@prompt-vault/i18n`
  Locale dictionaries and translation helpers.
- `@prompt-vault/validation`
  Zod schemas for prompt and collection writes.

### 2. Next.js app

- `src/app`
  Route tree, metadata routes, locale wrappers, and PWA routes.
- `src/components`
  Shared UI primitives, marketing shell, app shell, and app views.
- `src/providers`
  Theme, locale, toast, and vault state providers.
- `src/lib`
  Environment detection, preview dataset, export helpers, formatting, locale helpers, and Supabase clients.

## Runtime modes

### Preview mode

- Trigger:
  Missing Supabase public environment variables.
- Data:
  Seed dataset plus local browser persistence.
- Goal:
  Keep the product usable and evaluable without pretending live auth is complete.

### Supabase mode

- Trigger:
  `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are present.
- Data:
  Auth flows become live through Supabase clients, and the user vault is persisted to `public.user_vault_state`.
- Goal:
  Provide account-backed sync without forcing the first release into a large relational CRUD rewrite.

## App route model

- `/{locale}`
  Public homepage
- `/{locale}/features`
- `/{locale}/how-it-works`
- `/{locale}/pricing`
- `/{locale}/faq`
- `/{locale}/sign-in`
- `/{locale}/sign-up`
- `/{locale}/forgot-password`
- `/{locale}/app`
  Dashboard
- `/{locale}/app/library`
- `/{locale}/app/library/{promptId}`
- `/{locale}/app/editor/new`
- `/{locale}/app/editor/{promptId}`
- `/{locale}/app/collections`
- `/{locale}/app/favorites`
- `/{locale}/app/recent`
- `/{locale}/app/settings`

## State flow

1. `VaultProvider` loads preview data from local storage or falls back to the seeded dataset.
2. If a Supabase session exists, `VaultProvider` loads the matching `user_vault_state` row and merges it with local state.
3. App views derive filtered lists and dashboard summaries from the shared dataset.
4. Prompt saves validate through `@prompt-vault/validation`.
5. Saves create a new version record instead of overwriting history.
6. Dataset changes persist back to local storage and, after hydration, back to `user_vault_state` for signed-in users.

## AI layer

- Server route:
  `/api/ai/assist`
- Provider abstraction:
  OpenRouter, Groq, Together, and a preview heuristic provider
- Server-only security:
  Provider secrets stay in environment variables and never cross into client code
- Abuse controls:
  same-origin enforcement, per-actor rate limiting, validated input, validated output, request logging
- Product boundary:
  AI is scoped to organization and improvement tasks only, not freeform chat

## Design system approach

- Tailwind v4 with product-specific CSS variables
- Shared primitives for buttons, inputs, surfaces, badges, section headings, and empty states
- One consistent visual language across marketing and product surfaces
- Mobile-first app shell with a centered mobile canvas and bottom navigation across viewport sizes
