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

- `npm run repo:inventory`
- `npm run repo:check`

## Canonical rules

- `apps/` contains only active core products.
- `website/` stays top-level and hosts web properties such as `omniacreata-com`.
- Product roots use surface-oriented folders such as `web`, `backend`, `mobile`, `desktop`, `packages`, `docs`, and `ops`.
- Heavy exports, local caches, and machine output do not stay in canonical source areas.
