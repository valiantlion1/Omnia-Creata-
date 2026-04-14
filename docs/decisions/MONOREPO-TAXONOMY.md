# Monorepo Taxonomy Decisions

## Accepted decisions

1. `apps/` is reserved for product roots and internal app roots, not arbitrary support folders.
2. `website/` remains a separate top-level umbrella for web properties.
3. Canonical directory names use ASCII kebab-case.
4. `studio`, `omniapixels`, and `organizer` remain in-place products and are cleaned incrementally rather than rebuilt from scratch by default.
5. Product plans cannot override root repo governance; product-level blueprints must inherit root taxonomy.
6. Cross-product code converges toward root `packages/` over time, while temporary product-local packages may remain during migration.
7. Heavy exports and local machine output should leave canonical source areas over time, but validator enforcement is still being expanded.
8. Product-local docs are canonical for product truth; root docs are canonical for portfolio, taxonomy, and repo governance.
9. The current active primary path is `apps/studio`; other product roots may remain in `apps/` while being classified as incubation, future internal, or planned/hold.
10. Root `packages/` is reserved for proven cross-product surfaces, not speculative abstraction.
11. Repeated product-local package families such as `config`, `types`, `validation`, `i18n`, or `contracts` must be periodically reviewed for promotion, consolidation, or explicit product-local retention.
12. New catch-all names such as `shared` should be avoided unless the ownership boundary is documented and temporary.

## Current migration posture

- `studio` is the active primary product and the first hard-gated 5-star cleanup target.
- `control-center` is a future internal app, not the current active repo wave.
- `omnia-watch` and `prompt-vault` use flattened product roots.
- `organizer`, `studio`, and `omniapixels` no longer hide their primary code under an extra `app/` layer.
- `organizer` currently advances from its Kotlin Android base; a Flutter rewrite is not the active plan.
- `omniapixels` is moving toward a local-first Flutter MVP, but existing backend, packages, ops, and tests remain valid migration surfaces until explicitly replaced.
- `prompt-vault` remains a secondary review path until docs and publish hygiene are cleaned up.
- `repo:check` currently validates topology and naming more strongly than generated artifact cleanup.
- Root modularity is not yet complete: `packages/` is still mostly reserved capacity while some products carry duplicated package families locally.
- The next structural refactor wave should extract only proven cross-product config/contracts/tooling, while keeping product-specific UI, design tokens, and feature contracts local.
