# OmniaPrompt

OmniaPrompt is Omnia Creata's premium prompt and idea management product.

## Product layout

```text
web/         Next.js web app and PWA shell
packages/    Product-local shared packages
docs/        Product documentation
supabase/    Schema and RLS foundations
```

## Quick start

```bash
npm install
npm run dev
```

Open `http://localhost:3001`.

## Environment

Use `web/.env.example` as the starting point for local Supabase configuration.

## Start here

- Docs hub: [docs/README.md](docs/README.md)
- Product: [docs/PRODUCT.md](docs/PRODUCT.md)
- Design direction: [docs/OMNIAPROMPT_DESIGN_DIRECTION.md](docs/OMNIAPROMPT_DESIGN_DIRECTION.md)
- Execution plan: [docs/EXECUTION-PLAN.md](docs/EXECUTION-PLAN.md)

## Notes

- OmniaPrompt stays product-local inside `apps/prompt-vault`.
- Only ecosystem-wide modules should eventually move to root `packages/`.
