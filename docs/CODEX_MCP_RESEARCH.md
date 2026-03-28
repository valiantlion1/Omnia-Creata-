# Best MCPs for Codex

Last reviewed: 2026-03-29

## Best overall for this Codex setup

### 1. Figma MCP

Best when you want design-to-code context, variables, components, layout metadata, and better alignment with a real design system.

Why it matters:

- strongest frontend-specific context source when designs live in Figma
- works especially well with Dev Mode and Code Connect
- already enabled in local Codex config

### 2. Chrome DevTools MCP

Best when you want frontend debugging instead of just page clicking.

Why it matters:

- stronger than plain browser automation for network, console, performance, and runtime inspection
- useful for layout regressions, slow pages, hydration issues, and client-side bugs
- enabled in local Codex config

### 3. Playwright MCP

Best when you want reproducible browser flows, page interaction, screenshots, and automation.

Why it matters:

- reliable for user-flow validation
- good complement to Chrome DevTools MCP
- already enabled in local Codex config

### 4. Context7 MCP

Best when Codex starts making up outdated library APIs.

Why it matters:

- pulls current, version-aware documentation into the agent workflow
- especially valuable for Next.js, React, Tailwind, Supabase, Vite, and SDK-heavy work
- already enabled in local Codex config

### 5. GitHub MCP

Best when you want repo, PR, issue, workflow, and code review context inside the agent.

Why it matters:

- top-tier workflow MCP for real software work
- official remote and local options exist
- enabled here in remote mode; likely to require GitHub authentication on first use

### 6. OpenAI Developer Docs MCP

Best when you want Codex or OpenAI answers grounded in official product docs instead of memory.

Why it matters:

- official source for OpenAI and Codex docs
- lightweight, read-only, and high trust
- enabled in local Codex config

### 7. Postman MCP

Best when the task involves APIs, collections, environments, code generation from API definitions, or testing workflows.

Why it matters:

- strong API-context MCP
- official remote server with Codex installation guidance
- enabled here in `code` mode

## Best frontend-specific MCPs

### 1. 21st.dev Magic MCP

Use this when the goal is direct UI generation with multiple higher-quality component variations.

Notes:

- this is the strongest dedicated UI-generation MCP I found
- official site emphasizes multiple modern UI variations and production-ready code
- added to local Codex config as `magic_ui`
- may require a 21st.dev API key to fully operate

### 2. Figma MCP

Use this for turning real product design context into code and staying aligned with components and variables.

### 3. Chrome DevTools MCP

Use this for frontend debugging, performance work, network inspection, and runtime diagnosis.

### 4. Playwright MCP

Use this for real browser flows, screenshots, UI smoke checks, and interaction testing.

### 5. Storybook MCP

Use this if your repo actually runs Storybook.

Notes:

- excellent for component libraries, prop discovery, story generation, and component testing loops
- not enabled here because this repo does not currently expose a real Storybook setup in its package manifests

### 6. Postman MCP

Use this when frontend or full-stack work depends on external APIs and Codex needs richer API context than raw docs alone.

## Good but not top priority for this Codex environment

### Supabase MCP

Very good if the app uses Supabase auth, data, storage, or SQL workflows. Already enabled here.

### Sequential Thinking MCP

Helpful for complex debugging and planning, but it is a support MCP rather than a product-surface MCP. Already enabled here.

### OpenAI Developer Docs MCP

High trust and low risk. Already enabled here.

## Lower priority in Codex Desktop specifically

These are useful in the wider MCP ecosystem, but lower value here because Codex already has strong built-in local tooling:

- filesystem servers
- generic git servers
- generic memory servers

Inference:

- In this Codex environment, shell access, file reads, patches, and repo inspection already exist natively, so these MCPs often add overlap more than leverage.
