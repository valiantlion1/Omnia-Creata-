# Studio Incident Lanes

Use this file when a Studio incident needs deeper interpretation inside OCOS.

## Signal lanes

### 1. Public probe lane

Primary inputs:
- `/login`
- `/api/v1/healthz`
- `/api/v1/version`

Interpretation:
- login or shell missing = likely `P1` in production
- health degraded with shell still up = usually `P2`
- version visible but health unstable = likely release or provider investigation path

### 2. Deployment verify lane

Meaning:
- deployment verify is the best bounded proof for release truth
- it is stronger than a single public probe result when deciding closure readiness

Bias:
- if deployment verify is stale or failed, choose verify or bundle before escalating

### 3. Provider drift lane

Meaning:
- auth drift
- provider token drift
- gateway drift
- downstream dependency drift

Bias:
- do not solve with blind retries
- gather evidence and compare latest verify and provider smoke truth

### 4. Reporting freshness lane

Meaning:
- if reports are stale, operator confidence is stale
- stale reporting is an OCOS problem even when Studio itself may still be alive

Bias:
- refresh truth first
- avoid pretending that stale evidence is healthy evidence

## Action preference order

1. `recheck_public_health`
2. `trigger_staging_verify`
3. `collect_incident_bundle`
4. `create_codex_escalation`

## Escalation bias

Escalate when:
- one bounded action already failed
- follow-up truth is still unhealthy
- or the incident remains open long enough to meet Codex policy

Do not escalate only because the incident looks scary.
Escalate because the evidence now supports it.
