# OCOS Incident Policy

## States

- `open`
- `acknowledged`
- `auto_remediating`
- `resolved`
- `escalated`
- `silenced`

## Severity

- `P1`: Studio production shell or health hard-down
- `P2`: repeated degraded health, failed deployment verify, or stale verify gate
- `P3`: bookkeeping drift, report staleness, or non-production failures

## Open and resolve thresholds

- open only after 2 consecutive failures
- resolve only after 2 consecutive healthy checks
- run one bounded remediation attempt before Codex escalation
- escalate to Codex when remediation and follow-up verify both fail, or when a
  `P1` or `P2` incident stays open for 20 minutes

## Allowed v0 actions

- `recheck_public_health`
- `trigger_staging_verify`
- `collect_incident_bundle`
- `create_codex_escalation`

## Forbidden v0 actions

- deploy or rollback
- restart production services
- mutate secrets
- edit production files
- run destructive shell operations
