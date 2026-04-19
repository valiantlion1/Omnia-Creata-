# External Wiki Promotion Inventory

Date: `2026-04-19`

## Scope

This document inventories the external desktop vault at:

- `C:\Users\valiantlion\Desktop\OMNIA-CREATA-WIKI\OMNIA-CREATA-WIKI`

It exists to answer one question cleanly:

- what should stay in the external vault
- what is already covered inside the monorepo
- what is worth promoting into the monorepo after verification

This is an inventory and promotion plan, not a bulk-import approval.

## Current repo truth

The current repo already defines Studio documentation layers clearly:

- `apps/studio/docs/wiki/` = canonical product meaning, strategy, architecture, planning
- `apps/studio/docs/operations/` = current build truth, release history, operator memory
- `apps/studio/docs/reference/` = historical or background context
- `apps/studio/version.json` = current build manifest

The external vault also states that the monorepo remains the canonical codebase and that the vault is for long-term wiki, research, strategy, and decisions.

## Recommendation

Do not move the external vault wholesale into the monorepo.

Use a selective promotion model instead:

1. Keep dashboards, raw source notes, templates, Obsidian config, and archive material in the external vault.
2. Keep current product truth, code-backed security notes, release/ops truth, and stable repo maps in the monorepo.
3. Promote only after verifying that the external note is still current against repo code and current docs.
4. When a note is already covered by a repo-native document, merge missing truth into the repo file instead of copying the vault page as-is.

## Classification legend

- `external-only`: keep in the external vault; do not import into canonical repo docs
- `already-covered`: repo already has the canonical surface; vault note is duplicate, historical, or weaker
- `promote-after-verify`: candidate for repo import, but only after checking code and current product doctrine
- `merge-only`: do not import as a standalone page; merge any still-valid missing parts into an existing repo file

## Inventory

| External path | Classification | Suggested repo home | Notes |
| --- | --- | --- | --- |
| `WELCOME.md` | `external-only` | n/a | Vault landing page, not canonical repo truth. |
| `00_SYSTEM/AGENTS.md` | `external-only` | n/a | Obsidian-vault operating rules, not product docs. |
| `00_SYSTEM/VAULT_RULES.md` | `external-only` | n/a | Vault maintenance rules belong to the external workspace. |
| `01_DASHBOARDS/HOME.md` | `external-only` | n/a | Dashboard surface, not durable repo truth. |
| `01_DASHBOARDS/OCS_NOW.md` | `merge-only` | `apps/studio/docs/wiki/03_DELIVERY_STATUS.md` | Snapshot-style status page; contains doctrine drift and should not be copied as canonical truth. |
| `02_SOURCES/README.md` | `external-only` | n/a | Source-note workflow belongs outside the code repo. |
| `02_SOURCES/2026-04-14_ocs_low_burn_constraints_and_launch_preferences.md` | `external-only` | n/a | Raw source note; useful evidence, but not canonical product doc. |
| `03_WIKI/README.md` | `external-only` | n/a | External vault index only. |
| `03_WIKI/BUSINESS/PRICING_MODEL.md` | `merge-only` | `apps/studio/docs/wiki/08_LAUNCH_ECONOMICS_LOCK.md` | Repo already has a newer economics lock and package truth. |
| `03_WIKI/BUSINESS/UNIT_ECONOMICS_AND_STOP_LOSS.md` | `merge-only` | `apps/studio/docs/wiki/08_LAUNCH_ECONOMICS_LOCK.md` | Keep only any rationale still missing from repo docs. |
| `03_WIKI/OCS/OCS_DESIGN_SYSTEM.md` | `promote-after-verify` | `apps/studio/docs/reference/` or merge into `apps/studio/docs/wiki/04_ENGINEERING_STANDARDS.md` | Candidate only if it still reflects current Studio art direction. |
| `03_WIKI/OCS/OCS_LAUNCH_GATES.md` | `merge-only` | `apps/studio/docs/wiki/03_DELIVERY_STATUS.md` and `apps/studio/docs/wiki/05_OPERATIONS_AND_RELEASES.md` | Likely useful as framing, but repo already owns launch-gate truth. |
| `03_WIKI/OCS/OCS_NORTH_STAR.md` | `already-covered` | `apps/studio/docs/wiki/01_PRODUCT_NORTH_STAR.md` | Same strategic role already exists in repo-native Studio wiki. |
| `03_WIKI/OCS/OCS_UI_CHANGELOG.md` | `merge-only` | `apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md` | Release/build history belongs in the release ledger, not a parallel wiki changelog. |
| `03_WIKI/PLATFORM/DEPLOYMENT_TOPOLOGY.md` | `promote-after-verify` | `apps/studio/docs/reference/DEPLOYMENT_TOPOLOGY.md` or merge into `apps/studio/docs/wiki/05_OPERATIONS_AND_RELEASES.md` | Candidate if still accurate against live hosting/runtime doctrine. |
| `03_WIKI/PLATFORM/OCOS_CONTROL_PLANE_ARCHITECTURE.md` | `promote-after-verify` | `apps/internal/control-center/docs/wiki/` | This is OCOS truth, not Studio truth; keep it out of Studio docs. |
| `03_WIKI/PLATFORM/PROVIDER_REGISTRY.md` | `merge-only` | `apps/studio/docs/reference/` plus current backend/provider docs | Current external note is stale against newer repo launch doctrine. |
| `03_WIKI/SECURITY/MONTHLY_SPEND_GUARDRAILS.md` | `merge-only` | `apps/studio/docs/wiki/08_LAUNCH_ECONOMICS_LOCK.md` | Spend guardrails now belong with the repo-native economics lock. |
| `03_WIKI/SECURITY/PAYMENT_WEBHOOK_VALIDATION.md` | `promote-after-verify` | `apps/studio/docs/reference/PAYMENT_WEBHOOK_VALIDATION.md` | Good candidate because it is code-shaped and specific. Verify against backend before import. |
| `03_WIKI/SECURITY/PROVIDER_SECRET_HANDLING.md` | `promote-after-verify` | `apps/studio/docs/reference/PROVIDER_SECRET_HANDLING.md` | Candidate if still aligned with current secret/env handling. |
| `03_WIKI/SECURITY/SECURITY_HARDENING_LOG.md` | `merge-only` | `apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md` or `STUDIO_MAINTENANCE_MAP.md` | If anything is still relevant, fold it into operator truth instead of keeping a parallel log. |
| `03_WIKI/SECURITY/SHARE_ABUSE_CONTROLS.md` | `promote-after-verify` | `apps/studio/docs/reference/SHARE_ABUSE_CONTROLS.md` | Candidate if backed by current share/public access code. |
| `03_WIKI/SECURITY/SIGNUP_ABUSE_CONTROLS.md` | `promote-after-verify` | `apps/studio/docs/reference/SIGNUP_ABUSE_CONTROLS.md` | Candidate if backed by current signup/auth policy. |
| `03_WIKI/SECURITY/THREAT_MODEL.md` | `promote-after-verify` | `apps/studio/docs/reference/THREAT_MODEL.md` | Strong repo candidate, but must be checked against current auth/billing/share doctrine first. |
| `04_DECISIONS/DECISION_LOG.md` | `promote-after-verify` | split between `docs/decisions/` and `apps/studio/docs/operations/` | Do not import as one dump; split durable repo decisions from vault-only workflow decisions. |
| `05_MAPS/MONOREPO_MAP.md` | `already-covered` | `PROJECT_MAP.md` and `docs/architecture/REPO-STRUCTURE.md` | Repo already owns the canonical topology surfaces. |
| `90_TEMPLATES/DECISION_TEMPLATE.md` | `external-only` | n/a | Workspace template, not canonical repo content. |
| `90_TEMPLATES/SOURCE_NOTE_TEMPLATE.md` | `external-only` | n/a | Workspace template, not canonical repo content. |

