# Prompt Vault

Prompt Vault is Omnia Creata's premium prompt and idea management product.

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

- Docs hub: [docs/README.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/prompt-vault/docs/README.md)
- Product: [docs/PRODUCT.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/prompt-vault/docs/PRODUCT.md)
- Execution plan: [docs/EXECUTION-PLAN.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/prompt-vault/docs/EXECUTION-PLAN.md)

## Notes

- Prompt Vault stays product-local inside `apps/prompt-vault`.
- Only ecosystem-wide modules should eventually move to root `packages/`.
