# Organizer Release Ledger

## Purpose
Track every meaningful Organizer build, release decision, and release gate.

## Current release truth
- Product: OmniaOrganizer
- Package: `com.omnia.organizer`
- Active platform: Android
- Current manifest: [version.json](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/version.json)
- Latest live GitHub prerelease: [Omnia Organizer 1.0.0-alpha20](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha20)

## Entries

### 2026-04-10 - Alpha 20 light theme rescue and browse compression pass
- Version target: `1.0.0-alpha20`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha20](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha20)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - the app is now forced onto the intended warm light theme so the Stitch-inspired UI no longer collapses into unreadable dark-on-dark screens on phones using system dark mode
  - Browse header chrome was compressed: the giant static heading is gone, the table-like row labels were removed, path handling is cleaner, and list content gets more of the screen
  - workspace and quick-action surfaces were tightened so Home feels less oversized and more like a real mobile utility
  - Storage loading now uses a proper card-based waiting state instead of a mostly empty black screen
- Known gaps:
  - the visual system is now usable again, but some layouts still need another phone-driven polish pass to feel premium instead of merely fixed
  - onboarding, splash, and some secondary sheets still need consistency work after the core screens settle
  - Play Store icon, screenshots, listing copy, and public legal URLs still need completion before submission

### 2026-04-10 - Alpha 19 Figma-driven UI master pass
- Version target: `1.0.0-alpha19`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha19](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha19)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - Browse now follows the stronger Stitch/Figma explorer direction, with a calmer header, more deliberate list or grid controls, visible item counts, and cleaner explorer chrome
  - Home and Storage surfaces were redesigned around lighter premium utility cards, making storage usage, quick actions, pinned entries, and category shortcuts easier to scan on a phone
  - Search, file detail, and supporting sheets now share the same softer neutral palette and card language, reducing the old mixed-quality feeling across core screens
  - file rows, grid cards, stat pills, and the bottom navigation shell were refined to feel more like one OmniaCreata product instead of separate unfinished layers
- Known gaps:
  - onboarding, splash, and some permission-state screens still need one more visual pass to fully match the new Browse/Home direction
  - some secondary dialogs and banners can still be refined after another real-device review round
  - store icon, final screenshots, listing copy, and public legal URLs still need to be finished before Play submission

### 2026-04-09 - Alpha 18 readability and explorer density pass
- Version target: `1.0.0-alpha18`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha18](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha18)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - typography was enlarged across body and label styles so UI copy is easier to read on a phone
  - Browse now spends less vertical space on chrome: the explorer card is slimmer, actions are chip-based, and the file list gets more of the screen
  - Home, Search, and Storage were rewritten in a more utility-first tone with shorter copy and less decorative surface stacking
  - file rows now scan faster thanks to tighter hierarchy and a single clean metadata line instead of cramped stacked text
  - pinned entry points and quick actions were simplified so the app feels less like a promo layer and more like a real mobile file explorer
- Known gaps:
  - the top app shell still needs one more pass to feel fully premium and Play-store-ready
  - grid cards and detail sheets can still be polished further after another phone test round
  - final store icon, screenshots, listing copy, and legal hosting still need to be completed before Play submission

### 2026-04-09 - Alpha 17 interface shell and explorer UI pass
- Version target: `1.0.0-alpha17`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha17](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha17)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - the app shell now reads more like an OmniaCreata product, with a stronger top app bar identity, a floating bottom navigation surface, and a calmer full-screen background treatment
  - Home, Browse, Search, Storage, Trash, and Settings now share the same background language instead of feeling like separate unfinished screens
  - Browse explorer controls were upgraded with a cleaner control card, better current-folder framing, and a more deliberate list or grid toggle area
  - Search and Storage overview surfaces were redesigned to feel less like generic utilities and more like a polished mobile explorer companion
  - pinned entry points now use clearer icons and section hierarchy, making the dashboard easier to scan on a phone
- Known gaps:
  - final Play launch icon, store screenshots, and full listing art direction still need a dedicated store-assets pass
  - row-level and detail-level micro polish can still be improved after another phone testing round
  - legal URLs and final public privacy policy hosting still need to be completed before Play submission

