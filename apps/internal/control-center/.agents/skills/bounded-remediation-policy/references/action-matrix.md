# Action Matrix

Use this file when deciding whether an OCOS action is safe.

## Allowed classes now

### Observe

Examples:
- read summary
- read incident
- read report
- read action history

Policy:
- safe
- automation-friendly

### Verify

Examples:
- public recheck
- staging verify

Policy:
- safe when bounded
- preferred first response

### Collect

Examples:
- incident bundle collection
- artifact gathering
- report materialization

Policy:
- safe if it does not mutate production state

### Escalate

Examples:
- create Codex escalation bundle
- notify operator

Policy:
- safe
- preferred over unsafe remediation expansion

## Forbidden classes now

### Mutate production

Examples:
- restart services
- redeploy automatically
- rewrite production config
- rotate secrets automatically

Policy:
- forbidden in current OCOS policy

## Decision shortcut

If the action changes production behavior directly, it is not bounded by default.

If the action only increases truth or prepares expert handoff, it is usually acceptable.
