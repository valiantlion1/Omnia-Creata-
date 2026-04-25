# Deployment

## Target shape

- Marketing site:
  `omniacreata.com`
- Product app:
  `prompt.omniacreata.com`

## Recommended deployment stack

- Frontend:
  Vercel
- Backend:
  Supabase
- Domains:
  Managed at Omnia Creata level with app subdomain routing

## Environment variables

Create `.env.local` in [`../web`](../web) from [`../web/.env.example`](../web/.env.example):

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AI_PROVIDER`
- `AI_FALLBACK_PROVIDER`
- `AI_MODEL`
- `AI_RATE_LIMIT_WINDOW_SECONDS`
- `AI_RATE_LIMIT_MAX_REQUESTS`
- `OPENROUTER_API_KEY`
- `GROQ_API_KEY`
- `TOGETHER_API_KEY`

## Deployment steps

1. Create a Supabase project.
2. Apply [`../supabase/migrations/202603140001_prompt_vault_init.sql`](../supabase/migrations/202603140001_prompt_vault_init.sql).
3. Add the public Supabase URL and anon key to the web app environment.
4. Add the server-only AI provider secrets and `SUPABASE_SERVICE_ROLE_KEY`.
5. Deploy the web workspace to Vercel.
6. Map `prompt.omniacreata.com`.
7. Verify sign-in, vault hydration, and `user_vault_state` writes with a real test account.

## Production web readiness gates

- `NEXT_PUBLIC_SITE_URL=https://prompt.omniacreata.com`
- `CAPACITOR_SERVER_URL=https://prompt.omniacreata.com`
- `NEXT_PUBLIC_ENABLE_ADS=false` until a real ad network and data safety update exist
- `NEXT_PUBLIC_ENABLE_AI=false` until provider policy, cost controls, and data safety update exist
- `/en/privacy` and `/en/terms` must be public and reachable
- `/api/health` must return `status: "ok"` from the deployed runtime
- `npm run lint`, `npm run typecheck`, and `npm run build` must pass from `apps/prompt-vault/web`
- Browser proof must cover:
  - `/en`
  - `/en/app`
  - `/en/app/capture`
  - `/en/app/library`
  - `/en/privacy`
  - `/en/terms`

## Production follow-up checklist

- Add profile write/read flows
- Add hosted auth/sync smoke proof with a real Supabase user
- Add password reset redirect configuration in Supabase Auth
- Move AI library context reads fully server-side for authenticated users
- Add analytics, error monitoring, and billing provider integration
