# OmniaCreata Studio Wiki

This wiki is the repo-native memory for Studio.

Use it to answer five questions fast:

1. What is Studio supposed to be?
2. What has already been stabilized?
3. What is being built right now?
4. What standards are non-negotiable?
5. How should future work be planned and judged?

## Start Here

- [AI Context Pack](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/00_AI_CONTEXT_PACK.md)
- [Product North Star](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/01_PRODUCT_NORTH_STAR.md)
- [System Architecture](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/02_SYSTEM_ARCHITECTURE.md)
- [Delivery Status](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/03_DELIVERY_STATUS.md)
- [Engineering Standards](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/04_ENGINEERING_STANDARDS.md)
- [Operations And Releases](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/05_OPERATIONS_AND_RELEASES.md)
- [Roadmap And Planning](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/06_ROADMAP_AND_PLANNING.md)
- [End-To-End Review 2026-04-07](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/07_END_TO_END_REVIEW_2026_04_07.md)

## Canonical Use

This wiki is the planning and orientation layer.

Use it for:
- product intent
- architecture boundaries
- sprint context
- engineering rules
- launch discipline
- AI/IDE context compression

Do not use it as the only source for operational truth.

Operational truth still lives in:
- [Version Manifest](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/version.json)
- [Release Ledger](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md)
- [Maintenance Map](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md)
- [Agent Rules](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/AGENTS.md)

## Current Snapshot

- Studio is a premium creative product with two distinct surfaces: `Create` and `Chat`.
- Sprint 1 through Sprint 7 are complete.
- The broad end-to-end review is complete.
- Sprint 8 and Sprint 9 now belong to the historical sprint chain.
- The active hardening track is `Protected Beta Hardening`.
- Current priorities are:
  - freeze signed-in/backend contracts
  - keep local verify, provider smoke, and staging verify on the same build
  - prove one protected-beta chat lane and one protected-beta image lane
  - close staging truth without drifting into new feature work
- protected-beta provider policy is intentionally temporary; use owner health detail `ai_control_plane` as the hidden operator map until public-paid provider strategy is chosen
- Build discipline, release bookkeeping, auth hardening, runtime durability, routing, billing, security, and persistence foundations already exist.

## AI And IDE Use

If another AI model or coding IDE assistant needs fast Studio context:
- start with [AI Context Pack](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/00_AI_CONTEXT_PACK.md)
- then read only the nearest wiki pages for the task
- then inspect the exact touched files

This is the intended low-token orientation path.

## Existing Reference Docs

These older documents still matter and should be linked, not forgotten:
- [PRODUCT.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/PRODUCT.md)
- [STUDIO_EXECUTION_PLAN.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/STUDIO_EXECUTION_PLAN.md)
- [STUDIO_REMAINING_WORK.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/STUDIO_REMAINING_WORK.md)
- [LOCAL_OWNER_MODE.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/LOCAL_OWNER_MODE.md)

## Update Rules

When Studio changes meaningfully:
- update this wiki if the change affects product direction, architecture, standards, or planning
- update `version.json`
- update the release ledger
- update the maintenance map
- keep footer-visible build/version aligned

If a future plan contradicts this wiki, the conflict should be resolved explicitly in the wiki rather than silently drifting in code.
