# OmniaCreata Studio (OCS)

OmniaCreata Studio is the flagship visual generation and creative production product in the Omnia Creata ecosystem.

## Current Snapshot

- Studio is in `Protected Beta Hardening`.
- The working target is a trustworthy protected beta, not a broad public paid launch yet.
- Backend/operator truth is being locked around one contract, one artefact chain, and one Docker staging proof.
- Protected-beta provider policy is intentionally narrow for now:
  - chat: `OpenAI` is the only launch-grade lane
  - image: `OpenAI gpt-image-1-mini` is the default protected-beta lane
  - premium image QA stays owner-gated behind explicit opt-in
- This is a temporary protected-beta proof policy, not a permanent public-live vendor lock.
- The hidden operator source for `surface -> tier -> provider -> model` truth is now `ai_control_plane.surface_matrix` inside owner health detail.

## Repo Wiki

The Studio repo now includes a dedicated wiki memory layer:

- [Studio Wiki Index](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/docs/wiki/README.md)

Use it for:
- product direction
- architecture boundaries
- sprint status
- engineering standards
- release/operations orientation

## Product layout

```text
web/         Vite/React front-end
backend/     Python service and provider orchestration
assets/      Product assets and references
config/      Product configuration
ops/         Product operational material
deploy/      Protected staging and always-on deployment pack
```

## Notes

- Studio was cleaned in-place; its working code was not re-homed into a new product root.
- Generated frontend and backend artifacts were moved to local quarantine instead of remaining in source.
- Internal code name: OCS
- First bounded deployment guidance now lives in [deploy/README.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/deploy/README.md).
- Protected-beta closure discipline now lives in [apps/studio/ops/verify-protected-beta.ps1](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/ops/verify-protected-beta.ps1) plus the local/staging verify scripts.
