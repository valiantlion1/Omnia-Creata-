# OCOS Control Surfaces And Dashboards

## Navigation Principle

OCOS should prefer more focused pages over fewer overloaded dashboards.

The rule is:

- home pages route
- queue pages triage
- detail pages explain
- action pages execute
- report pages summarize

If a surface starts cramming too many tables, charts, cards, and buttons into one view, split it into additional pages instead of compressing more UI into boxes.

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

Dedicated organization pages should include:
- `Incidents`
- `Projects`
- `Action Runs`
- `Automations`
- `Escalations`
- `Notifications`
- `Reports`
- `Search`
- `Settings`

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

The project overview page should stay concise and route outward.

Primary project pages:
- `Overview`
- `Incidents`
- `Services`
- `Environments`
- `Checks`
- `Operations`
- `Action Runs`
- `Automations`
- `Deploys and Versions`
- `Provider and Dependency Drift`
- `Reports`
- `Runbooks`
- `Escalations`
- `Settings`

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

Dedicated service pages should include:
- `Summary`
- `Checks`
- `Incidents`
- `Actions`
- `Deploy and Version`
- `Dependencies`
- `Artifacts`
- `Runbook`

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
- a giant everything-page that tries to hold the whole system at once

The homepage is for orientation, not compression.

If an operator needs to scroll through stacked boxes just to find one incident, one action run, or one service detail, the information architecture is wrong.

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

## Page Growth Rule

When a workflow becomes dense, grow the page tree instead of densifying the same screen forever.

Preferred move:

1. keep the overview page small
2. break operational lists into their own queue pages
3. break deep evidence into dedicated detail pages
4. use links, tabs, and drilldowns instead of more stacked cards

OCOS should feel closer to an internal ERP workbench than a startup analytics dashboard.
