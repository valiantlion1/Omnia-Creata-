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

## Notes

- Prompt Vault stays product-local inside `apps/prompt-vault`.
- Only ecosystem-wide modules should eventually move to root `packages/`.
