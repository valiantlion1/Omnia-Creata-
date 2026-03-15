# Product

## Vision

Prompt Vault is a premium cross-platform prompt and idea management system for serious AI users. It is positioned as a smart vault for prompts, ideas, reusable AI instructions, and evolving workflows.

## Core promise

- Save prompts, ideas, workflows, and system instructions in one place
- Organize them by category, tags, collections, language, and platform
- Search them fast
- Reuse them with one tap
- Keep version history instead of destructive overwrites
- Stay mobile-friendly, installable, and ready for cloud sync
- Use AI as an organization assistant, not as a generic chat layer

## Phase 1 blueprint

1. Product shell
   Public site, auth entry points, authenticated app shell, responsive navigation, shared design system, i18n routes.
2. Prompt system
   Prompt records, collections, tags, categories, favorites, archive, export, detail view, editor, version-aware saves.
3. PWA and resilience
   Manifest, icons, service worker registration, local preview persistence, offline-friendly shell behavior.
4. Backend readiness
   Supabase environment layer, auth-ready UI flows, SQL schema, RLS direction, deployment docs.

## Implemented in this repository

- Public pages:
  Homepage, features, how-it-works, pricing, FAQ, sign-in, sign-up, forgot-password
- App pages:
  Dashboard, library, collections, favorites, recent, settings, prompt detail, prompt editor
- Prompt features:
  Search, filters, favorites, archive, duplicate, copy, collections, tags, platforms, variables, version history, exports
- AI features:
  Suggest title, category, tags, platform, summarize long prompts, improve structure, create shorter or more detailed versions, and surface similar prompts
- Data modes:
  Local preview persistence today, Supabase-ready auth and schema for the next integration step

## Honest status

Implemented now:

- Real product shell and information architecture
- Real client-side prompt management flows
- Real version-aware editor logic
- Real export paths
- Real PWA setup
- Real Supabase schema foundation

Planned next:

- Live Supabase CRUD instead of preview-local persistence
- Session-gated protected app routes in production mode
- Full user profile persistence and account settings
- Import pipeline
- Public/private sharing flows
- Billing and plan enforcement

## Audience fit

Prompt Vault is intentionally suitable for:

- AI image and video users
- ChatGPT, Claude, Gemini, and coding assistant users
- Agent builders and automation operators
- Content creators, marketers, and founders
- Power users who need a serious searchable prompt operating system
