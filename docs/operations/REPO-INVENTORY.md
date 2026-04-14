# Repo Inventory and 5-Star Audit

## Current decision architecture

| Surface | Path | Role | Current audit posture |
| --- | --- | --- | --- |
| Studio / OCS | `apps/studio` | Active primary product | Hard 5-star cleanup target |
| Control Center / OCOS | `apps/internal/control-center` | Future internal app | Keep truth aligned, but do not open active implementation wave |
| Organizer | `apps/organizer` | Incubation / secondary review | Needs docs consolidation |
| Prompt Vault | `apps/prompt-vault` | Incubation / secondary review | Needs docs consolidation and publish cleanup |
| OmniaPixels | `apps/omniapixels` | Incubation / secondary review | Clean enough to keep, but not an active wave |
| Omnia Watch | `apps/omnia-watch` | Incubation / secondary review | Clean enough to keep, but not an active wave |
| Companion | `apps/companion` | Planned / hold | Planning-only |

## 5-star rubric

| Score | Meaning |
| --- | --- |
| 1 | dangerous, misleading, or not publish-ready |
| 2 | stale, noisy, or high-risk |
| 3 | works but needs cleanup before scaling |
| 4 | strong with a few meaningful gaps |
| 5 | launch-grade, trustworthy, low-friction |

Audit categories:
- product clarity
- portfolio clarity
- docs truth
- repo hygiene
- architecture and modularity
- security and secrets posture
- ops and verification
- GitHub publish readiness

Hard gates before active feature churn resumes:
- root portfolio clarity = 5
- root docs truth = 5
- root repo hygiene = 5
- Studio product clarity = 5
- Studio docs truth = 5
- Studio repo hygiene = 5
- Studio ops and verification = 5
- security and secrets posture for active surfaces = 5

## Current scores

### Root repo

| Category | Score | Why |
| --- | --- | --- |
| Portfolio clarity | 5 | Root truth now explicitly says Studio is primary and OCOS is future internal work. |
| Docs truth | 5 | Root canonical docs are aligned around taxonomy, portfolio, and governance instead of mixed product stories. |
| Repo hygiene | 5 | Root `docs/` no longer carries stray prompt/html files that broke validator truth. |
| Architecture and modularity | 3 | Top-level taxonomy is strong, but root `packages/` is still mostly empty while product-local package families keep duplicating. |
| GitHub publish readiness | 4 | Root view is cleaner, but secondary-product artifact cleanup still remains. |

### Studio active path

| Category | Score | Why |
| --- | --- | --- |
| Product clarity | 5 | Studio README/wiki already carries one active frame: `Controlled Public Paid Launch`. |
| Docs truth | 5 | Studio canonical pack and operations memory point to one current truth set. |
| Repo hygiene | 4 | Active source is clean enough, but hard launch blockers and current-build proof still depend on external operator artefacts. |
| Ops and verification | 4 | Verify loops are strong, but protected staging closure still depends on a real owner-token run. |
| Security and secrets posture | 4 | Placeholder handling is better, but repo-wide strict-source-only cleanup is not yet complete outside Studio. |

### Secondary triage

| Product | Score | Status | Notes |
| --- | --- | --- | --- |
| Organizer | 3 | needs docs consolidation | Canonical entry is clearer and export/capture clutter was reduced, but `NEW PLANS` and `master-plan` still need consolidation. |
| Prompt Vault | 3 | needs docs consolidation | Canonical docs are now easier to enter and zip bundles are gone, but blueprint/handoff duplication still needs trimming. |
| OmniaPixels | 3 | clean enough incubation | Product root is normalized, but not currently worth a deep cleanup wave. |
| Omnia Watch | 3 | clean enough incubation | Product root is structurally fine; can wait behind primary work. |
| Companion | 4 | hold / planning-only | Planning-only product is already clearly marked as not yet implemented. |
| Control Center / OCOS | 4 | future internal app | Product-local docs are strong; root truth needed alignment more than the app itself. |

