# OCOS System Architecture

## Hosted Surfaces

OCOS has three hosted or operator-facing surfaces in v0:

- `web/`
  Next.js PWA for desktop and mobile operators
- `worker/`
  Cloudflare Worker for sparse checks, signed ingress, and notifications
- `cli/`
  terminal surface for the same operator model

These are not separate products. They are separate faces of one control plane.

## Core Backbone

The system backbone is:

- `UI` on Firebase App Hosting
- `event and cron layer` on Cloudflare Worker
- `state` in Supabase
- `alerts` through Telegram
- `bounded action execution` through GitHub workflows or direct safe probes

## High-Level Data Flow

1. A scheduled probe or signed service event reaches OCOS.
2. The event is normalized into shared contracts.
3. Incident logic checks fingerprint, severity, and thresholds.
4. Supabase is updated with checks, incidents, and action history.
5. If notification conditions are met, Telegram is triggered.
6. If a safe action is justified, a bounded action runs.
7. A follow-up verify either relaxes the incident or escalates it.
8. If needed, OCOS creates a Codex bundle for second-stage investigation.

## Why This Shape Matters

This shape gives OCOS:

- hosted reliability when local machines are off
- event-driven behavior without an expensive always-hot backend
- one persistent incident memory
- multiple operator interfaces without duplicated business logic

## Initial Service Shape

In v0 only `Studio` is live.

Studio is monitored through:
- public login probe
- public health probe
- public version probe
- bounded staging verify workflow
- bounded incident bundle workflow

## Future Architecture Growth

As more Omnia projects join, the architecture should not split into project-specific systems.

Instead, projects should plug into the same backbone:

- shared service registry
- shared incident model
- shared report contracts
- shared action rules
- shared escalation protocol

## Architecture Constraint

Codex is not the always-on runtime backbone.

Codex is a second-stage expert escalator.

The hosted system must still function if:
- the desktop app is closed
- the local PC is offline
- no operator is actively at the keyboard

## Practical Rule

Whenever a new capability is proposed, attach it to one of these layers:

- detect
- decide
- act
- verify
- escalate

If it does not fit one of these layers, it probably belongs outside the OCOS core.
