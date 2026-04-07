# OCOS Operations And Security

## Access Model

OCOS is internal-only.

That means:
- no public nav links
- no public signup
- `noindex`
- Cloudflare Access in front of UI hostnames
- PATs for CLI and sensitive mutations

Security comes from access control and signed machine traffic, not from obscurity.

## Hostnames

The default hostname plan is:

- `ops.omniacreata.com`
- `staging-ops.omniacreata.com`
- `hooks-ops.omniacreata.com`

The first two are operator-facing.

The third is machine-facing only.

## Machine Ingress Rules

Any non-browser callback into OCOS should require:

- timestamp
- delivery id
- HMAC signature
- replay protection
- expiry window validation

Unsigned traffic should never become first-class operational truth.

## Action Safety Rules

In early phases OCOS may only run bounded actions.

Allowed examples:
- recheck public health
- trigger staging verify
- collect incident bundle
- create Codex escalation

Forbidden examples:
- production deploy
- production restart
- secret mutation
- destructive shell operations

## Notification Rules

The default notification priority is:

- Telegram for immediate P1 and P2
- digest treatment for lower-priority noise
- resolved messages when a serious incident relaxes

The operator should never need to guess whether the problem is still active.

## Operational Truth

The wiki is not live truth.

Live truth must come from:
- incidents
- checks
- action runs
- notification records
- report objects
- artifact blobs

## Reliability Rule

The hosted OCOS path must still function when:
- the operator PC is off
- the desktop Codex app is closed
- no terminal is currently connected

This is why local-only automation cannot be the backbone.

## Auditability

Every meaningful operator or system action should eventually be traceable:

- who or what triggered it
- when it ran
- what it changed
- what evidence it produced
- whether it succeeded

If an action cannot be explained after the fact, it is not mature enough for production OCOS use.
