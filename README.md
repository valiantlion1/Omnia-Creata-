# Omnia Creata Monorepo

This repository is the canonical monorepo for the Omnia Creata ecosystem.

## Top-level layout

```text
apps/        Product and internal app roots
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

## Portfolio roles

- `apps/studio` - active primary product
- `apps/internal/control-center` - future internal operating system app
- `apps/organizer` - incubation / secondary review
- `apps/prompt-vault` - incubation / secondary review
- `apps/omniapixels` - incubation / secondary review
- `apps/omnia-watch` - incubation / secondary review
- `apps/companion` - planned / hold

## Repo operations

- `npm run repo:inventory` prints the current manifest-backed inventory.
- `npm run repo:check` validates current topology, naming, and nested repo rules.

## Canonical rules

- `apps/` contains only product roots and internal app roots.
- `website/` stays top-level and hosts web properties such as `omniacreata-com`.
- Product roots use surface-oriented folders such as `web`, `backend`, `mobile`, `desktop`, `packages`, `docs`, and `ops`.
- Root `packages/` is the long-term home for code that is genuinely shared across multiple products; product-local shared code may exist temporarily, but duplicated package families should not keep multiplying forever.
- Do not promote product-local UI, contracts, validation, or design systems to root `packages/` until at least two active products need the same stable surface.
- Product plans must align with root repo governance; product docs do not override taxonomy or migration rules.
- In-place products such as Studio and OmniaPixels are cleaned incrementally rather than rewritten by default.
- Heavy exports, local caches, and machine output are not canonical source.
- Product-local docs carry product truth; root docs carry taxonomy, portfolio, and repo governance.

## Long-term modularity note

The top-level tree is directionally strong, but the repository is not yet "infinite growth ready."

Current structural gap:
- root `packages/` is still mostly empty while several products carry their own `config`, `types`, `validation`, `i18n`, `contracts`, or `ui` families

Current migration rule:
- first consolidate truth and remove clutter
- then promote only proven cross-product code into root `packages/`
- avoid premature extraction that would turn root `packages/` into another junk drawer

## Current validator scope

Today `npm run repo:check` enforces structure and naming, but it does not yet fail on every generated artifact inside canonical roots. Expanding validator coverage for folders such as `.next`, `out`, `build`, and `dist` remains a follow-up cleanup task.
