# OmniaCreata Studio (OCS)

OmniaCreata Studio is the flagship visual generation and creative production product in the Omnia Creata ecosystem.

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
