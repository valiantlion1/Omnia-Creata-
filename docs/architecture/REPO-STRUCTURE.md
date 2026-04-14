# Repo Structure

This repository uses a taxonomy-first monorepo layout.

## Canonical roots

```text
apps/
website/
packages/
design/
docs/
research/
prototypes/
archive/
```

## Rules

- `apps/` contains only product roots and internal app roots.
- `website/` contains web properties and stays outside `apps/`.
- `packages/` is reserved for shared cross-product code.
- `design/` stores brand assets, Figma-derived material, and export references.
- `docs/` stores living documentation only.
- `archive/` stores historical material that still belongs in-repo.
- Local caches, generated output, and machine artifacts belong in `temp/` or `archive/_cold-storage/`, not inside canonical product roots.
- Product-level plans may refine product direction, but they do not override root taxonomy or cleanup posture.

## Product root contract

Each product root should use surface-oriented folders where relevant:

- `web`
- `backend`
- `mobile`
- `desktop`
- `packages`
- `docs`
- `ops`
- `tests`

Nested `apps/*` folders are not allowed inside product roots.

## Cleanup posture

- `studio`, `omniapixels`, and `organizer` are in-place products and should be cleaned incrementally.
- Product-local packages may exist during migration, but the long-term direction remains convergence toward root `packages/`.
- Archiving is the last step after replacement is verified, not the default first step.
- `studio` is the active primary product path.
- `control-center` is a future internal app path and should not be treated as the active implementation wave by default.
- Other product roots may remain in `apps/` while being classified as incubation, secondary review, or planned/hold.

## Package promotion contract

Root `packages/` is not a dumping ground. Promotion into it must follow these rules:

- keep a package product-local while it serves only one product
- promote it only after at least two products need the same stable surface
- promote configuration before product UX
- prefer narrow packages over vague `shared` buckets
- avoid copying the same family name into every product forever

### Good root package candidates

- TypeScript and Tailwind presets
- shared build tooling
- cross-product validation primitives
- cross-product contracts that are consumed by more than one product

### Keep product-local by default

- app-specific UI kits
- app-specific design tokens
- app-specific i18n catalogs
- app-specific API contracts
- app-specific feature utilities

### Current extraction targets

- repeated `config` families across Prompt Vault and Omnia Watch
- repeated `types` / `validation` families where contracts are no longer product-specific
- future root `contracts` only after OCOS, Studio, or other products truly share the same protocol surface

### Current anti-patterns

- adding a new product-local `shared` directory without defining what it actually owns
- promoting unstable product-specific code to root just because the names look similar
- letting root `packages/` stay empty while product-local duplication keeps growing unchecked

## Validator scope today

`npm run repo:check` currently validates:

- required top-level and product paths from `omnia.repo.json`
- ASCII kebab-case naming for canonical app and website roots
- allowed `docs/` root directories
- nested `.git` and nested `apps` violations

`npm run repo:check` does not yet fail on every generated folder such as `.next`, `out`, `build`, or `dist`. Manual cleanup and future validator expansion are still required.