## Strict source-only artifact list

These are the tracked non-canonical or cleanup-priority artifacts that still matter after root cleanup:

### Removed from root in this wave
- `docs/claude-code-frontend-prompt.md`
- `docs/prompts-kolay-kopyala.html`

### Moved out of root canonical view in the modularity wave
- `OmniaOrganizer.zip` -> `archive/imports/OmniaOrganizer.zip`
- `landing-snapshot.md` -> `audit/landing-snapshot.md`
- `Studio-Code-Review-Report.md` -> `audit/Studio-Code-Review-Report.md`

### Removed during secondary-product cleanup
- `apps/organizer/docs/NEW PLANS/OmniaOrganizer_Codex_Paketi.zip`
- `apps/organizer/docs/master-plan/OmniaOrganizer_FullPlan.txt`
- `apps/organizer/docs/master-plan/OrganizerMasterPlan/Final/OmniaMasterPlan_FINAL_*` exported `.txt`, `.json`, `.docx`, `.html`
- `apps/organizer/docs/operations/alpha*.png`
- `apps/organizer/docs/operations/alpha*.xml`
- `apps/prompt-vault/docs/Prompt Vault plans to import another platforms for me.zip`
- `apps/prompt-vault/docs/stitch-handoff-complete.zip`
- `apps/prompt-vault/docs/ui-ux-dev-pack.zip`

### Still queued for secondary-product cleanup
- `apps/organizer/docs/master-plan/OrganizerMasterPlan/Sources/*.docx`
- `apps/organizer/docs/NEW PLANS/*` markdown planning pack duplication
- `apps/prompt-vault/docs/BLUEPRINT.md`
- `apps/prompt-vault/docs/FIGMA-HANDOFF.md`
- `apps/prompt-vault/docs/STITCH-HANDOFF-COMPLETE.md`
- `apps/prompt-vault/docs/UI-UX-DESIGN-TASKS.md`
- `apps/prompt-vault/docs/UI-UX-DEV-PLAN.md`

These are not blockers for repo topology anymore, but they do block a true 5-star GitHub publish posture.

## Shared extraction watchlist

These package families currently show the strongest root-modularity pressure:

- `config`
  - `apps/prompt-vault/packages/config`
  - `apps/omnia-watch/packages/config`
- `types`
  - `apps/prompt-vault/packages/types`
  - `apps/omnia-watch/packages/types`
- `validation`
  - `apps/prompt-vault/packages/validation`
  - `apps/omnia-watch/packages/validation`
- `contracts`
  - `apps/internal/control-center/packages/contracts`
  - `apps/omnia-watch/packages/api-contracts`

Current rule:
- extract only proven cross-product surfaces
- keep product-specific UI, tokens, i18n catalogs, and app contracts local
- do not create new vague `shared` buckets

## Cleanup sequence

1. Root truth and validator
   - keep `README`, `PROJECT_MAP`, `ECOSYSTEM`, taxonomy docs, and manifest aligned
   - keep `npm run repo:check` green
2. Studio active path
   - close remaining 4-star gaps in repo hygiene, ops truth, and security posture
3. Organizer docs consolidation
   - merge useful planning into canonical docs
   - remove or archive export bundles, duplicate plan packs, and capture artifacts
4. Prompt Vault docs consolidation
   - absorb useful handoff content into canonical docs
   - remove zip/export artifacts from tracked canonical docs
5. Secondary-product publish pass
   - keep OmniaPixels and Omnia Watch readable
   - leave Companion as planning-only
6. Root shared-package refactor
   - promote proven shared config/tooling/contracts into root `packages/`
   - delete or rename vague product-local `shared` buckets
   - stop cloning package families per product without a promotion decision

## Validator note

`npm run repo:check` must stay green after any root docs or taxonomy edit.

`npm run repo:inventory` should be treated as the quick human/agent snapshot for current portfolio roles, not as the only documentation source.
