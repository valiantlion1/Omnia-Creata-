# Data Model

## Core entities

### Profiles

- `profiles`
  User-facing profile record keyed to `auth.users`

### Preferences

- `user_preferences`
  Language, theme, density, default library view, offline cache preference

### Organization

- `categories`
  System categories plus future user-defined categories
- `collections`
  Group prompts by project, domain, or workflow
- `tags`
  Freeform many-to-many labels

### Prompt system

- `prompts`
  Canonical prompt record with latest version metadata and reusable prompt attributes
- `prompt_versions`
  Immutable historical snapshots
- `prompt_tags`
  Join table between prompts and tags
- `prompt_platforms`
  Join table between prompts and target platforms

### Product activity

- `activities`
  User-visible activity feed events
- `exports`
  Export jobs and audit records
- `prompt_shares`
  Placeholder-ready share model for later public/private link distribution
- `ai_requests`
  Request logs, rate-limit visibility, provider usage, and latency tracking
- `ai_suggestion_feedback`
  Optional future persistence for accepted or rejected AI suggestions

## Prompt record shape

Each prompt supports:

- title
- body
- summary
- notes
- result notes
- recommended variations
- type
- language
- category
- collection
- favorite / archive / pinned state
- rating
- variables metadata
- source label / source URL
- latest version pointer
- timestamps

## Versioning model

- Prompts are not treated as overwrite-only notes
- Every meaningful edit can create a new `prompt_versions` row
- `prompts.latest_version_number` makes the current version cheap to read
- Historical versions remain queryable for future diff and compare UI

## Platform model

- `platform_catalog` stores known platforms
- `prompt_platforms` allows many-to-many association
- This keeps the model ready for platform-specific analytics or recommendation logic later

## Sync direction

Current repository behavior:

- Preview mode persists locally in the browser
- Signed-in Supabase mode persists the merged vault dataset to `public.user_vault_state`
- The relational tables remain available as the long-term structured data model

Next step:

- Add hosted Supabase smoke proof with a real test account
- Promote high-value flows from JSON state sync to relational CRUD when the product needs richer querying
- Add storage conflict handling for future offline editing
- Add persistent AI suggestion acceptance and feedback records in live mode
