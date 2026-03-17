# Repo Inventory and Reclassification

## Root classification

| Old path | Category | New canonical location |
| --- | --- | --- |
| `apps/Omnia Watch` | Core app | `apps/omnia-watch` |
| `apps/Prompt Vault` | Core app | `apps/prompt-vault` |
| `apps/pixels` | Core app | `apps/omniapixels` |
| `website/omniacreata.com` | Web property | `website/omniacreata-com` |
| `website/omnia-temp` | Prototype | `prototypes/website-temp` |
| `assets/FIGMA TASARIMI` | Design export | `design/figma/figma-make` |
| `creator-tools/*` | Incubation | `prototypes/omniatools-lab/*` |
| `docs/*` legacy review/report bundles | Archive | `archive/docs/legacy/*` |
| `Omnia Creata LOGO.png` | Brand asset | `design/brand/omnia-creata-logo.png` |
| `stitch_1._authentication.zip` | Cold storage | `archive/_cold-storage/` |

## Product normalization notes

### `apps/omnia-watch`

- `apps/web` -> `web`
- `apps/agent-windows` -> `desktop`
- `scripts` -> `ops/scripts`
- generated folders still appear locally and should continue moving out of canonical roots

### `apps/prompt-vault`

- `apps/web` -> `web`
- preview app shape is established under `web` plus product-local `packages`
- preview/free operations are acceptable for internal validation, but public launch should assume commercial-ready hosting and monitoring

### `apps/organizer`

- `app/AndroidApp` -> `mobile/android`
- master-plan material consolidated under `docs/master-plan`
- current source of truth is the Kotlin multi-module Android app under `mobile/android`
- any future Flutter evaluation is a later product decision, not the current migration plan

### `apps/studio`

- `app/OmniaCreata/frontend` -> `web`
- `app/OmniaCreata/backend` -> `backend`
- `app/OmniaCreata/.github` -> `ops/github`
- current direction remains cloud-first managed generation; no clean-slate rewrite is implied by repo taxonomy

### `apps/omniapixels`

- `app/backend` -> `backend`
- `app/mobile` -> `mobile`
- `app/shared` -> `packages/shared`
- `app/scripts` -> `ops/scripts`
- current product direction is incremental cleanup toward a local-first mobile MVP
- existing `backend`, `packages`, `ops`, and `tests` remain migration/reference surfaces until replacement is verified

## Current `repo:check` note

As of 2026-03-17, `npm run repo:check` passes topology checks and warns about the empty legacy directory `apps/Prompt Vault`.

The validator does not yet fail on every generated folder such as `.next`, `out`, `build`, or `dist`. Expanding that coverage is a documented follow-up rather than a completed guarantee.
