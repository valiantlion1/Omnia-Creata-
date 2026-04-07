# OCOS Product North Star

## What OCOS Is

OCOS is the OmniaCreata internal operating system for active products, services, incidents, and operator workflows.

It is not:
- a public admin panel
- a customer-facing analytics portal
- a replacement for product-native dashboards
- part of `Omnia Watch`

It is:
- the company command center
- the place that sees incidents first
- the place that routes, verifies, and escalates
- the place where human operators, scripts, workflows, and AI all share the same incident reality

## Core Product Promise

When something breaks, drifts, slows down, or becomes risky, OCOS should:

1. notice it
2. summarize it clearly
3. decide whether a bounded action is safe
4. verify the result
5. notify the operator
6. escalate to Codex or a human if the safe path fails

The product promise is not "beautiful observability."

The product promise is:

`detect -> explain -> act -> verify -> escalate`

## Long-Term Product Shape

OCOS should eventually support three levels of operational understanding:

- `Organization level`
  Company-wide health, major incidents, project risk, operator load, and active escalations.
- `Project level`
  Product-by-product control planes such as Studio, Companion, Prompt Vault, and future Omnia projects.
- `Service level`
  App, API, worker, provider, queue, auth, and deployment detail for each project.

## Non-Negotiable Product Rules

- Internal only
- Hosted and available with the operator PC offline
- Mobile and desktop usable
- CLI-compatible
- Bounded actions before deep AI or human escalation
- No destructive auto-remediation in early phases
- One shared incident model across every future surface

## v0 Scope

The first release is intentionally narrow:

- Studio only
- hosted PWA
- hosted worker
- operator CLI
- Telegram-first notifications
- GitHub workflow bridge for safe bounded actions
- Codex escalation bundle generation

## What Success Looks Like

OCOS succeeds when:

- the operator can understand the current situation in seconds
- one incident does not create ten duplicate alerts
- safe actions are obvious and fast
- the same truth appears on phone, desktop, and terminal
- future capabilities can be added without turning the dashboard into clutter

## Design Principle

The dashboard should always feel like a control surface, not a card gallery.

Every new feature must answer:

- does this help an operator orient faster?
- does this reduce decision friction?
- does this keep human and machine understanding aligned?

If not, it does not belong in the primary OCOS surface.
