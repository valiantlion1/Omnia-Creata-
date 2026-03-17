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

- `apps/` contains only active core products.
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

## Validator scope today

`npm run repo:check` currently validates:

- required top-level and product paths from `omnia.repo.json`
- ASCII kebab-case naming for canonical app and website roots
- allowed `docs/` root directories
- nested `.git` and nested `apps` violations

`npm run repo:check` does not yet fail on every generated folder such as `.next`, `out`, `build`, or `dist`. Manual cleanup and future validator expansion are still required.
