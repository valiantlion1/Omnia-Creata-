# Decisions

## Monorepo with one app and shared packages

Chosen because Prompt Vault needs shared domain contracts, config, and i18n across a growing Omnia Creata ecosystem.

## Next.js App Router

Chosen for:

- public marketing + authenticated app in one product
- route-level metadata and PWA support
- future SSR data loading for authenticated user vaults

## Tailwind v4 with custom tokens

Chosen for:

- fast product iteration
- custom premium styling without template lock-in
- clean shared primitives

## Supabase as backend direction

Chosen for:

- auth
- row-level security
- practical SaaS velocity
- scalable account-backed sync

## Preview mode fallback

Important assumption:

- The user asked to keep building without blocking on secrets.
- Real Supabase credentials are not available inside this session.
- Therefore the app runs honestly in preview mode while remaining auth-ready and schema-ready.

## Locale-prefixed routing

Chosen because it supports:

- `/en` and `/tr` public pages
- shared locale strategy across marketing and app surfaces
- future product expansion under multiple Omnia Creata surfaces

## Server-only AI assistance

Chosen because Prompt Vault needs:

- secret-safe provider access
- backend-controlled rate limiting
- request logging and usage tracking
- swappable providers without rewriting UI logic
- a strong product boundary that keeps AI focused on organization and improvement
