# Code Review Standard

## Review goal
- Catch bugs, regressions, unsafe assumptions, and missing verification before a change is considered done.

## Review order
1. Correctness and behavior regressions
2. Security, privacy, auth, billing, or data-loss risk
3. Deployment, runtime, and migration impact
4. Performance, reliability, and cost implications
5. Missing tests, lint, type-check, or build coverage
6. Maintainability and clarity

## Required checks
- The diff matches the requested scope.
- New or changed behavior has verification, or an explicit reason why it could not be verified.
- Public contracts, schemas, env docs, version files, or ledgers are updated when the touched product requires them.
- No secrets, logs, local machine paths, generated junk, or temporary artifacts were committed by accident.
- Failure paths remain honest; degraded behavior must not masquerade as success.

## Review output shape
- Findings first, ordered by severity, with file references.
- Then open questions or assumptions.
- Then a short change summary only if it helps.
