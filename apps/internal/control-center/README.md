# OCOS

OCOS is the OmniaCreata internal incident operating system.

This workspace is the control plane for hosted operator flows that must remain
available when local development machines are offline. v0 is Studio-first and
ships three coordinated surfaces:

- `web/`: Next.js App Router PWA for phone and desktop operators
- `worker/`: Cloudflare Worker for sparse checks, signed ingress, and alerts
- `cli/`: terminal-style operator commands backed by the same OCOS API
- `packages/contracts/`: shared Zod contracts and monitoring defaults
- `supabase/`: schema and migrations for incident state
- `docs/`: architecture, policy, and runbook format

## Product rules

- Internal-only system under `ops.omniacreata.com`
- Hidden from public nav, sitemap, and indexing
- Protected by Cloudflare Access at the edge
- Studio is the only tracked live service in v0
- Bounded auto-remediation comes before Codex escalation

## Local development

1. Install workspace dependencies from this directory with `npm install`.
2. Copy `web/.env.example` and `worker/.dev.vars.example` into local env files.
3. Start the web UI with `npm run dev:web`.
4. Start the worker with `npm run dev:worker`.
5. Use Cloudflare Quick Tunnel when phone preview is needed for localhost work.

## Build targets

- `ops.omniacreata.com`: production operator UI
- `staging-ops.omniacreata.com`: staging operator UI
- `hooks-ops.omniacreata.com`: signed machine ingress only
