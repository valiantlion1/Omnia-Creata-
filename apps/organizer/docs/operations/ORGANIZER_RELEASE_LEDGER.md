# Organizer Release Ledger

## Purpose
Track every meaningful Organizer build, release decision, and release gate.

## Current release truth
- Product: OmniaOrganizer
- Package: `com.omnia.organizer`
- Active platform: Android
- Current manifest: [version.json](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/version.json)
- Latest live GitHub prerelease: [Omnia Organizer 1.0.0-alpha11](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha11)

## Entries

### 2026-04-08 - Alpha 11 explorer completion pass
- Version target: `1.0.0-alpha11`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha11](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha11)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - Browse now has a real sort and filter bottom sheet for the current folder
  - file taps in Browse open a metadata-first detail sheet instead of jumping straight into Android open
  - the explorer list and grid now render from one sorted and filtered browse pipeline
  - empty folder and no-match states now behave like explorer states instead of generic placeholders
- Known gaps:
  - Search and Storage still need the same structural polish as Browse
  - richer media previews are still deferred behind this metadata-first detail layer
  - another performance pass is still needed after more real-device feedback

### 2026-04-08 - Alpha 10 file explorer layout foundation
- Version target: `1.0.0-alpha10`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha10](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha10)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - Browse now has a real file explorer control panel instead of a loose list of rows
  - list view and grid view now both exist for folder browsing
  - grid cards were added for a more visual phone-friendly explorer layout
  - folder and file counts are surfaced so the current location feels clearer
- Known gaps:
  - sort controls and richer explorer filters still need a dedicated pass
  - search and storage layouts still need the same level of visual structure as browse
  - explorer performance tuning is still a separate follow-up sprint

### 2026-04-08 - Alpha 9 unified launch splash without double screen
- Version target: `1.0.0-alpha9`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha9](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha9)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - cold start now uses a branded Android launch splash instead of showing a separate square icon phase and then a second loading screen
  - foreground returns still show the in-app loading splash, so the brand/loading layer now feels consistent on every app open
  - splash timing was rebalanced so launch feels visible without stacking two different splash experiences
- Known gaps:
  - the system launch splash still uses a centered logo format, not a full cinematic layout
  - splash motion is still static for now
  - onboarding and permission education still need a dedicated first-run flow

### 2026-04-08 - Alpha 8 splash on every app open
- Version target: `1.0.0-alpha8`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha8](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha8)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - the branded splash now restarts whenever the app returns to the foreground instead of only behaving like a cold-start layer
  - the minimum visible duration was increased so the logo and loading copy actually register on real devices
  - splash timing is now reset on resume so warm app opens feel intentional too
- Known gaps:
  - splash motion is still static for now
  - onboarding and permission education still need a dedicated first-run flow
  - broader startup optimization still remains a later pass after more device feedback

### 2026-04-08 - Alpha 7 full-screen launch splash and loading pass
- Version target: `1.0.0-alpha7`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha7](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha7)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - a real full-screen OmniaCreata launch splash now appears before the app shell
  - the splash stays visible long enough to actually register the brand instead of flashing past
  - startup status messaging now explains secure access, device connection, and workspace loading states
  - the loading layer now covers the first root handshake so the app can warm up without feeling as abrupt
- Known gaps:
  - splash motion is still static and can get a second animation pass later
  - onboarding and permission education still need a dedicated first-run flow
  - broader startup optimization still remains a later pass after more device feedback

### 2026-04-08 - Alpha 6 OmniaCreata branded UI pass
- Version target: `1.0.0-alpha6`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha6](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha6)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - OmniaCreata-inspired gold, ink, and ivory visual system replaced the generic utility palette
  - home, browse, storage, settings, and empty states now use branded hero surfaces and stronger section hierarchy
  - the OmniaCreata logo now appears inside the Android app UI
  - navigation chrome was restyled to feel closer to a premium phone product
- Known gaps:
  - permission/onboarding flow still needs a dedicated full-screen product tour pass
  - some utility screens still need a second polish round after device feedback
  - performance tuning is still not the focus of this release

### 2026-04-08 - Alpha 5 core actions and destination picker
- Version target: `1.0.0-alpha5`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha5](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha5)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - Browse now supports long-press multi-select action mode
  - same-root copy and move now work with an in-app destination picker
  - bulk delete-to-Recycle-Bin shipped for selected items
  - bulk share now skips folders and shares regular files
  - single-item rename is reachable from selection mode
- Known gaps:
  - more performance tuning is still needed on very large devices
  - cross-root copy/move is still out of scope
  - selection mode is Browse-only in this sprint

### 2026-04-08 - Alpha 4 scan reduction and breadcrumb clarity
- Version target: `1.0.0-alpha4`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha4](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha4)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - storage summary scan no longer blocks the first open as aggressively
  - home now uses quick root-level file slices before the heavier storage summary is requested
  - browse path is clearer with arrow-based breadcrumbs and an up-one-folder action
  - deep traversal skips a few heavy low-value filesystem areas to reduce scan cost
- Known gaps:
  - lower-end device performance still needs another pass
  - multi-select and copy/move are still missing
  - Play policy and trust hardening still need a dedicated release track pass

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
