# Studio Production Env Checklist

Status baseline: `0.6.0-alpha` / build `2026.04.30.249` / channel `alpha` / status `prelaunch`

Doctrine for v1 controlled paid launch:
- Public image generation runs on the Runware launch catalog.
- `Chat` remains a visible first-class Studio surface by default; `VITE_STUDIO_CHAT_ENABLED=0` is only for a deliberate emergency rollback or image-only drill.
- Billing runs on Paddle, persistence on Supabase Postgres + storage, queue/state on Redis

This checklist exists so the operator can flip Studio + the marketing site live without guessing which env vars are load-bearing. Do not commit real secrets to the repo. Set everything below in the hosting provider.

## 1. Backend (Render — `apps/studio/backend`)

### 1.1 Required secrets

| Var | Notes |
| --- | --- |
| `JWT_SECRET` | At least 32 chars. Must NOT match the dev fallback. |
| `DATABASE_URL` | Supabase Postgres connection string with `pgbouncer=true` if pooled. |
| `SUPABASE_URL` | Project URL, must be `https://...supabase.co`. |
| `SUPABASE_ANON_KEY` | Public anon key — required for the auth surface. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only. Never expose to the web bundle. |
| `REDIS_URL` | Required in non-dev. Free tier acceptable for L0 only. |
| `RUNWARE_API_KEY` | Sole image provider for v1. |
| `TURNSTILE_SECRET_KEY` | Server-only CAPTCHA secret. Never put this in `VITE_*`, `NEXT_PUBLIC_*`, or any browser env. |
| `PADDLE_API_KEY` | Server-only billing key. |
| `PADDLE_WEBHOOK_SECRET` | Used to verify Paddle webhook signatures. |

### 1.2 Required strings

| Var | Value | Notes |
| --- | --- | --- |
| `ENVIRONMENT` | `production` | Triggers strict env validation. |
| `ALLOWED_HOSTS` | `studio-api.onrender.com,studio.omniacreata.com` | Must be explicit public hostnames; do not include `localhost`, loopback/private IPs, single-label hosts, or `*` in staging/prod. |
| `ASSET_STORAGE_BACKEND` | `supabase` | Required in staging/prod. |
| `SUPABASE_STORAGE_BUCKET` | `studio-assets` | Default; only override if the bucket name diverges. |
| `DATA_DEPLOY_PLATFORM` | `supabase` | |
| `STORAGE_DEPLOY_PLATFORM` | `supabase` | |
| `BILLING_BACKBONE_PROVIDER` | `paddle` | |
| `PADDLE_ENVIRONMENT` | `production` | Sandbox is acceptable only for staging. |
| `CAPTCHA_PROVIDER` | `turnstile` | |
| `CAPTCHA_VERIFICATION_ENABLED` | `true` | Required before public paid signup/login exposure. |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key | Backend verifies hostname/action using the same public site key. |
| `PROTECTED_BETA_IMAGE_PROVIDER` | `runware` | Locks the public image lane onto Runware. |
| `GENERATION_PROVIDER_STRATEGY` | `managed-first` | |

### 1.3 Spend guardrails

| Var | Recommended | Notes |
| --- | --- | --- |
| `PROVIDER_SPEND_GUARDRAILS_ENABLED` | `true` | Default; do not flip off for a public launch. |
| `RUNWARE_DAILY_SOFT_CAP_USD` | conservative early band | Unsets to "no cap" — set this. |
| `RUNWARE_DAILY_HARD_CAP_USD` | strict ceiling | Trips the kill-switch. |
| `MONTHLY_AI_SPEND_SOFT_CAP_USD` | `25` (default) | Tune to plan revenue. |
| `MONTHLY_AI_SPEND_HARD_CAP_USD` | `60` (default) | Tune to plan revenue. |

### 1.4 Catalog and economics gate

| Var | Value | Notes |
| --- | --- | --- |
| `PUBLIC_PAID_PROVIDER_ECONOMICS_READY` | `true` only after founder signoff and the launch-economics lock is current-build true | Stays `false` in staging until proof is rerun on the active build. |
| `PUBLIC_PAID_PROVIDER_ECONOMICS_READY_BUILD` | active build number | Used by surface checks to confirm the gate is build-aligned. |
| `CREATOR_MONTHLY_CREDITS` | `4000` | Override only with founder signoff. |
| `PRO_MONTHLY_CREDITS` | `12000` | Override only with founder signoff. |
| `CREATOR_MONTHLY_PRICE_USD` | `12` | |
| `PRO_MONTHLY_PRICE_USD` | `24` | |
| `CREDIT_PACK_SMALL_CREDITS` / `_PRICE_USD` | `2000` / `8` | |
| `CREDIT_PACK_LARGE_CREDITS` / `_PRICE_USD` | `8000` / `24` | |

### 1.5 Vars that must stay unset for v1

These are not required for the Runware-first launch. Leaving them set wastes config surface or risks accidentally routing traffic onto unproved backup lanes.

- `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `GEMINI_API_KEY`, `FAL_API_KEY`, `STABILITY_API_KEY`, `HUGGINGFACE_TOKEN`
- `CHAT_PRIMARY_PROVIDER` overrides — current code default `runware` is fine unless an operator intentionally changes the chat lane.
- Daily caps for non-Runware providers (no traffic should hit them).

## 2. Web app (Vercel — `apps/studio/web`)

| Var | Required | Notes |
| --- | --- | --- |
| `VITE_API_BASE_URL` | yes | Backend URL, e.g. `https://api.omniacreata.com`. No trailing slash. |
| `VITE_SUPABASE_URL` | yes | Same value as backend `SUPABASE_URL`. |
| `VITE_SUPABASE_ANON_KEY` | yes | Public anon key. |
| `VITE_AUTH_REDIRECT_BASE_URL` | yes | Public web origin used for OAuth callbacks. |
| `VITE_TURNSTILE_SITE_KEY` | yes | Required for signup CAPTCHA enforcement. |
| `VITE_POSTHOG_KEY` | optional | Leave unset to keep analytics off. |
| `VITE_POSTHOG_HOST` | optional | Defaults to `https://app.posthog.com`. |
| `VITE_STUDIO_CHAT_ENABLED` | optional | Leave unset for normal launch behavior. Set `0` only for an explicit image-only drill or emergency rollback. |

## 3. Marketing site (Vercel — `website/omniacreata-com`)

| Var | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_STUDIO_URL` | only after Studio is live | Public URL; controls where "Open Studio" buttons go. Buttons fall back to `/products/omnia-creata-studio` when unset. |
| `CONTACT_WEBHOOK_URL` | recommended | Server-only contact form delivery. Must be HTTPS and must not point at private/local IP literals in production. Without it, the public contact path falls back to `founder@omniacreata.com`. |
| `CONTACT_WEBHOOK_SECRET` | with `CONTACT_WEBHOOK_URL` | Server-only secret. |

## 4. Pre-launch verification loops

`.244` carries the Runware-only doctrine and chat-surface gating but has not been re-proofed. Public paid exit must rerun all of the following against the active build before flipping `PUBLIC_PAID_PROVIDER_ECONOMICS_READY=true`:

- backend regression suites for pricing, backend spine, prompt engineering, provider routing, router generation, generation runtime, and service regressions
- web type-check + production build
- live local verify against the active build
- live Runware provider smoke
- protected staging deploy and smoke

Until those rerun green, treat `.244` as code-true but not proof-true, and do not narrate it as smoke-refreshed.
