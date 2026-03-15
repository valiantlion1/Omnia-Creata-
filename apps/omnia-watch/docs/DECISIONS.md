# Decisions

## 2026-03-14

### Chose monorepo structure

Reason:
- shared domain contracts are critical between SaaS and companion
- design tokens and i18n should not diverge early

### Chose Next.js + React + Tailwind for the web layer

Reason:
- strong SaaS fit
- App Router supports a clean split between marketing and authenticated surfaces
- good long-term DX for a brand-level product

### Chose Supabase for backend direction

Reason:
- auth, Postgres, and RLS fit this product well
- keeps the initial platform credible without cloud sprawl

### Chose Electron for the Windows companion

Reason:
- practical desktop UX and installable packaging direction
- main/preload/renderer split maps well to agent responsibilities

### Chose honest demo mode instead of fake live claims

Reason:
- the repository should remain runnable before credentials are provided
- pretending persistence is live would undermine the product's trust model

### Chose progressive live activation for the backend

Reason:
- public Supabase credentials are enough for real auth and dashboard reads
- device pairing and sync need stronger server-side credentials and a separate hashing secret
- this split keeps the SaaS usable early without exposing unsafe device write flows

### Chose English-first with Turkish included immediately

Reason:
- matches product launch requirements
- prevents later retrofitting of locale-aware routing and copy organization

## 2026-03-15

### Chose watch.omniacreata.com as the Omnia Watch product portal

Reason:
- keeps Omnia Watch aligned with the Omnia Creata ecosystem instead of looking like a disconnected app
- leaves omniacreata.com free to remain the parent brand site

### Chose account.omniacreata.com as the future shared identity surface

Reason:
- a single Omnia Creata account should span multiple products
- Omnia Watch should integrate with that identity hub instead of growing into its own silo

### Chose shared Supabase auth with Google, password, and magic-link support

Reason:
- multiple sign-in methods are expected in a serious public product
- Supabase already fits the existing schema, RLS, and watch-side auth work
- moving Watch to Firebase auth today would create rewrite cost without product upside

### Chose Firebase App Hosting as the preferred web hosting target

Reason:
- it supports Next.js and fits the cost-first direction
- it allows using Google-side deployment infrastructure without making Firebase the source of truth for auth or data
- Cloud Run remains a practical fallback if App Hosting limits become painful
