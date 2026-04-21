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

## UI Excellence
- For UI-heavy work, do not jump straight into components. Read `docs/operations/codex/UI_EXCELLENCE_WORKFLOW.md` and the nearest product UI docs first.
- Automatically use the strongest matching UI skill stack. In this repo that usually means `frontend-skill`, `omnia-ui-guardrails`, `omnia-art-direction-lock`, `omnia-visual-composition-judge`, `omnia-microcopy-minimizer`, and `omnia-playwright-ui-verify`.
- Before editing UI, define the screen job, gather current references, and list anti-goals. Do not improvise art direction from nothing when live references can be inspected.
- Public and marketing surfaces must never ship internal, developer-facing, roadmap, TODO, or MVP-style copy.
- For meaningful UI changes, browser proof is mandatory on desktop and narrow/mobile viewports. If the route is important or interactive, include at least a basic accessibility sanity pass in addition to screenshots.

## User communication
- When explaining work to the user, prefer plain language first and explain it like you would to an interested non-engineer, not only to another engineer.
- Start with what changed, why it matters, and what it means in real use before diving into file names, abstractions, or implementation jargon.
- If technical terms are necessary, briefly translate them into everyday language in the same answer instead of assuming the user already knows them.

## UI and design defaults
- Treat every user-facing Omnia screen as a polished live product surface, not as a dev sandbox or implementation explainer.
- Never expose developer notes, backend mechanics, session bookkeeping, fake KPI cards, or operator-only summaries in normal product UI unless the route is explicitly operator-facing.
- On design work, prefer fewer regions, stronger visual hierarchy, real content, better motion, and clearer actions over adding explanatory chrome, filler cards, or generic AI-dashboard patterns.
- If a surface feels empty, solve it with composition, previews, crop, typography, spacing, and motion before adding more boxes or more text.
- Do not add cards by default. Every container must earn its place by holding real content, real controls, or a meaningful state. Empty space is not a reason to invent a panel.
- Keep controls close to the content they affect. Do not separate the main action from the main visual result with dashboard furniture.
- Use motion only for orientation, feedback, and state change. Prefer transform/opacity-based motion, keep it restrained, and always respect reduced-motion behavior.
- If the art direction or interaction treatment is uncertain, research current high-quality references first instead of improvising a generic AI layout.

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
