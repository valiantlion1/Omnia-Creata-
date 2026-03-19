# TECH_CONSTRAINTS.md — OmniaOrganizer

## Product-side technical constraints
- Android-first
- local-first
- modular architecture
- battery-aware
- privacy-first

---

## Storage model expectations
The app must respect modern Android storage realities.

### Required concepts
- MediaStore
- Storage Access Framework (SAF)
- scoped storage behavior
- Android version differences for storage access
- URI-based access where appropriate
- no desktop-like assumptions about unrestricted file paths

### Forbidden assumptions
- unrestricted full filesystem access everywhere
- root-dependent workflows
- unsafe background scanning of everything all the time

---

## Recommended stack direction
- Kotlin
- Jetpack Compose
- Room
- WorkManager
- ViewModel-based screen state
- modular package/module separation

---

## Performance constraints
- must behave reasonably on mid-range Android devices
- avoid heavy background indexing on app start
- thumbnail generation must be cached
- search should be indexed where reasonable
- avoid expensive repeated file scans

---

## Battery constraints
- no aggressive always-on scanning
- background work must be scheduled responsibly
- avoid pointless wakeups / repeated scans

---

## Phase constraints
### Phase 1
Allowed:
- local file browsing
- file actions
- search core
- recycle bin
- basic storage summary

Forbidden:
- cloud sync
- OCR
- semantic search
- AI
- heavy document processing
- advanced network access

### Phase 2
Allowed:
- media layer
- storage analyzer
- cleanup engine
- rule-based suggestions

Still forbidden:
- AI
- cloud sync
- OCR
- enterprise workflows

---

## UX-linked technical constraints
- UI must stay fast under large lists
- multi-select must be stable
- navigation must survive process recreation sensibly
- destructive actions must not rely on fragile transient state

---

## Reliability constraints
- never mark a feature complete if it only works in demo/happy path
- avoid fake stubs presented as real features
- if a feature is partial, expose it as partial or keep it out
