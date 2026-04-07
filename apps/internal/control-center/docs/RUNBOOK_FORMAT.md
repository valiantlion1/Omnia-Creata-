# OCOS Runbook Format

Every runbook entry should include:

1. `Intent`: what failure mode or operator need the entry covers
2. `Inputs`: required service, environment, secrets, or workflow identifiers
3. `Safe action`: bounded command or workflow OCOS may trigger
4. `Verify`: the follow-up check that must pass before the incident can relax
5. `Escalate`: when the runbook stops and Codex or a human takes over

Use short, deterministic steps and prefer existing repo scripts over ad-hoc
shell sequences.
