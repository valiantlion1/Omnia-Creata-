# 08. Codex Capability Stack

## Why this page exists

OCOS is not a normal dashboard.
It is an internal operating system with:

- incident detection
- bounded remediation
- reports for humans and AI
- project-aware cockpits
- Codex escalation
- future agentic workflows

Because of that, generic marketplace skills help, but they do not create OCOS-native intelligence on their own.

The correct model is:

1. a small number of strong generic skills
2. a few real infrastructure connectors
3. Omnia-owned custom skills and plugins

## Core rule

Do not try to win by installing everything.

Win by making Codex excellent at the exact Omnia operating loop:

- detect
- verify
- summarize
- act safely
- escalate
- remember

## Tier 1: Must-have skills for OCOS

These are the minimum skills that materially improve OCOS build and operations work.

### UI and app architecture

- `frontend-skill`
  For cockpit UI, mobile-first surfaces, and internal product polish.
- `vercel:nextjs`
  For App Router architecture, route design, and Next.js implementation decisions.
- `build-web-apps:react-best-practices`
  For keeping React code stable as the cockpit grows.

### Verification

- `playwright`
  Mandatory for local and hosted UI verification, route checks, and operator flow testing.

### Platform and infra

- `cloudflare-deploy`
  For Worker, hooks ingress, and Cloudflare deployment work.
- `build-web-apps:supabase-postgres-best-practices`
  For schema design, report persistence, and project-aware data modeling.

### Repo and workflow work

- `github:github`
  For repo inspection and workflow context.
- `github:gh-fix-ci`
  For GitHub Actions and bounded workflow failures.

### Official OpenAI guidance

- `openai-docs`
  Use whenever OCOS touches Codex, automations, OpenAI APIs, or future AI runtime work.

## Tier 2: Strong next-step skills

These are not mandatory for v0, but they become valuable quickly.

- `security-threat-model`
  For trust boundaries, ingress, operator auth, and escalation safety.
- `security-best-practices`
  For secure-by-default TypeScript and JS review.
- `vercel:ai-sdk`
  For future AI panels, structured outputs, tool usage, and agentic UX.
- `hugging-face:transformers-js`
  If lightweight local or browser-side ML becomes useful.
- `doc`
  If operator reports or exported runbooks need `.docx` output.

## Tier 3: Optional and task-specific

Bring these in only when the task truly needs them.

- `figma*`
  For design-system work or design-to-code workflows.
- `Canva`
  For decks and brand output, not core product delivery.
- `Gmail`
  For inbox triage, not OCOS operations.
- `Netlify`, `Vercel`, `Stripe`
  Only if a specific Omnia product needs those platforms.

## Apps and connectors that actually matter

### Essential

- `GitHub`
  This is the most important external connector for OCOS today.
  It is needed for:
  - workflow dispatch
  - CI visibility
  - escalation handoff
  - repo-based remediation context

### Useful later

- `Notion` or `Google Drive`
  Only if runbooks and reports live there.
- `Figma`
  Only if design becomes part of the operating loop.

### Not core to OCOS v0

- `Canva`
- `Gmail`
- `Netlify`
- most marketplace connectors unrelated to infra or operations

## What is still missing even with all of the above

Installed skills are still insufficient unless Codex also gets Omnia-native memory and tooling.

OCOS needs custom capabilities in two layers.

### 1. Custom skills

These teach Codex how Omnia works.

Required custom skill set:

- `ocos-operator-core`
  Main OCOS mental model, project hierarchy, incident policy, route map, and action boundaries.
- `studio-incident-ops`
  Studio-specific health, verify, drift, and escalation behavior.
- `ocos-report-contracts`
  Human + AI readable report rules, chart block expectations, and contract discipline.
- `bounded-remediation-policy`
  Clear rules for what Codex may and may not attempt automatically.
- `codex-escalation-bundle`
  How escalation bundles should be created and what must be attached.

### 2. Custom plugin / internal MCP tools

These let Codex act on real Omnia systems instead of only editing code.

Required internal tools over time:

- `ocos-api`
  Read org summary, projects, incidents, reports, and actions directly.
- `telegram-notify`
  Send and verify operator alerts.
- `github-actions-bridge`
  Trigger bounded workflows and read their result state.
- `supabase-admin`
  Read and maintain incident/report persistence safely.
- `cloudflare-ops`
  Worker status, routes, Access-related checks, and hooks health.
- `firebase-app-hosting-ops`
  Hosted UI status and deployment visibility.

## Recommended capability strategy

### Keep

- `frontend-skill`
- `vercel:nextjs`
- `build-web-apps:react-best-practices`
- `playwright`
- `cloudflare-deploy`
- `build-web-apps:supabase-postgres-best-practices`
- `github:github`
- `github:gh-fix-ci`
- `openai-docs`

### Add next

- `security-threat-model`
- `security-best-practices`
- `vercel:ai-sdk`

### Build ourselves

- `ocos-operator-core`
- `studio-incident-ops`
- `ocos-report-contracts`
- `bounded-remediation-policy`
- `codex-escalation-bundle`
- `ocos-api` plugin/tool surface

## Current Sprint Activation

Use the sprint plan to stage these capabilities:

- `Sprint 10`
  - `ocos-operator-core`
  - `ocos-api` plugin scaffold
- `Sprint 11`
  - `studio-incident-ops`
  - `ocos-report-contracts`
  - `bounded-remediation-policy`
- `Sprint 12`
  - bounded automation and agent patterns

Current repo state:

- `Sprint 10` capability kernel is scaffolded
- `Sprint 11` service-aware skill scaffolds are present
- future work should connect these skills to live OCOS automation and escalation flows

## Anti-patterns

Avoid these:

- installing many unrelated skills and expecting domain intelligence
- using generic tools as a substitute for OCOS-specific runbooks
- letting Codex mutate production behavior without bounded action policy
- building AI before building stable incident, report, and action contracts

## Decision

For OCOS, the right stack is not "more skills".

It is:

- fewer generic skills
- stronger internal skills
- real Omnia connectors
- repo-native memory in the wiki

That is how Codex becomes better than prompt-by-prompt usage and starts behaving like an actual Omnia operating engineer.
