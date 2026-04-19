# OCOS Automations Design Adaptation

## Purpose

This page translates the shared visual reference into an OCOS-native design plan for the `Automations` surface.

Use it to answer:

- what we borrow from the reference
- what we reject
- how `Automations` fits the OCOS page tree
- what the first implementation should look like

This is a design adaptation page, not a generic moodboard.

## Screen Job

The `Automations` surface exists to help operators:

- read what recurring or event-driven automations exist
- understand what each automation watches or triggers
- see whether it is safe, healthy, paused, or failing
- open a deeper builder or run history only when needed

It is not:

- a marketing automation dashboard
- a hero page
- a graph toy
- the place where the whole OCOS system gets compressed into one screen

## Reference Verdict

The reference is strong for:

- left navigation clarity
- centered workspace with one obvious primary table
- lightweight search and filter controls
- one contextual side panel that points to the next action
- soft hierarchy that feels clean rather than busy

The reference is weak for OCOS if copied too literally because:

- it feels consumer SaaS rather than internal operations workbench
- it softens the operational seriousness too much
- it relies on polished filler visuals more than evidence density
- it risks turning `Automations` into one more decorative dashboard

## Adaptation Rule

Borrow the layout logic.

Do not borrow the product identity.

For OCOS, the correct translation is:

- calmer and more operational
- denser where evidence matters
- more explicit about safety and ownership
- less purple SaaS energy
- more ERP/workbench discipline

## Placement In The OCOS Page Tree

`Automations` should be a first-class top-level workbench page.

Recommended routes:

- `/automations`
  automation index and triage
- `/automations/[id]`
  automation detail, safety, and run history
- `/automations/runs`
  cross-system automation execution history
- `/automations/builder`
  bounded playbook builder
- `/automations/templates`
  approved automation and playbook templates

This keeps the shell aligned with the rule:

- overview pages orient
- queue pages triage
- detail pages explain
- action pages execute

## Page Structure

### 1. Page Header

Keep a compact header with:

- page title: `Automations`
- one-line description grounded in operator language
- search
- filters
- primary CTA: `New Playbook` or `New Automation`

Avoid:

- hero copy
- giant metrics strip
- decorative insight buttons with vague meaning

### 2. Main Table

The center of gravity should be a serious table, not cards.

Recommended columns:

- `Name`
- `Trigger`
- `Scope`
- `Last Run`
- `Next Run`
- `Success`
- `Safety`
- `Owner`
- `Status`

Optional later columns:

- `Last Incident`
- `Avg Duration`
- `Failure Streak`

The table should be sortable and filterable.

The table must privilege:

- readability
- recent failure visibility
- bounded-action clarity

### 3. Context Rail

The reference's right panel translates well, but only as a contextual utility rail.

Its OCOS job should be:

- highlight the selected automation or template
- explain what the builder does
- show safety policy summary
- show the next recommended operator action

Good OCOS uses:

- `Playbook Builder`
- `Local Analyst Flow`
- `Bounded Action Policy`
- `Template of the week`

Bad OCOS uses:

- decorative illustration with no operational value
- filler KPI card
- generic AI hype CTA

### 4. Filter Bar

Recommended filters:

- `Project`
- `Environment`
- `Trigger Type`
- `Safety Class`
- `Status`
- `Owner`

This should feel closer to internal incident tooling than consumer list search.

## OCOS-Specific Surface Language

The reference must be adapted to OCOS vocabulary.

Prefer:

- `Playbook`
- `Automation`
- `Trigger`
- `Bounded Action`
- `Run History`
- `Safety Class`
- `Escalation`
- `Last Verified`

Avoid:

- `Campaign`
- `Audience`
- `AI insight`
- generic SaaS wording

## Data Model Hints

The `Automations` index should eventually read from typed objects shaped roughly like:

```ts
type AutomationListItem = {
  id: string;
  name: string;
  triggerType: "schedule" | "event" | "incident" | "manual";
  scope: {
    projectSlug?: string;
    serviceSlug?: string;
    environmentSlug?: string;
  };
  safetyClass: "observe" | "bounded_action" | "escalation_prep";
  owner: string;
  status: "active" | "paused" | "degraded" | "failing";
  lastRunAt?: string;
  nextRunAt?: string;
  successRate30d?: number;
};
```

## Visual Translation

Keep:

- clear shell
- light surface hierarchy
- one dominant work area
- one supporting rail
- compact, useful controls

Change:

- reduce purple bias
- tighten table density
- make status colors more operational and less decorative
- replace soft marketing iconography with schematic or policy-aware support visuals

### Color Direction

Aim for:

- warm off-white or cool mineral canvas
- graphite or ink text
- one restrained blue or indigo accent
- muted severity tones for status only

Avoid:

- saturated purple-first branding
- glossy AI gradients
- black-glass dark dashboard styling

## Mobile Behavior

On smaller screens:

- collapse the context rail below the table
- keep search and filter reachable early
- move secondary metadata into expandable rows
- keep the primary CTA pinned near the top

Do not simply stack the desktop page into a long box tower.

## Initial Build Scope

The first implementation should include:

- `Automations` nav item
- `/automations` index page
- table with seeded playbook data
- search and basic filters
- context rail with `Playbook Builder` teaser
- status and safety badges

The first implementation should not include:

- full drag-and-drop builder
- cross-page orchestration graph engine
- heavy charting
- autonomous AI flow editing

## Phase 2 Follow-Up

After the basic page lands, add:

- `/automations/[id]`
- `/automations/runs`
- `/automations/templates`
- bounded builder flow
- local analyst automation templates

## Design Decision

The reference should shape the `Automations` page only.

It should not redefine the whole OCOS workbench.

The rest of OCOS remains:

- denser
- more incident-driven
- more evidence-heavy
- less consumer SaaS in tone

That keeps `Automations` visually approachable without weakening the overall operations shell.
