# Omnia Creata Project Map

## Product portfolio

- `apps/studio` - Omnia Creata Studio, active primary product
- `apps/internal/control-center` - OCOS / Control Center, future internal app
- `apps/organizer` - OmniaOrganizer, incubation / secondary review
- `apps/prompt-vault` - Prompt Vault, incubation / secondary review
- `apps/omniapixels` - OmniaPixels, incubation / secondary review
- `apps/omnia-watch` - Omnia Watch, incubation / secondary review
- `apps/companion` - OmniaCompanion, planned / hold

## Web properties

- `website/omniacreata-com` - public HQ site

## Shared and support layers

- `packages/` - cross-product packages promoted from product-local code only after the surface is proven shared
- `design/` - brand, figma, and export material
- `docs/` - living repository docs
- `research/` - experiments
- `prototypes/` - incubating concepts
- `archive/` - historical material

## Current modularity posture

- The repo topology is stable enough to scale, but the shared-code layer is not yet mature.
- Several products still carry product-local package families such as `config`, `types`, `validation`, `i18n`, `contracts`, and `ui`.
- The next structural refactor wave should focus on promotion rules and shared extraction, not on creating more ad-hoc package trees.