## Current high-confidence promotion candidates

These are the best candidates for a future narrow import wave:

1. `03_WIKI/SECURITY/THREAT_MODEL.md`
2. `03_WIKI/SECURITY/PAYMENT_WEBHOOK_VALIDATION.md`
3. `03_WIKI/SECURITY/SHARE_ABUSE_CONTROLS.md`
4. `03_WIKI/SECURITY/SIGNUP_ABUSE_CONTROLS.md`
5. `03_WIKI/PLATFORM/DEPLOYMENT_TOPOLOGY.md`
6. `03_WIKI/PLATFORM/OCOS_CONTROL_PLANE_ARCHITECTURE.md` into the OCOS docs tree, not Studio

These are good candidates because they describe durable doctrine and implementation boundaries more than they describe day-to-day dashboard state.

## Current do-not-import set

Do not import these classes into the monorepo as canonical source:

- `.obsidian/**`
- `00_SYSTEM/**`
- `01_DASHBOARDS/**`
- `02_SOURCES/**`
- `90_TEMPLATES/**`
- `99_ARCHIVE/**`

## Promotion rules

When promoting an external note into the monorepo:

1. Re-read the repo truth first.
2. Verify the note against current code and current docs.
3. Import only durable truth, not vault navigation or Obsidian-specific links.
4. Rewrite `[[wiki-links]]` into normal repo markdown links.
5. Prefer merging into an existing repo document over creating another parallel source of truth.
6. If a promoted note is product-specific, place it under the product docs tree.
7. If a promoted note is repo-wide, place it under root `docs/`.

## Next safe wave

Do not start with a broad move.

Start with one narrow import pass:

1. security doctrine pages for Studio, or
2. OCOS control-plane architecture into `apps/internal/control-center/docs/wiki/`

That keeps the import reviewable and avoids creating a second spaghetti layer inside the monorepo.
