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
- nested `.git`, `node_modules`, `.turbo`, and local logs moved to `temp/quarantine`

### `apps/prompt-vault`

- `apps/web` -> `web`
- local `.codex`, nested `.git`, `node_modules`, and `.next` moved to `temp/quarantine`

### `apps/organizer`

- `app/AndroidApp` -> `mobile/android`
- master-plan material consolidated under `docs/master-plan`
- local IDE/build artifacts moved to `temp/quarantine`

### `apps/studio`

- `app/OmniaCreata/frontend` -> `web`
- `app/OmniaCreata/backend` -> `backend`
- `app/OmniaCreata/.github` -> `ops/github`
- generated frontend/backend artifacts moved to `temp/quarantine`

### `apps/omniapixels`

- `app/backend` -> `backend`
- `app/mobile` -> `mobile`
- `app/shared` -> `packages/shared`
- `app/scripts` -> `ops/scripts`
- duplicate legacy roots moved to `archive/products/omniapixels`
