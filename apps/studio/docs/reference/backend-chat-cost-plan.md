# OmniaCreata Chat Backend + Cost Plan

## Current state

- Chat UI exists and stores conversations/messages.
- Prompt improvement now supports real provider routing.
- Chat replies now support real provider routing with:
  - Gemini primary
  - OpenRouter fallback
  - heuristic fallback if no API keys are configured
- Assistant messages now store provider/model/cost metadata.

## Current routing policy

- Internal chat alias: `studio-assist`
- Chat modes from UI:
  - `think`
  - `vision`
  - `edit`
- Provider selection:
  1. `CHAT_PRIMARY_PROVIDER`
  2. `CHAT_FALLBACK_PROVIDER`
  3. heuristic fallback

## Required backend env

```env
GEMINI_API_KEY=
OPENROUTER_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
OPENROUTER_MODEL=google/gemini-2.5-flash
CHAT_PRIMARY_PROVIDER=gemini
CHAT_FALLBACK_PROVIDER=openrouter
```

## Recommended default

- Prompt improve: Gemini first
- Chat: Gemini first
- Fallback: OpenRouter
- No raw GPU or self-host chat model for launch

## Why this route

- Lowest ops burden
- Fastest path to real chat
- Easy to measure model cost per turn
- Easy to switch provider later without changing the chat UI

## Token pricing references used for planning

- Gemini 2.5 Flash:
  - input: $0.30 / 1M tokens
  - output: $2.50 / 1M tokens
- Gemini 2.5 Flash-Lite:
  - input: $0.10 / 1M tokens
  - output: $0.40 / 1M tokens
- OpenRouter using `google/gemini-2.5-flash`:
  - same listed base model pricing on the model page
  - normalized OpenAI-style API and usage/cost response

## Rough chat cost examples

These are planning examples, not billing truth:

- Small assistant turn:
  - 1,500 input tokens
  - 400 output tokens
  - Gemini 2.5 Flash ~= $0.00145
- Medium assistant turn:
  - 3,000 input tokens
  - 700 output tokens
  - Gemini 2.5 Flash ~= $0.00265
- Flash-Lite version of the same workloads is much cheaper and may be good for prompt rewrite / utility flows.

## Recommended production split

- Compose/Create prompt enhancement:
  - Gemini 2.5 Flash-Lite or Gemini 2.5 Flash
- General chat:
  - Gemini 2.5 Flash
- Heavier premium reasoning later:
  - OpenRouter model-specific upgrade path

## Next implementation blocks

1. Add usage/cost surfaces in the UI
2. Add provider health/debug visibility for admins
3. Add moderation policy for chat + image requests
4. Add payment/cost caps before public launch
5. Add a real image provider to replace demo/placeholder paths
