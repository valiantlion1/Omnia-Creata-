# Organizer Release Ledger

## Purpose
Track every meaningful Organizer build, release decision, and release gate.

## Current release truth
- Product: OmniaOrganizer
- Package: `com.omnia.organizer`
- Active platform: Android
- Current manifest: [version.json](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/version.json)

## Entries

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
- Do not treat random local debug builds as releases.
