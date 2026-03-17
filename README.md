# Omnia Creata Monorepo

This repository is the canonical monorepo for the Omnia Creata ecosystem.

## Top-level layout

```text
apps/        Active core products
website/     Public and ecosystem web properties
packages/    Cross-product shared code and contracts
design/      Brand, Figma, and creative exports
docs/        Living repository documentation
research/    Experiments and technical investigations
prototypes/  Incubating concepts and scratch projects
archive/     Historical material kept in-repo
temp/        Local quarantine and staging (gitignored)
backups/     Local backups (gitignored)
```

## Core products

- `apps/studio`
- `apps/omniapixels`
- `apps/organizer`
- `apps/companion`
- `apps/omnia-watch`
- `apps/prompt-vault`
- `apps/internal/control-center`

## Repo operations

- `npm run repo:inventory` prints the current manifest-backed inventory.
- `npm run repo:check` validates current topology, naming, and nested repo rules.

## Canonical rules

- `apps/` contains only active core products.
- `website/` stays top-level and hosts web properties such as `omniacreata-com`.
- Product roots use surface-oriented folders such as `web`, `backend`, `mobile`, `desktop`, `packages`, `docs`, and `ops`.
- Product plans must align with root repo governance; product docs do not override taxonomy or migration rules.
- In-place products such as Studio and OmniaPixels are cleaned incrementally rather than rewritten by default.
- Heavy exports, local caches, and machine output are not canonical source.

## Current validator scope

Today `npm run repo:check` enforces structure and naming, but it does not yet fail on every generated artifact inside canonical roots. Expanding validator coverage for folders such as `.next`, `out`, `build`, and `dist` remains a follow-up cleanup task.
