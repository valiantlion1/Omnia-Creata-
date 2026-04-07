# OCOS Supabase

This directory owns the OCOS relational schema. v0 stores service topology,
incidents, actions, notifications, PAT hashes, escalation bundles, and external
artifact links.

Apply the migration in `migrations/` to the OCOS Supabase project before the
worker and web surfaces are promoted out of demo mode.
