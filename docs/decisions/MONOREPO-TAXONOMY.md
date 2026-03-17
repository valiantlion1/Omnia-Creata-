# Monorepo Taxonomy Decisions

## Accepted decisions

1. `apps/` is reserved for active core products only.
2. `website/` remains a separate top-level umbrella for web properties.
3. Canonical directory names use ASCII kebab-case.
4. `studio`, `omniapixels`, and `organizer` remain in-place products and are cleaned incrementally rather than rebuilt from scratch by default.
5. Product plans cannot override root repo governance; product-level blueprints must inherit root taxonomy.
6. Cross-product code converges toward root `packages/` over time, while temporary product-local packages may remain during migration.
7. Heavy exports and local machine output should leave canonical source areas over time, but validator enforcement is still being expanded.

## Current migration posture

- `omnia-watch` and `prompt-vault` use flattened product roots.
- `organizer`, `studio`, and `omniapixels` no longer hide their primary code under an extra `app/` layer.
- `organizer` currently advances from its Kotlin Android base; a Flutter rewrite is not the active plan.
- `omniapixels` is moving toward a local-first Flutter MVP, but existing backend, packages, ops, and tests remain valid migration surfaces until explicitly replaced.
- `prompt-vault` is close to launch, but preview/free hosting assumptions are not the same as commercial launch assumptions.
- `repo:check` currently validates topology and naming more strongly than generated artifact cleanup.
