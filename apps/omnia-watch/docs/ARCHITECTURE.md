# Architecture

## Top-level shape

Omnia Watch is architected as a SaaS platform plus a local Windows companion.

- `apps/web`
  - Next.js App Router
  - watch.omniacreata.com product portal
  - Supabase-backed auth and callback flows
  - locale-aware routing
  - validated SaaS APIs
- `apps/agent-windows`
  - Electron shell
  - main-process collectors and services
  - preload bridge
  - renderer UI
- `packages/*`
  - shared domain model and presentation primitives
- `supabase/migrations`
  - durable backend schema and security

## SaaS responsibilities

- watch product portal experience
- device inventory and overview
- scan history and recommendations
- download and onboarding flows
- watch-side auth callbacks against a shared Omnia Creata identity backend
- future billing and workspace management

## Identity boundary

- `account.omniacreata.com` is expected to be the shared Omnia Creata account surface in a separate repository.
- Omnia Watch keeps its own callback endpoints and session cookies on `watch.omniacreata.com`.
- Both apps should point at the same Supabase project so a single Omnia Creata identity can access multiple products without duplicating users.
- v1 does not attempt a single cookie shared automatically across every Omnia Creata subdomain.

## Agent responsibilities

- identify the local machine
- inspect installed software
- detect likely update candidates
- inspect cleanup opportunities
- inspect startup entries
- inspect health and security basics
- sync results to SaaS

## Data flow

1. User signs in through the shared Omnia Creata Supabase project.
2. Watch callbacks exchange the auth code and establish a watch.omniacreata.com session cookie locally.
3. The authenticated web app creates a short-lived pairing code and stores only its hash.
4. The Windows companion exchanges that pairing code for a scoped device token and persists the returned device identity locally.
5. Agent collectors build a typed scan snapshot for apps, cleanup, startup, health, security, and recommendations.
6. Agent syncs the scan payload to the SaaS API with the scoped device bearer token.
7. SaaS validates the token hash, persists the scan envelope and scan item rows, updates device summaries, and refreshes unresolved recommendations.
8. Dashboard pages read device data through session-aware Supabase repositories under RLS.

## Runtime modes

### Demo mode

- no Supabase credentials required
- dashboard uses realistic shared demo data
- API routes validate payloads and return local-development responses

### Connected mode

- enabled once `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are configured
- web auth, Google/password/magic-link flows, session loading, and dashboard repository reads become live
- app routes redirect unauthenticated users to sign-in

### Device pipeline mode

- enabled once connected mode is active and both `SUPABASE_SERVICE_ROLE_KEY` and `DEVICE_CREDENTIAL_SECRET` are configured
- pairing codes and device tokens are hashed before storage
- agent pairing and scan sync routes persist real device data to Supabase
- operational audit rows are best-effort so the core pairing and sync flow does not fail just because logging is unavailable

## Design system direction

- shared design tokens package
- shared React UI package for SaaS surfaces
- Figma-friendly token structure
- serious neutral + teal visual language
- consistent spacing, radius, shadows, and typography decisions

## Hosting direction

- Backend of record: Supabase
- Web hosting target: Firebase App Hosting
- Fallback if App Hosting constraints become a problem: Cloud Run
- Firebase is not the source of truth for auth or product data in this repository
