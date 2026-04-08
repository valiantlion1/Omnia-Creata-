# Organizer Release Ledger

## Purpose
Track every meaningful Organizer build, release decision, and release gate.

## Current release truth
- Product: OmniaOrganizer
- Package: `com.omnia.organizer`
- Active platform: Android
- Current manifest: [version.json](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/version.json)
- Latest live GitHub prerelease: [Omnia Organizer 1.0.0-alpha3](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha3)

## Entries

### 2026-04-08 - Alpha 3 broad storage access pass
- Version target: `1.0.0-alpha3`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha3](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha3)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - device storage access flow now targets full-phone file manager behavior instead of a single picked folder
  - filesystem-backed browse, preview, share, rename, folder create, and recycle-bin flows were expanded
  - trust and permission copy was rewritten so the app explains why it needs storage access
- Known gaps:
  - Android and Play policy hardening still needs a dedicated pass before store rollout
  - performance still needs another optimization sprint on lower-end phones
  - multi-select and copy/move are still not shipped

### 2026-04-08 - Alpha 2 performance and UI pass
- Version target: `1.0.0-alpha2`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha2](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha2)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - search now debounces instead of scanning on every keystroke
  - storage summary is refreshed in the background instead of on every folder navigation
  - current root UX is clearer and easier to switch
  - main mobile UI got a stronger utility-focused visual pass
- Known gaps:
  - still scoped to an Android-approved storage root
  - no multi-select yet
  - no copy or move flow yet

### 2026-04-08 - Alpha 1 first installable baseline
- Version target: `1.0.0-alpha1`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha1](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha1)
- Why it shipped:
  - first working Android reset baseline for OOFM
  - first direct-to-phone APK release path
- Known gaps:
  - old UX quality
  - performance issues
  - too much folder-root feel

### 2026-04-08 - Planning baseline locked
- Version target: `1.0.0-alpha1`
- Track target: internal / GitHub artifact testing
- Status: not shipped to Play Console yet
- Why it matters:
  - mobile-only product direction is locked
  - MVP is locked as a local-first file manager
  - release discipline now exists before major Android rewrite starts
- Notes:
  - current Android codebase still reflects old capture/task assumptions
  - first meaningful distributable build should happen only after Phase 1 shell reset

### 2026-04-08 - GitHub release pipeline added
- Version target: `1.0.0-alpha1`
- Track target: GitHub artifacts and prerelease flow
- Status: workflow added, not executed in this session
- What changed:
  - Organizer now has a dedicated GitHub Actions workflow for Android artifacts
  - matching `organizer-v*` tags can create or update GitHub Releases automatically
  - manual workflow dispatch can also create a release when a tag name is provided
- Assets expected from workflow:
  - alpha APK
  - release AAB

## Release rules
- Every testable milestone should update [version.json](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/version.json).
- Every shipped artifact should be logged here with:
  - version
  - track
  - artifact type
  - why it shipped
  - known risks
- Never replace an existing release with a new build under the same version.
- If a GitHub prerelease is already public, the next fix must ship as the next prerelease number.
- Do not treat random local debug builds as releases.
