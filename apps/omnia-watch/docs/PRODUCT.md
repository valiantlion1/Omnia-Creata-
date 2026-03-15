# Product Model

## Positioning

Omnia Watch is a premium PC maintenance and software intelligence platform for modern Windows users. It is designed to become a cleaner, more trustworthy, and more extensible alternative to legacy utility suites and scammy optimizer tools.

## Core promise

- Show users what needs attention on their PC
- Present update intelligence honestly
- Surface cleanup, startup, health, and security insight clearly
- Keep trust higher than hype
- Connect local device reality to a global SaaS experience

## Experience model

The product consists of two connected layers:

1. Web SaaS
   - watch.omniacreata.com product portal
   - download and onboarding
   - account-aware device dashboard
   - recommendations and history
   - callback surface for shared ecosystem auth
2. Windows companion
   - local machine inspection
   - pairing and secure identity
   - safe scan execution
   - data sync to SaaS
   - future controlled maintenance actions

## Ecosystem account model

- Omnia Watch is an Omnia Creata product, not a standalone identity silo.
- The long-term account hub is `account.omniacreata.com`.
- This repository keeps watch-side auth callbacks and shared Supabase integration points so it can use the same user identities as the future account repo.
- Supported sign-in methods are:
  - Google OAuth
  - email and password
  - magic link

## Phase 1 scope in this repository

- public site foundation
- app dashboard foundation
- watch.omniacreata.com-ready auth and callback foundation
- multi-device data model
- application inventory model
- recommendations model
- history and operation model
- Windows agent scan/sync foundation
- Supabase schema and RLS baseline

## What is intentionally not faked

- The web app does not claim to clean or manage a PC by itself
- Unsupported update ecosystems are not disguised as automated
- Billing is modeled, but checkout is not pretended to be live
- Live auth and dashboard reads are wired, but real credentials and Supabase project setup are still required before production use
