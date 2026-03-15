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
- Local caches, nested repos, generated output, and machine artifacts belong in `temp/` or `archive/_cold-storage/`, not inside canonical product roots.

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
