# Report Shape And Charts

Use this file when designing or reviewing an OCOS report payload.

## Canonical top-level meaning

Each report should answer:

1. what is the current state
2. why is that the state
3. what should the operator do next
4. what machine-readable evidence supports that answer

## Preferred report blocks

### Summary

- `headline`
- `status`
- `keyFindings[]`
- `recommendedActions[]`

### Metrics

Use metrics when:
- the value is numerically comparable
- the same field will matter again later

Good examples:
- availability
- error_rate
- deployment_verifies
- bounded_actions

### Charts

Use charts when:
- time or category shape matters
- a single metric is not enough

Preferred early chart set:
- health trend
- incident volume
- action outcomes
- availability sparkline

## Chart rules

- Use stable `id` values.
- Use meaningful `label` values.
- Use explicit series names.
- Keep x-axis points meaningful and consistent with the report window.
- Avoid chart shapes that exist only for visual flair.

## AI readability rules

Future automations and AI layers should be able to answer:

- what changed
- how bad it is
- what the next safe action is

without scraping prose out of the UI.

That means the report payload must remain primary, and the chart component must stay secondary.
