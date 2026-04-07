# OCOS Data Model And Reporting

## Why Reporting Needs Two Layers

OCOS reports must work for:

- human operators
- AI reasoning layers
- automations
- future agents

That means every report needs two layers at once:

- `Readable layer`
  headings, tables, charts, summaries, timelines, actions
- `Machine layer`
  typed JSON, normalized events, stable keys, explicit states and metrics

Pretty UI without structured data is not enough.

Structured data without readable UI is also not enough.

## Canonical Hierarchy

The long-term OCOS data hierarchy should be:

- `organization`
- `projects`
- `services`
- `environments`
- `checks`
- `incidents`
- `actions`
- `notifications`
- `reports`
- `escalations`
- `knowledge`

## Report Philosophy

A report is not just a paragraph summary.

A report is a typed operational object that can:
- render in UI
- feed charts
- be indexed for search
- be compared historically
- be summarized by AI
- be used as evidence for escalation

## Canonical Report Shape

The precise implementation can evolve, but the conceptual contract should look like this:

```ts
type OcosReport = {
  id: string;
  reportType: "daily" | "weekly" | "incident" | "service" | "project";
  scope: {
    projectSlug: string;
    serviceSlug?: string;
    environmentSlug?: string;
  };
  period: {
    start: string;
    end: string;
  };
  summary: {
    headline: string;
    status: "healthy" | "degraded" | "failed";
    keyFindings: string[];
    recommendedActions: string[];
  };
  metrics: {
    availability?: number;
    errorRate?: number;
    p95Latency?: number;
    deployCount?: number;
  };
  charts: Array<{
    id: string;
    type: "line" | "bar" | "area" | "timeline";
    label: string;
    series: Array<{
      name: string;
      points: Array<{ x: string; y: number }>;
    }>;
  }>;
  incidents: Array<{
    id: string;
    severity: "P1" | "P2" | "P3";
    state: string;
    summary: string;
  }>;
};
```

## Machine-Readable Requirements

Any AI-readable OCOS report should prefer:

- stable field names
- explicit enums
- timestamps in ISO format
- stable identifiers
- denormalized summary fields for quick scan
- raw metric series for chart reconstruction

## Human-Readable Requirements

Any operator-readable OCOS report should include:

- one clear headline
- one health/status verdict
- top findings
- top next actions
- charts that support the story
- direct links to incidents or actions when relevant

## Knowledge Layer

Later, reports should also become part of the OCOS knowledge layer.

That means:
- incidents can be matched to similar past incidents
- recurring drifts can be detected
- common remedies can be suggested
- the AI layer can reason from history instead of only from the current event

## Rule

If a new metric, chart, or report cannot be cleanly represented in structured form, it should not become a first-class OCOS reporting primitive yet.
