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

3. Environment
- Create a `.env` file in this folder based on `.env.example`
- Main local values:
  - `VITE_API_BASE_URL=http://127.0.0.1:8000`
  - `VITE_AUTH_REDIRECT_BASE_URL=http://127.0.0.1:5173`
- For staging-style deployment, the deployment pack builds the frontend with:
  - `VITE_API_BASE_URL=/api`

## Notes
- The frontend should treat backend metadata as source of truth for auth, billing, ownership, runtime, and chat execution context.
- TailwindCSS and PostCSS are configured; you can adjust theme variables in `styles/theme.css`.
- Deployment guidance now lives in [deploy/README.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/deploy/README.md).
