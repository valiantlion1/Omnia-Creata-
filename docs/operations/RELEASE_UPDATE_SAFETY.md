# Release Update Safety

This note keeps Omnia Creata projects maintainable after launch. The goal is simple: a shipped product can be updated from source without local caches, generated output, or ad-hoc notes becoming part of the codebase.

## Source Of Truth

- Product source lives under its product root, for example `apps/studio`.
- Public websites live under `website`.
- Cross-product code only moves to `packages` after at least two active products share the same stable contract.
- Desktop Wiki material is strategy, decisions, research, and operating memory. It is not canonical application source.

## Before A Release

1. Run `npm run repo:inventory` from the repo root and confirm the product still appears in the manifest-backed map.
2. Run `npm run repo:clean:plan` and review the listed paths.
3. Run `npm run repo:clean:apply` only when the plan lists ignored local artifacts such as `.next`, `dist`, `out`, `__pycache__`, `.pytest_cache`, or `output`.
4. Run `npm run repo:check` after cleanup.
5. Run the nearest product checks, such as frontend type-check/build or backend tests, from the product directory.
6. Record product-specific proof in that product's docs or release ledger when the product requires it.

## After A Release

- Keep generated build output out of tracked source.
- Keep emergency notes and experiments in `docs`, `research`, `prototypes`, `temp`, or the Desktop Wiki according to purpose.
- Do not patch production directly without bringing the same change back to source.
- If a release hotfix touches contracts, auth, billing, storage, moderation, or provider routing, add a regression test before the next release.

## Safe Update Rule

Every future update should answer three questions before shipping:

1. What source files changed?
2. What command proves the source still builds or behaves correctly?
3. What generated/local artifacts were cleaned before handoff?
