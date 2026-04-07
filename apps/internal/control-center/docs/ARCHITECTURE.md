# OCOS Architecture

## Surfaces

- `web/`: operator cockpit and API routes, hosted on Firebase App Hosting
- `worker/`: Cloudflare Worker for sparse checks, signed ingress, and Telegram
- `cli/`: terminal commands for operator workflows

## Data flow

1. Studio public checks run on sparse worker schedules.
2. The worker posts normalized results into OCOS ingest routes.
3. Ingest logic updates Supabase state and decides incident transitions.
4. The worker sends Telegram alerts when the ingest response says a message is due.
5. Operators use the PWA or CLI for acknowledgements and bounded actions.
6. Safe actions dispatch GitHub workflows or immediate public rechecks.
7. If remediation fails or the incident ages out, OCOS creates a Codex bundle.

## Hosting

- `ops.omniacreata.com`: internal production PWA + API
- `staging-ops.omniacreata.com`: internal staging PWA + API
- `hooks-ops.omniacreata.com`: Cloudflare Worker ingress and cron target

## Protection model

- Cloudflare Access guards the UI hostnames
- `hooks-ops` stays outside Access and requires HMAC verification
- PAT auth is enforced for CLI and sensitive mutation routes
- `robots` and metadata mark the UI as `noindex`
