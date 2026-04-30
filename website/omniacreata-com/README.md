# OmniaCreata Public Website

Official public headquarters for [omniacreata.com](https://omniacreata.com), built as the flagship marketing and discovery site for the OmniaCreata ecosystem.

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

Local canonical URL:

```text
http://127.0.0.1:4000/en
```

The public website intentionally uses port `4000` locally so it does not collide with OCOS, Studio, or older cached shells around `3000` and `3001`.

## Production

```bash
npm run build
npm run start
```

## Production environment

Do not commit real secrets. Set these in the hosting provider only:

```text
CONTACT_WEBHOOK_URL=https://...
CONTACT_WEBHOOK_SECRET=<random secret>
```

Add this only after Studio is live:

```text
NEXT_PUBLIC_STUDIO_URL=https://studio.omniacreata.com
```

`NEXT_PUBLIC_STUDIO_URL` is public and only controls where Studio buttons go. If it is not set, Studio buttons stay on the public Studio product page instead of pointing to an unavailable subdomain. `CONTACT_WEBHOOK_URL` and `CONTACT_WEBHOOK_SECRET` are server-only and must stay private. Without contact delivery credentials, the public contact path falls back to `founder@omniacreata.com`.

## Vercel note

If this app is deployed from the monorepo, use `website/omniacreata-com` as the Vercel root directory.
