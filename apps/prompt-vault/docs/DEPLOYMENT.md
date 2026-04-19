# Deployment

## Target shape

- Marketing site:
  `omniacreata.com`
- Product app:
  `app.omniacreata.com` or `vault.omniacreata.com`

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
6. Map `omniacreata.com` and the chosen app subdomain.
7. Replace preview-only local writes with live Supabase CRUD operations.

## Production follow-up checklist

- Gate `/app` routes by authenticated session in Supabase mode
- Add profile write/read flows
- Replace preview dataset bootstrap with live per-user vault queries
- Add password reset redirect configuration in Supabase Auth
- Move AI library context reads fully server-side for authenticated users
- Add analytics, error monitoring, and billing provider integration
