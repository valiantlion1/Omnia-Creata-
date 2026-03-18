# Organizer Product Notes

OmniaOrganizer remains a core product in the ecosystem.

## Product direction (canonical)

OmniaOrganizer is now explicitly **mobile-only** in near/mid-term planning:

- Primary targets: **Android + iOS phone apps**
- Product identity: **AI-assisted smart file manager on mobile**
- Non-goal for current planning: desktop/web-first repositioning

## Canonical implementation surfaces

- `mobile/android` (active source code)
- `mobile/ios` (planned surface; to be opened without changing monorepo topology)

## Canonical documentation surfaces

- `docs/BLUEPRINT.md` (source-of-truth direction + scope)
- `docs/PLAN_AUDIT_AND_V1_SCOPE.md` (zip-vs-repo audit + actionable build order)
- `docs/master-plan/` (historical/reference planning material)

## Monorepo guardrails

- Keep current root `apps/organizer` unchanged.
- Expand under `apps/organizer/mobile/*` only (`android` active, `ios` planned).
- Shared contracts can be introduced later under `apps/organizer/packages/*` if needed, without moving product root.
