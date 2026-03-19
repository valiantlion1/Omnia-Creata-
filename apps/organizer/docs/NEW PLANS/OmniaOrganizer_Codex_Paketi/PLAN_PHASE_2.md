# PLAN_PHASE_2.md - Media and Storage Intelligence

## Phase name
Phase 2 - Media and Storage Intelligence

## Goal
Turn OmniaOrganizer from a capable local file manager into a clearly smarter
control system without using AI.

## Product outcome
At the end of Phase 2, the user should be able to:
- inspect media in useful phone-native ways
- understand where storage space is going
- review cleanup suggestions safely
- use smart views such as large files, downloads, screenshots, and low
  activity folders
- feel that the app is intelligent even before any AI layer exists

## Core screens in this phase
1. Media
2. Storage Insights
3. Cleanup Review
4. Smart Views
5. Phase-2 Home refinements

## In scope modules

### 1. Media layer
- photo browsing
- video preview/playback
- date-based grouping
- folder-based media view
- category-based media view

### 2. Storage analyzer
- used/free summary
- type-based space breakdown
- large files
- old files
- empty folders where reliable
- low-activity folders where reliable

### 3. Cleanup engine
- rule-based duplicate-like detection
- stale download suggestions
- screenshot density suggestions
- old APK/ZIP/temp suggestions where source rules allow
- safety-first cleanup review flow

### 4. Smart views
- recents
- favorites
- large files
- screenshots
- downloads
- media collections
- low-activity folders

### 5. Rule-based suggestions
- move suggestions
- cleanup suggestions
- space warning suggestions
- source-aware guidance

## Explicitly out of scope
- AI classification
- semantic search
- OCR
- cloud sync
- PDF editing suite
- advanced network access

## UX requirements
- no scary cleanup automation
- every cleanup suggestion explains why it exists
- every destructive cleanup action stays human-approved
- media views must still feel like part of the same product, not a separate
  gallery app
- storage insights must be useful, not decorative analytics

## Technical expectations
- keep indexing battery-aware
- reuse Phase 1 source constraints
- cleanup logic must be rules-first and inspectable
- duplicate-like logic must prefer false-negative over unsafe false-positive
- no hidden background work that surprises the user

## Acceptance criteria

### Functional
- media preview works for supported local content
- storage analyzer gives meaningful summaries
- cleanup review lists are actionable
- smart views are useful on real device content

### UX
- Phase 1 clarity is preserved
- no screen becomes a dashboard circus
- cleanup flows feel safe and reversible where possible

### Stability
- no Phase 3+ features leak into this phase
- no AI language or AI dependencies appear
- background work remains battery-aware

## Definition of done
Phase 2 is done only when:
- users can explain why the app feels smarter
- the intelligence layer is rule-based and visible
- cleanup flows are safe enough to trust
- media and storage insights strengthen the file core instead of replacing it
