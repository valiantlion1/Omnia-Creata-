# AI Architecture

## Product role

Prompt Vault does not become a chat app.

The AI layer exists only to help users:

- suggest titles
- suggest categories
- suggest tags
- suggest target platforms
- summarize prompts
- rewrite prompts into cleaner structure
- generate shorter or more detailed prompt versions
- detect likely duplicates
- surface related prompts from the user library

## Safety principles

- All provider calls happen on the server only
- Provider API keys never enter client bundles or PWA storage
- Frontend requests only the internal `/api/ai/assist` route
- All request bodies are validated with Zod before execution
- Model outputs are parsed and validated before the route responds
- AI suggestions are kept separate from user content until the user explicitly applies them
- The UI never silently overwrites prompt content

## Backend shape

### Route

- [`apps/web/src/app/api/ai/assist/route.ts`](/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/app/api/ai/assist/route.ts)

This route:

- resolves the acting user or preview actor
- enforces same-origin requests
- applies per-actor rate limiting
- validates input
- runs the provider/service layer
- logs usage
- returns validated suggestion payloads

### Provider abstraction

- [`apps/web/src/lib/ai/provider-types.ts`](/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/lib/ai/provider-types.ts)
- [`apps/web/src/lib/ai/service.ts`](/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/lib/ai/service.ts)

Providers are swappable behind a common interface:

- Preview provider
- OpenRouter provider
- Groq provider
- Together provider

The current active provider is controlled by backend environment variables.

## Fallback strategy

- `find_similar` uses a server-side similarity engine and does not require an external model
- text generation tasks use the configured provider
- if the configured provider is unavailable, the configured fallback provider can take over
- the built-in preview provider offers safe heuristic suggestions when real keys are absent

## Rate limiting and abuse protection

- in-memory per-actor rate limiting is implemented in [`apps/web/src/lib/ai/rate-limit.ts`](/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/lib/ai/rate-limit.ts)
- request logging is implemented in [`apps/web/src/lib/ai/logging.ts`](/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/lib/ai/logging.ts)
- optional persistent logging can use the Supabase service-role path on the server only

## Data handling

- AI suggestions are rendered as reviewable suggestion cards
- applying a body rewrite creates a new prompt version instead of destructive overwrite
- metadata suggestions can be accepted or rejected explicitly
- preview mode stores accepted or pending AI suggestions separately from the prompt body in local product state

## Current limitations

- persistent server-side AI logs require `SUPABASE_SERVICE_ROLE_KEY`
- preview mode uses a server-side heuristic provider by default
- live Supabase-backed prompt retrieval for AI context is not wired yet, so the client sends a minimal library slice to the backend route

## Next recommended AI pass

- add authenticated server-side library reads in Supabase mode
- add persistent AI suggestion feedback storage in the main product flows
- add richer quota enforcement by subscription plan
- add analytics dashboards for AI usage and acceptance rate
