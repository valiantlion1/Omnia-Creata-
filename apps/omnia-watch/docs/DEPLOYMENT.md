# Deployment

## Target platform direction

- Web app: Firebase App Hosting
- Web fallback: Cloud Run
- Backend: Supabase
- Windows companion: packaged Electron build pipeline

## Web app

Set the following environment variables:

- `NEXT_PUBLIC_SITE_URL`
- `NEXT_PUBLIC_ACCOUNT_URL`
- `NEXT_PUBLIC_MARKETING_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DEVICE_CREDENTIAL_SECRET`

Auth requirements:

- enable Google OAuth in Supabase
- enable email/password in Supabase
- enable magic-link email auth in Supabase
- set `NEXT_PUBLIC_SITE_URL` to `https://watch.omniacreata.com`
- set `NEXT_PUBLIC_ACCOUNT_URL` to `https://account.omniacreata.com`
- add `https://watch.omniacreata.com/auth/callback` as an allowed redirect URL
- configure the future account repo to use the same Supabase project and its own callback path

Firebase App Hosting notes:

- `apps/web/apphosting.yaml` is the committed baseline for the watch portal
- keep sensitive values in Firebase App Hosting secrets rather than the YAML file
- start with small `runConfig` values and low traffic assumptions
- if App Hosting behavior or cost becomes a problem, move the same Next.js app to Cloud Run without changing the backend contract

## Agent

Set:

- `AGENT_SYNC_API_BASE_URL`
- `AGENT_APPDATA_SUBDIR`

## Production checklist

- apply Supabase migrations
- verify `/api/health` reports `connected` or full device-pipeline readiness, not only demo mode
- configure Google OAuth, password auth, magic-link email templates, and callback URLs in Supabase
- set Firebase App Hosting secrets for Supabase and device-pipeline values
- map `watch.omniacreata.com` to the watch portal deployment
- map `account.omniacreata.com` to the separate shared identity repo once that repo exists
- ensure the service-role key is present before releasing desktop pairing
- validate row-level security with real accounts
- package and sign the Windows companion
- publish download metadata on the web app

## Cost posture

- development and private test can start on Supabase Free
- first public beta should move to a single shared Supabase Pro project rather than multiple production projects
- Firebase App Hosting must run on Blaze, so configure budget alerts and treat any Google-side credits as a bonus, not a guarantee

Reference links:

- Supabase billing: https://supabase.com/docs/guides/platform/billing-on-supabase
- Supabase billing FAQ: https://supabase.com/docs/guides/platform/billing-faq
- Supabase compute and disk: https://supabase.com/docs/guides/platform/compute-and-disk
- Firebase App Hosting costs: https://firebase.google.com/docs/app-hosting/costs
- Firebase pricing: https://firebase.google.com/pricing
- Firebase App Hosting for Next.js: https://firebase.google.com/docs/app-hosting
- Firebase Auth overview: https://firebase.google.com/docs/auth/
- Google Developer Program benefits: https://developers.google.com/program/my-benefits
- Google Developer Program plans: https://developers.google.com/program/plans-and-pricing
