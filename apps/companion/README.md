# OmniaCompanion

OmniaCompanion is Omnia Creata's user-facing AI companion and character experience product.

## Planned product layout

```text
web/         First canonical implementation surface
docs/        Product definition, boundaries, roadmap, and handoff
packages/    Product-local shared modules once implementation begins
ops/         Product operational material if needed later
```

## Planning status

Companion remains a core product root in `apps/`, but implementation has not been promoted yet.

The canonical planning set lives in:

- [docs/README.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/companion/docs/README.md)
- `docs/PRODUCT.md`
- `docs/BOUNDARIES.md`
- `docs/ROADMAP.md`
- `docs/IMPLEMENTATION-HANDOFF.md`

## Notes

- Companion is a product, not an internal control plane.
- OCOS is treated as a future external internal platform, not a Companion feature.
- Studio, Prompt Vault, auth, billing, and other ecosystem services are optional integrations unless explicitly promoted into the implementation plan.
