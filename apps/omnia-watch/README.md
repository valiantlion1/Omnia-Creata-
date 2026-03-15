# Omnia Watch

Omnia Watch is the Omnia Creata system care, monitoring, update intelligence, and device companion product.

## Product layout

```text
web/         Next.js product portal and dashboard
desktop/     Electron-based Windows companion
packages/    Product-local shared packages
supabase/    Database and RLS foundations
docs/        Product documentation
ops/         Product scripts and operational helpers
```

## Commands

```bash
npm install
npm run dev:web
npm run dev:desktop
npm run build
```

## Notes

- The browser product targets `watch.omniacreata.com`.
- The local companion is intentionally separated under `desktop/`.
- Cross-product code should only move to root `packages/` once it becomes ecosystem-wide.
