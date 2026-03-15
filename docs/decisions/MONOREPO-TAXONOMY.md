# Monorepo Taxonomy Decisions

## Accepted decisions

1. `apps/` is reserved for active core products only.
2. `website/` remains a separate top-level umbrella for web properties.
3. Canonical directory names use ASCII kebab-case.
4. `OmniaPixels` and `Studio` remain in-place products and are cleaned incrementally rather than rebuilt from scratch.
5. Heavy exports and local machine output move out of canonical source areas.
6. Cross-product code will converge into root `packages/` over time rather than remaining permanently fragmented inside product-local mini-monorepos.

## Current migration posture

- `omnia-watch` and `prompt-vault` now use flattened product roots.
- `organizer`, `studio`, and `omniapixels` no longer hide their primary code under an extra `app/` layer.
- Historical docs, review packs, and system reports have been moved out of `docs/` into `archive/`.
