# PWA

## Implemented

- Web app manifest at [`apps/web/src/app/manifest.ts`](/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/app/manifest.ts)
- Generated app icons at [`apps/web/src/app/icon.tsx`](/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/app/icon.tsx) and [`apps/web/src/app/apple-icon.tsx`](/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/app/apple-icon.tsx)
- Service worker registration at [`apps/web/src/components/shared/service-worker-register.tsx`](/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/components/shared/service-worker-register.tsx)
- Shell caching service worker at [`apps/web/public/sw.js`](/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/public/sw.js)
- Responsive desktop + mobile navigation
- Installable standalone launch behavior

## Offline behavior

What works now:

- Shell routes can be cached
- Preview dataset persists locally in the browser
- The app remains usable for browsing cached preview content

What is not claimed yet:

- Full bidirectional offline sync with Supabase
- Background conflict reconciliation
- Guaranteed offline writes for authenticated cloud-backed accounts

## Wrapper readiness checklist

Current UI/UX readiness for Capacitor or similar Android packaging:

- Manifest colors aligned with the current app theme (`theme_color`, `background_color`); final palette may change during redesign
- Maskable icon route available for launcher compatibility
- `viewport-fit=cover` enabled for standalone safe-area handling
- Mobile bottom navigation and quick drawers respect safe-area insets
- Core taps normalized to ~44px minimum targets across primary actions
- Locale-aware offline fallback (`/en/app` and `/tr/app`) in service worker navigation handling

Still to validate during native wrapper packaging:

- Android status bar style per wrapper config
- Splash screen timing and branding per wrapper config
- Native back-button behavior in deep app routes
- Store package QA across real devices and OS versions

## Why this matters

Prompt Vault is intended to feel app-like on:

- desktop browser
- mobile browser
- installed PWA
- future Android wrapper packaging

This repository intentionally lays that groundwork without pretending the hard sync problems are already complete.
