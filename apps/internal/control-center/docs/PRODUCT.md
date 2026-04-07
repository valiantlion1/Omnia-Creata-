# OCOS Product Notes

Status: active internal product seed

OCOS is the OmniaCreata internal incident operating system. It is not a public
admin panel and it is not part of Omnia Watch. The product exists to detect,
summarize, route, and escalate production or staging problems across Omnia
applications without depending on a single developer machine staying online.

## v0 boundaries

- track `Studio` only
- ship a hosted PWA, worker, and CLI
- send Telegram-first notifications
- allow only bounded action recipes
- create Codex escalation bundles, but do not attempt unattended remote repair

## Non-goals

- no public customer-facing routes
- no destructive remediation
- no replacement of app-native dashboards
- no coupling to Omnia Watch product surfaces
