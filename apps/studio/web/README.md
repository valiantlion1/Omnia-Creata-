# OmniaCreata Frontend

This is the React + TypeScript + Vite frontend for OmniaCreata.

## Current focus

Studio frontend now centers around two product surfaces:
- `Create`
- `Chat`

The frontend is no longer a local ComfyUI shell.

It is the React/Vite surface for:
- auth and onboarding
- create/generation flows
- flagship premium chat
- library, share, profile, and billing surfaces
- version/build visibility and operator-safe UX glue

## Getting Started
1. Install dependencies
   npm install

2. Development
   npm run dev

   Canonical local frontend host is `http://127.0.0.1:5173`.
   `npm run preview` is also pinned to the same host and port so Studio does not keep drifting onto extra local frontend hosts such as `4173`.

3. Browser proof fallback
   When MCP browser transport is unavailable, use the local Playwright CLI fallback:

   `npm run proof:route -- --route /subscription --viewport desktop`

   Or for a narrow pass:

   `npm run proof:route -- --route /subscription --viewport mobile`

   Bundle verification is also supported:

   `npm run proof:route -- --bundle guest-core --viewport desktop`

   `npm run proof:route -- --bundle auth-core --viewport mobile --auth demo --plan free`

   `npm run proof:route -- --bundle auth-full --viewport desktop --label full-proof`

   Proof output lands in `apps/studio/web/output/playwright/studio-proof/` as:
   - route screenshots
   - per-route JSON summaries
   - one manifest JSON per proof run

   Local signed-in proof uses a dev-only browser bridge that reuses Studio's real demo-login flow. It is only exposed on local hosts such as `127.0.0.1` / `localhost` and is not part of the production app contract.

4. Environment
- Create a `.env` file in this folder based on `.env.example`
- Main local values:
  - `VITE_API_BASE_URL=http://127.0.0.1:8000`
  - `VITE_AUTH_REDIRECT_BASE_URL=http://127.0.0.1:5173`
- For protected local staging with the Docker deployment pack, the frontend can use:
  - `VITE_API_BASE_URL=/api`
- For the canonical public stack (`Vercel + Render + Supabase + Redis + Paddle`), set:
  - `VITE_API_BASE_URL=https://your-render-api-host`
  - `VITE_AUTH_REDIRECT_BASE_URL=https://your-vercel-frontend-host`

## Notes
- The frontend should treat backend metadata as source of truth for auth, billing, ownership, runtime, and chat execution context.
- TailwindCSS and PostCSS are configured; you can adjust theme variables in `styles/theme.css`.
- Deployment guidance now lives in [deploy/README.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/deploy/README.md).
