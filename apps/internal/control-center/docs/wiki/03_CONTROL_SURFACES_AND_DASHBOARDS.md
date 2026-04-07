# OCOS Control Surfaces And Dashboards

## Dashboard Hierarchy

OCOS should grow through a clear dashboard hierarchy:

- `Organization dashboard`
- `Project dashboards`
- `Service dashboards`

This prevents the company view from becoming too noisy and keeps each layer understandable.

## 1. Organization Dashboard

This is the top-level company cockpit.

It should answer:
- what is broken right now?
- which projects are degraded?
- what is already being handled?
- what is waiting for operator attention?
- what has escalated to Codex?

Primary sections:
- active incidents
- project health summary
- action queue
- escalation queue
- notification digest

## 2. Project Dashboard

Every Omnia project should eventually have its own dashboard.

Examples:
- `Studio`
- `Companion`
- `Prompt Vault`
- future internal or public Omnia products

Each project dashboard should answer:
- what is the health of this project?
- which services belong to it?
- what changed recently?
- what incidents or drifts matter here?
- what trends or anomalies are forming?

Primary tabs:
- `Overview`
- `Services`
- `Analytics`
- `Operations`
- `Reports`
- `AI Ops`

## 3. Service Dashboard

A service dashboard is the deepest operational view for a single app, API, worker, or environment.

It should show:
- current status
- recent checks
- build/version
- last deploy
- incident history
- action history
- provider/auth drift
- relevant artifacts and logs

## Surface Model

OCOS should support multiple operator surfaces over the same data:

- `Web / PWA`
- `CLI`
- `Automations`
- `Skills`
- `Agents`
- `AI Runtime`

These are not separate dashboard trees. They are separate access surfaces to the same operational model.

## Home Screen Rule

The main dashboard should always privilege:

1. situation
2. recommended action
3. live queue
4. services
5. escalations

It should never degrade into:
- a card mosaic
- a chart museum
- a generic executive dashboard

## Chart and Timeline Policy

Charts are necessary, but only if they help operation.

Preferred visual blocks:
- line charts
- bar charts
- area charts
- timelines
- sparklines

They should answer operational questions like:
- error rate trend
- latency drift
- uptime trend
- incident volume over time
- deploy frequency
- recovery duration

## Dashboard Growth Rule

Every new dashboard block must have one job:

- orient
- explain
- prove
- recommend
- or act

If a block does not serve one of those jobs, it should not appear in the primary dashboard.
