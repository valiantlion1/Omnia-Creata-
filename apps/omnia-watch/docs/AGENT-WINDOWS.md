# Windows Agent

## Stack

- Electron
- TypeScript
- React renderer
- service-oriented main process

## Internal layout

- `src/main`
  - collectors
  - persistence
  - platform wrappers
  - pairing, scan, and sync services
  - IPC registration
- `src/preload`
  - secure renderer bridge
- `src/renderer`
  - companion UI

## Implemented capabilities

- local configuration persistence
- log persistence
- cached last scan
- pairing completion flow
- app inventory scan via registry plus winget upgrade awareness
- cleanup probes for safe categories
- startup item inspection
- health summary collection
- security summary collection
- sync client to SaaS API

## Live backend integration

- the agent completes pairing against `POST /api/device/pair/complete`
- the agent syncs scans against `POST /api/device/sync`
- both routes return honest backend errors to the desktop UI instead of generic status-only failures
- real persistence requires the web app to have Supabase public credentials, a service-role key, and `DEVICE_CREDENTIAL_SECRET`

## Honest boundaries

- the agent is Windows-only in this phase
- winget matching is best-effort and conservative
- execution flows such as bulk update or cleanup actions are not exposed as finished product features yet
- pairing and sync fall back to demo responses if the web environment is not configured for the live device pipeline

## Next steps

- device token rotation and revoke UX
- real command queue model for safe local actions
- signed installer and update channel strategy
- scheduled background scans
