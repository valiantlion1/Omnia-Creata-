# PLAN_PHASE_0.md - Foundation / System Base

## Phase name
Phase 0 - Foundation / System Base

## Goal
Create a stable implementation base for OmniaOrganizer before real file
management flows are built.

Phase 0 exists to prevent Phase 1 from being built on top of placeholder
navigation, wrong domain models, or storage assumptions that break on real
devices.

## Product outcome
At the end of Phase 0, the project should have:
- a stable Android app shell
- a canonical navigation foundation
- a phase-correct design system baseline
- a file-centric domain direction
- a storage access abstraction that respects Android rules
- a lightweight index/cache foundation
- testing and validation hooks ready for Phase 1 work

This phase should not pretend that real file browsing is done.

## Repo touchpoints
Primary product root:
- `apps/organizer`

Primary Android surface:
- `apps/organizer/mobile/android`

Foundation modules that may be kept and reshaped:
- `:app`
- `:core:domain`
- `:core:data`
- `:core:ui`
- `:core:design`

Modules that may be renamed or replaced during the reset:
- task-oriented or capture-oriented feature modules

## In scope

### 1. App shell and navigation foundation
- define canonical Phase 1 navigation
- replace wrong placeholder destinations
- set up stable screen state containers
- ensure process recreation does not break primary navigation

### 2. Design system baseline
- typography scale
- color system
- spacing scale
- bottom navigation rules
- list/grid patterns
- bottom sheet and dialog patterns
- empty/loading/error state patterns

### 3. File-centric domain reset
- replace task/note mental model with file/folder/source mental model
- define core entities and responsibilities
- define virtual collections vs real filesystem nodes

### 4. Storage access foundation
- MediaStore entry strategy
- SAF tree/document access strategy
- URI-based operation assumptions
- permission orchestration
- source capability tracking

### 5. Data/index/cache foundation
- Room schema direction for index/cache/support tables
- thumbnail cache strategy
- background work rules
- operation history and trash support direction

### 6. Quality foundation
- validation commands
- phase-safe done definition
- no-fake-placeholder rule

## Explicitly out of scope
- real cleanup intelligence
- deep storage insights
- cloud connectors
- PDF tools
- OCR
- AI
- NAS or network access
- full media experience

## Technical expectations
- Android-first
- Kotlin + Compose
- Room for local support data where justified
- WorkManager only for battery-aware scheduled work
- no aggressive full-device scanning at app start
- no root assumptions

## Deliverables
- canonical navigation map exists in docs and app shell
- domain model docs exist and match implementation direction
- source capability matrix exists
- safety model for delete/trash exists
- app builds with the new shell and module direction

## Validation
Suggested commands:
- `./gradlew.bat :app:assembleDebug`
- `./gradlew.bat test`
- `./gradlew.bat lint`

## Acceptance criteria
- the product root and module plan are stable
- wrong task/note identity is removed from planning direction
- app shell can host Phase 1 screens cleanly
- storage assumptions are aligned with scoped storage reality
- no Phase 1 screen claims real functionality before the underlying
  foundation exists

## Definition of done
Phase 0 is done only when:
- the shell is stable
- the domain direction is file-centric
- the storage model is realistic
- the design system is implementation-ready
- the project can move into Phase 1 without another planning reset
