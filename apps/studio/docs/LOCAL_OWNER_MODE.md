# Studio Local Owner Mode (Historical / Deprecated)

This document is retained only as historical context.

It is not the current runtime truth for Studio.

## Current truth

- `POST /v1/auth/local-owner-login` is no longer a working bypass path.
- Local owner bypass has been removed in favor of approved admin accounts.
- Studio no longer treats local ComfyUI or machine-bound checkpoints as an active product lane.
- The supported runtime direction is:
  - managed/cloud providers
  - durable metadata
  - shared queue worker topology
  - protected staging before public launch

## What replaced the old local-owner idea

- approved admin / owner accounts through the real auth system
- local always-on stack helper:
  - [start-studio-local.ps1](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/ops/start-studio-local.ps1)
- external runtime logs:
  - `%LOCALAPPDATA%\\OmniaCreata\\Studio\\logs`
- external durable metadata root:
  - `%LOCALAPPDATA%\\OmniaCreata\\Studio\\data`
- first deployment pack for protected staging:
  - [deploy README](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/studio/deploy/README.md)

## Why this file still exists

Some older notes and plans still point here.

Keeping this file as an explicit deprecation notice is safer than letting future maintainers assume the old ComfyUI/local-owner flow is still valid.
