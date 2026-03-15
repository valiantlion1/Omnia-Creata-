# Database

## Platform choice

Supabase is the backend foundation because it provides:

- hosted Postgres
- authentication
- row-level security
- practical startup speed
- a good fit for account, dashboard, and device-data products
- a practical way to keep one Omnia Creata identity project shared by multiple products

## Project model

- v1 uses one shared Supabase project per environment.
- `watch.omniacreata.com` and the future `account.omniacreata.com` repo should reuse that same project.
- User identity is shared across the ecosystem, while Watch-specific device and scan data remains in product tables guarded by RLS.

## Core tables

- `profiles`
- `user_preferences`
- `plans`
- `subscriptions`
- `devices`
- `device_pairings`
- `device_scans`
- `scan_app_items`
- `scan_cleanup_items`
- `scan_startup_items`
- `scan_security_items`
- `maintenance_recommendations`
- `operation_logs`
- `activity_events`
- `legal_acceptances`

## Security model

- every user-scoped table has RLS enabled
- users can only see or mutate their own rows
- plans are readable to authenticated users
- profile and preference rows are bootstrapped on user creation
- device pairing and scan ingestion use the service-role client on the server, not browser credentials
- watch-specific session cookies are still established on the watch domain even when the upstream identity UX lives on another Omnia Creata subdomain

## Pairing model

- device pairing codes are stored as hashes
- device tokens are stored as hashes
- pairing rows track `pairing_expires_at` and `consumed_at`
- pairings can be revoked independently
- device usage timestamps are tracked separately from scan timestamps

## Current status

- base schema migration exists and a follow-up pairing lifecycle migration adds expiry and token index support
- live repository adapters are wired in the web app when Supabase public credentials are configured
- Google OAuth, email/password, and magic-link flows can all use the same shared Supabase project
- device pairing and scan ingestion become live only when the service-role key and device credential secret are supplied
- demo mode still exists for honest local development before credentials are available
