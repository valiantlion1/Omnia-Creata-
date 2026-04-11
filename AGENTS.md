# AGENTS.md - Omnia Creata Monorepo

## Mission
- This repository is the canonical source for the Omnia Creata ecosystem.
- Treat every change as product work, not as a throwaway demo edit.
- Optimize for correctness, maintainability, product identity, and honest verification over speed theater.

## Instruction layering
- This file defines repo-wide defaults.
- If a subdirectory contains a closer `AGENTS.md` or `AGENTS.override.md`, the more specific file wins.
- Product-level rules may tighten local behavior, but they must not silently override root repo taxonomy or governance.

## Repo map
- `apps/` active products and internal tools
- `website/` public and ecosystem web properties
- `packages/` shared code and contracts
- `design/` brand, Figma, and creative exports
- `docs/` living documentation and operating notes
- `research/` experiments and investigations
- `prototypes/` incubating concepts
- `archive/` historical material
- `temp/` and `backups/` are not canonical source

## Non-negotiable defaults
- Start by reading root context first: `README.md`, `PROJECT_MAP.md`, and the nearest product docs before editing.
- Keep changes scoped. Do not drift into unrelated cleanup, renames, or cross-product rewrites unless the user explicitly asks for them.
- Prefer incremental improvements over speculative rewrites, especially inside existing products.
- Do not move products across top-level roots or reshape repo taxonomy without explicit approval.
- Keep generated artifacts, logs, caches, exports, and machine-local output out of canonical tracked source unless the task explicitly requires them.
- Never assume one product's conventions apply to another; check the local package, README, and nearest `AGENTS.md`.

## Planning and execution
- For complex, ambiguous, or high-risk work, plan first and surface assumptions before broad edits.
- Restate the goal in repo terms, identify the touched surface, and define what "done" means before implementation.
- When work spans multiple apps or layers, keep the main path narrow and sequence changes so verification stays understandable.
- If the same mistake or friction appears twice, capture the fix in `AGENTS.md` or a referenced operations doc instead of relying on memory.

## Verification discipline
- Root topology or repo-governance changes must run `npm run repo:check`.
- Use `npm run repo:inventory` when repo structure or manifest-backed inventory is relevant.
- For product changes, run the nearest relevant test, lint, type-check, and build commands from the touched product instead of guessing a root-wide command.
- Do not mark work complete until the relevant checks are run, or the blocker is stated explicitly.
- For UI, auth, billing, deployment, storage, or destructive-action changes, include a behavior verification step, not just compilation.

## Review standard
- Review every meaningful diff for correctness, regressions, risky assumptions, and missing verification.
- Use `docs/operations/CODE_REVIEW.md` as the default review contract.
- Findings come before summaries.

## Done criteria
- The requested behavior is implemented.
- Relevant verification is complete and reported honestly.
- Product-local bookkeeping and docs are updated when required.
- The change respects both repo-wide rules and any closer product-specific instructions.
