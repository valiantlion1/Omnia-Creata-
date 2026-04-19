# OCOS API Plugin

This plugin turns the repo-local `plugins/ocos-api` scaffold into a real read-only MCP bridge for the existing OCOS control plane.

## What it exposes

- organization summary
- project list
- project cockpit view
- incident list and incident detail
- report list
- runtime status / reachability check

## Runtime inputs

The server reuses the same operator config shape as the OCOS CLI:

- `OCOS_API_URL`
- `OCOS_OPERATOR_TOKEN`
- `~/.ocos/config.json`

If no config is present, it defaults to `http://127.0.0.1:3000`.

## Local verification

1. Start OCOS web locally.
2. From this folder, run `npm install`.
3. Run `npm run check`.
4. Run `npm run smoke`.

The smoke script connects over stdio, lists the registered tools, and probes the live OCOS summary endpoint.