### 2026-04-09 - Alpha 16 store readiness and safety pass
- Version target: `1.0.0-alpha16`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha16](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha16)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - permission-granted but workspace-missing states now read clearly instead of falling back to the wrong "grant access" language
  - destructive actions now ask for confirmation before moving files to Recycle Bin, deleting forever, or clearing saved trash metadata
  - file open/share failures now report explicit errors instead of failing silently when Android cannot resolve the item or action
  - Storage no longer gets stuck on an endless spinner when the summary is unavailable; it now offers a retry path
  - Settings trust surfaces now read more like a real product launch center, including current trust posture and support contact
  - cleartext network traffic is explicitly disabled in the Android manifest as a safer default posture
- Known gaps:
  - final public privacy policy URL and store-reviewed legal text still need to be published before Play submission
  - store iconography, screenshots, listing copy, and Play Console metadata still need a dedicated launch pack
  - broader multi-device QA is still required before calling the build Play-ready

### 2026-04-08 - Alpha 15 production polish and trust surfacing
- Version target: `1.0.0-alpha15`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha15](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha15)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - success and info banners now surface rename, move, copy, share, restore, and recycle-bin outcomes more clearly
  - Settings now exposes the exact installed version/build and reads more like a real product trust center
  - broken text encoding artifacts in explorer, search, storage, and onboarding copy were cleaned up
  - legal and trust dialogs were expanded so the app feels less like a raw alpha shell
- Known gaps:
  - a real store-reviewed privacy policy and final legal copy still need to be written before Play launch
  - visual polish is stronger, but the app still needs another pass on iconography, spacing consistency, and store assets
  - broader device-matrix testing is still required before calling the build Play-ready

### 2026-04-08 - Alpha 14 performance hardening
- Version target: `1.0.0-alpha14`
- Track target: GitHub prerelease testing
- Status: shipped on GitHub
- Release page: [Omnia Organizer 1.0.0-alpha14](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha14)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - Home now refreshes from a lightweight startup snapshot instead of depending on the full storage scan path
  - full storage summaries stay deferred until Storage is explicitly opened again
  - rename, copy, move, trash, restore, and folder-create flows now refresh only the surfaces that need updating
  - OOFM now detects reduced-device conditions and softens launch timing plus summary behavior for stability
- Known gaps:
  - large-folder rendering can still use another focused optimization pass after more phone testing
  - reduced-effects mode is practical but still needs a more polished visual language
  - Play policy, privacy copy, and store hardening still need a pre-launch pass

### 2026-04-08 - Alpha 13 first-run trust and onboarding
- Version target: `1.0.0-alpha13`
- Track target: GitHub prerelease testing
- Status: ready to ship
- Release page: [Omnia Organizer 1.0.0-alpha13](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha13)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - first install now has a real welcome, value, permission education, and disclosure flow
  - onboarding no longer forces account ideas into the core file-manager path
  - Settings now exposes privacy, data-use, terms/policy, and about trust surfaces
  - permission states now read more clearly as not requested, denied, limited, or ready
- Known gaps:
  - launch and scan responsiveness still need the next hardening pass
  - disclosure copy is implementation-ready product copy, not final store-reviewed legal text
  - device-tier and reduced-effects handling still need a performance release

### 2026-04-08 - Alpha 12 roadmap utility parity
- Version target: `1.0.0-alpha12`
- Track target: GitHub prerelease testing
- Status: ready to ship
- Release page: [Omnia Organizer 1.0.0-alpha12](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha12)
- Artifact expectation:
  - APK for direct phone install
  - AAB for Play handoff
- What changed:
  - Home now has a real storage summary card, new files, and pinned entry points for Downloads, Screenshots, Documents, and Recycle Bin
  - Search results now show clearer location context and can jump directly into Browse
  - Storage now supports tap-through category drill-ins instead of staying a passive summary screen
  - Recycle Bin layout now aligns more closely with the explorer surface language
- Known gaps:
  - onboarding and trust flow still need a dedicated first-run pass
  - storage summaries still need a lighter startup strategy on weaker devices
  - low-end device performance hardening is still the next release after trust

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
