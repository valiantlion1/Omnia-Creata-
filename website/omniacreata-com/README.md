# OmniaCreata Public Website

Official public headquarters for [www.omniacreata.com](https://www.omniacreata.com), built as the flagship marketing and discovery site for the OmniaCreata ecosystem.

## Brand display

- Use `OmniaCreata` for the public brand and company/product ecosystem.
- Use `OmniaCreata Studio` for the flagship product.
- Keep `omniacreata.com` only when referring to the domain itself.

## Stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- Locale-aware routing
- Vercel-ready deployment

## Canonical location

This property lives under `website/omniacreata-com` because `website/` is the dedicated umbrella for web properties in the monorepo.

## Local development

```bash
npm install
npm run dev
```

## Public site switches

Social profile links are read from public environment variables:

- `NEXT_PUBLIC_OMNIACREATA_INSTAGRAM_URL`
- `NEXT_PUBLIC_OMNIACREATA_X_URL`

Maintenance mode is disabled by default. Set `SITE_MAINTENANCE_MODE=true` to route public pages to the localized maintenance page while leaving internal assets and API routes available.

## Production

```bash
npm run build
npm run start
```

## Vercel note

If this app is deployed from the monorepo, use `website/omniacreata-com` as the Vercel root directory.
