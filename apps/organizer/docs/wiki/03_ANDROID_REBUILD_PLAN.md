# Android Rebuild Plan

## Current code reality
The Android stack is usable, but the product identity inside it is wrong.

Current issues:
- navigation still reflects `Capture / Library / Search / Tasks / Settings`
- domain models are task/item oriented
- Room schema is task/item oriented
- feature modules are mostly placeholders

## Keep
- `apps/organizer/mobile/android`
- Compose + Material 3
- Hilt setup
- Room as support-data storage where justified
- `:core:ui`
- `:core:design`
- `:core:domain`
- `:core:data`

## Rewrite
- `app/src/main/java/com/omnia/organizer/MainActivity.kt`
- all current placeholder screens
- domain models in `:core:domain`
- Room entities and repositories in `:core:data`
- navigation destinations
- permission orchestration
- search indexing model

## Delete
- capture-oriented feature logic
- task-oriented feature logic
- note/task mental model from Organizer Android code

## Later
- cloud layers
- AI
- OCR
- document suite
- iOS app code

## Target Android module direction

### Keep core modules
- `:core:domain`
- `:core:data`
- `:core:ui`
- `:core:design`

### Replace feature direction
Current:
- `:feature:capture`
- `:feature:library`
- `:feature:search`
- `:feature:tasks`
- `:feature:settings`

Target:
- `:feature:home`
- `:feature:browse`
- `:feature:search`
- `:feature:storage`
- `:feature:settings`
- `:feature:trash`

## Build order
1. rewrite app navigation shell
2. define file-centric domain models
3. replace Room support schema
4. implement permissions and source abstraction
5. implement Browse
6. implement file actions
7. implement Search
8. implement Storage
9. implement Recycle Bin
10. polish states and release build path

## Current file targets

### First rewrite targets
- [MainActivity.kt](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/mobile/android/app/src/main/java/com/omnia/organizer/MainActivity.kt)
- [Models.kt](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/mobile/android/core/domain/src/main/java/com/omnia/organizer/core/domain/model/Models.kt)
- [Entities.kt](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/mobile/android/core/data/src/main/java/com/omnia/organizer/core/data/db/Entities.kt)
- current screen files under `app/src/main/java/com/omnia/organizer/ui/screens`

### Stable product docs backing this rewrite
- [NAVIGATION_IA.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/docs/NEW%20PLANS/OmniaOrganizer_Codex_Paketi/NAVIGATION_IA.md)
- [DOMAIN_MODEL.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/docs/NEW%20PLANS/OmniaOrganizer_Codex_Paketi/DOMAIN_MODEL.md)
- [SOURCE_CAPABILITY_MATRIX.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/docs/NEW%20PLANS/OmniaOrganizer_Codex_Paketi/SOURCE_CAPABILITY_MATRIX.md)
- [FILE_OPERATION_SAFETY.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/docs/NEW%20PLANS/OmniaOrganizer_Codex_Paketi/FILE_OPERATION_SAFETY.md)

## Shipping rule
Do not start Phase 2 intelligence work until Phase 1 Browse, Search, Storage, and Recycle Bin flows are real on a device.
