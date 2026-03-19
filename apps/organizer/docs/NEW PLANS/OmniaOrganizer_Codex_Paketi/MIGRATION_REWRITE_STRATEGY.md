# MIGRATION_REWRITE_STRATEGY.md - Controlled Reset Strategy

## Purpose
Define how OmniaOrganizer should move from the current Android skeleton into
the new file-centric product without a repo-wide rewrite.

## Canonical decision
Do not do a blind full rewrite.
Do a controlled reset of product assumptions while keeping the repo root and
useful Android shell pieces.

## Current reality
Product root:
- `apps/organizer`

Current Android foundation exists under:
- `apps/organizer/mobile/android`

Known drift to remove:
- task-centric flows
- capture-centric flows
- note/item/tag mental model
- placeholder screens that imply the wrong product

## Keep
- monorepo topology
- Android Gradle root
- Compose app shell foundation where still useful
- core module split as a starting point
- design token and shared UI scaffolding that remains neutral

## Rewrite
- domain model
- Room/data schema direction
- navigation destinations
- feature module meaning
- storage access layer
- file action flows
- recycle bin behavior
- storage summary behavior

## Remove or retire
- task screens
- capture-first flows
- note/task specific repositories and entities
- any misleading placeholder that advertises a non-file product

## Later, not now
- iOS parity implementation
- cloud connectors
- document suite
- OCR
- AI

## Suggested migration steps
1. Lock docs and canonical IA.
2. Freeze feature creep.
3. Reshape app shell to Phase 1 navigation.
4. Replace old domain entities with file-centric entities.
5. Introduce source capability model and safe delete model.
6. Build Browse as the strongest screen.
7. Build Search and Storage on top of the same source/index foundation.
8. Add Recycle Bin before trusting destructive flows.

## Success criteria
- repo topology stays stable
- product identity becomes clearly file-centric
- Phase 1 code no longer inherits task/note assumptions
- no unnecessary large-scale rewrite of unrelated surfaces
