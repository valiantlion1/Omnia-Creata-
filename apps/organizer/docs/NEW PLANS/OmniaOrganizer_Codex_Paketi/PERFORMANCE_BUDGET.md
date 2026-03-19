# PERFORMANCE_BUDGET.md - Product Performance Targets

## Purpose
Make performance a planning input, not a rescue task.

## Target device profile
- modern mid-range Android phone
- limited thermal headroom
- mixed storage speed
- large personal file libraries possible

## Cold start targets
- cold start to interactive shell: under 1.8s on target devices
- warm start to interactive shell: under 800ms

## Browse targets
- open normal folder view: under 300ms when cached
- open heavy folder view: under 700ms without blocking the whole UI
- scroll must stay visually stable under large lists

## Search targets
- first visible results for indexed query: under 200ms
- filter application: under 250ms
- no frozen UI while search updates

## Storage targets
- summary view load: under 800ms when data is cached
- large-file entry view: under 1s on indexed data

## Thumbnail targets
- list/grid should never block on full-size media decode
- use thumbnail caching and lazy loading
- keep scrolling responsive even when thumbnails are still loading

## Background work budgets
- do not run aggressive indexing on every launch
- keep recurring work low frequency and battery-aware
- pause or reduce work under low battery or thermal pressure where possible

## Memory guidance
- avoid keeping large decoded images in memory
- thumbnail cache should be bounded and evictable
- list screens should prefer paging/chunking over loading everything into one
  heavy in-memory structure

## Quality guardrails
- performance regressions are release blockers on core flows
- a feature that works only on tiny demo datasets is not accepted
- large-library behavior must be tested intentionally
