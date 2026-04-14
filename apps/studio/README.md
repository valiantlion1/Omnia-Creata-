# OmniaCreata Studio (OCS)

OmniaCreata Studio is the flagship creative product in the Omnia Creata ecosystem.

It is not a generic chatbot, a provider demo shell, or a random prompt playground.

Studio has two intentional product surfaces:
- `Create` = deterministic visual execution
- `Chat` = premium multimodal creative copilot

## Current Snapshot

- Active frame: `Controlled Public Paid Launch`
- `Protected Beta Hardening` is the closed baseline that got Studio here; it is no longer the main planning target
- Public launch doctrine: broad public access, self-serve account flow, controlled capacity, and honest paid-product truth
- Commercial packaging is `Free Account`, `Creator`, `Pro`, and `Credit Packs`
- Exact package numbers and checkout availability come from the server-authoritative catalog, not hardcoded UI copy
- `Create` and `Chat` launch together and share one account, billing, and entitlement contract
- `OCOS` is future internal operating-system work; it is not a Studio deliverable in this wave

## Current Launch Gaps

Protected-beta closure is already a baseline win.

The real public-paid blockers still visible in backend/operator truth are:
- `provider_mix`
- `image_public_paid_usage`
- `provider_economics`

Studio should not pretend those are solved before the current build proves them.

## Repo Wiki

Studio keeps a repo-native context pack and wiki here:
- [Studio Wiki Index](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/README.md)

Use it for:
- product direction
- current launch frame
- architecture boundaries
- delivery status
- planning order

## Product Layout

```text
web/         Vite/React frontend
backend/     Python service and provider orchestration
assets/      Product assets and references
config/      Product configuration
ops/         Product operational scripts
deploy/      Protected staging and always-on deployment pack
docs/        Canonical Studio docs, wiki, and operations memory
```

## Read First

Human orientation:
1. [Docs Hub](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/README.md)
2. [Product North Star](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/01_PRODUCT_NORTH_STAR.md)
3. [Delivery Status](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/03_DELIVERY_STATUS.md)

AI / IDE orientation:
1. [AI Context Pack](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/00_AI_CONTEXT_PACK.md)
2. [Version Manifest](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/version.json)
3. [Release Ledger](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_RELEASE_LEDGER.md)
4. [Maintenance Map](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/operations/STUDIO_MAINTENANCE_MAP.md)

## Notes

- Studio was cleaned in place; it was not moved into a new product root.
- Runtime logs and operator artefacts stay outside the repo under `%LOCALAPPDATA%\\OmniaCreata\\Studio\\...`
- Current-build proof still matters more than launch copy. If docs, UI, and operator truth disagree, fix the conflict explicitly.
