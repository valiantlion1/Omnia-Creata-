# Codex MCP setup

This workspace is paired with the local Codex config at `C:\Users\valiantlion\.codex\config.toml`.

Active MCPs:

- `figma`: remote Figma MCP, authenticated through `FIGMA_OAUTH_TOKEN`
- `openaiDeveloperDocs`: official OpenAI developer docs MCP
- `github`: official GitHub remote MCP server
- `postman`: Postman remote MCP server in `code` mode
- `supabase`: remote Supabase MCP for project `lktfxnpikzbiorfevaqz`
- `playwright`: browser automation via `@playwright/mcp`
- `chrome_devtools`: Chrome DevTools automation, performance, network, and debugging via `chrome-devtools-mcp`
- `magic_ui`: 21st.dev Magic MCP for stronger UI generation and variation
- `context7`: live library and framework docs via `@upstash/context7-mcp`
- `sequential_thinking`: structured step-by-step problem solving via the official MCP server

Why this set:

- `playwright` helps with real UI verification, screenshots, and browser flows
- `chrome_devtools` helps with frontend debugging, network inspection, and performance analysis
- `magic_ui` is the most UI-generation-focused MCP in this setup
- `openaiDeveloperDocs` gives a clean official source for OpenAI and Codex product questions
- `github` is high leverage for repo, PR, issue, and workflow context
- `postman` is useful when Codex needs API definitions, collections, and client-code context
- `context7` is the highest-value no-auth docs MCP for current package/framework guidance
- `sequential_thinking` helps on multi-step debugging and planning tasks
- `figma` and `supabase` were already useful for this workspace, so they were kept enabled

Not enabled yet:

- account-specific MCPs that would add clutter without the underlying service already being in use, such as Linear, Notion, or Atlassian

Next step after editing the config:

- restart Codex or open a new session so the updated MCP server list is loaded
- some remote MCPs may ask for OAuth consent the first time you enable or use them
- `magic_ui` may require a 21st.dev API key before real generation flows work fully
