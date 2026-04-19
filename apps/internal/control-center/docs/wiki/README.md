# OCOS Wiki

This wiki is the repo-native memory for OCOS.

Use it to answer eight questions fast:

1. What is OCOS supposed to become?
2. What are the hard architectural boundaries?
3. How should dashboards scale from company to project to service?
4. How should reports be readable by both humans and AI?
5. How do automations, skills, agents, and future AI fit in?
6. What should be built next, and in what order?
7. Which Codex capabilities are actually worth keeping, adding, or building ourselves?
8. Which sprint should capability work land in?

## Start Here

- [Product North Star](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/01_PRODUCT_NORTH_STAR.md)
- [System Architecture](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/02_SYSTEM_ARCHITECTURE.md)
- [Control Surfaces And Dashboards](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/03_CONTROL_SURFACES_AND_DASHBOARDS.md)
- [Data Model And Reporting](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/04_DATA_MODEL_AND_REPORTING.md)
- [Automations, Skills, Agents, And AI](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/05_AUTOMATIONS_SKILLS_AGENTS_AND_AI.md)
- [Operations And Security](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/06_OPERATIONS_AND_SECURITY.md)
- [Roadmap And Build Sequence](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/07_ROADMAP_AND_BUILD_SEQUENCE.md)
- [Codex Capability Stack](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/08_CODEX_CAPABILITY_STACK.md)
- [Sprint Capability Plan](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/09_SPRINT_CAPABILITY_PLAN.md)
- [Master Architecture Plan](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/10_MASTER_ARCHITECTURE_PLAN.md)
- [Automations Design Adaptation](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/wiki/11_AUTOMATIONS_DESIGN_ADAPTATION.md)

## Canonical Use

This wiki is the planning and orientation layer for OCOS.

Use it for:
- product intent
- architecture boundaries
- architecture layer ownership
- dashboard information architecture
- reporting contracts
- future capability expansion
- build sequencing
- page-specific design adaptations

Do not use it as the only source for live operational truth.

Operational truth still lives in:
- [Workspace README](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/README.md)
- [Product Notes](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/PRODUCT.md)
- [Architecture](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/ARCHITECTURE.md)
- [Incident Policy](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/INCIDENT_POLICY.md)
- [Runbook Format](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/docs/RUNBOOK_FORMAT.md)
- [Supabase Migration](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/internal/control-center/supabase/migrations/20260407_000001_init_ocos.sql)

## Current Snapshot

- OCOS is an internal-only incident operating system for OmniaCreata.
- It is not a public admin panel and not a customer product.
- `Studio` is the first tracked live service in v0.
- The hosted surfaces are `web/PWA`, `worker`, and `CLI`.
- The system is designed to work when local PCs are offline.
- The dashboard now needs to scale beyond incidents into project-aware command surfaces.
- Future OCOS layers include automations, skills, agents, and eventually Omnia-owned AI runtime.
- Capability work is now sprinted instead of being left to ad-hoc prompts.
- Sprint 10 capability memory is present and the first read-only `ocos-api` plugin bridge now exists in the repo.

## Update Rules

When OCOS changes meaningfully:
- update this wiki if the change affects product meaning, architecture, dashboards, reports, or roadmap
- update core docs if the change affects live operations or policy
- keep the incident model, dashboard model, and future capability model aligned
- resolve conflicts in the wiki explicitly instead of letting prompts silently drift

If a future implementation contradicts this wiki, the conflict should be resolved in the wiki rather than assumed away.
