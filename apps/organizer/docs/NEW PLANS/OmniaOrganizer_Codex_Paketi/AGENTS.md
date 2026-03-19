# AGENTS.md — OmniaOrganizer

## Product identity
OmniaOrganizer is **not** a simple file manager.
It is a **local-first, modular, control-centric personal storage system**.

The product must not drift into:
- a PDF-first app
- a cloud-first drive app
- a gallery-only app
- a toolbox full of unrelated utilities

Core identity:
- strong file core
- strong media/storage layer
- clear safety and privacy layer
- cloud as extension, not center
- AI only after the non-AI system proves itself

---

## Non-negotiable rules
1. **Local-first is mandatory.**
2. **Phase boundaries are mandatory.**
3. **Do not add features from future phases into the current task.**
4. **Do not turn the app into File Commander-style feature clutter.**
5. **Do not turn the app into a PDF editor product.**
6. **Do not make cloud the primary workflow.**
7. **AI is forbidden in early phases.**
8. **Rule-based intelligence comes before AI.**
9. **Destructive actions must always be safe.**
10. **Recycle Bin must exist before permanent delete flows are trusted.**

---

## UX rules
- The UI should feel simple, modern, calm, and strong.
- Prefer clarity over cleverness.
- Avoid overcrowded screens.
- Avoid settings-heavy interaction.
- The app should feel closer to:
  - Google Files in clarity
  - Apple Files in navigation discipline
  - Solid Explorer/CX in power
- The app should **not** feel like:
  - a feature dump
  - a legacy Android utility
  - an office suite

### UX behavior expectations
- Long press enters selection mode
- Multi-select must be first-class
- Primary navigation must stay consistent
- Dangerous actions require clear confirmation or safe fallback
- Empty states must be intentional, not blank
- Loading states must feel lightweight
- Search must be fast and practical

---

## Engineering rules
- Use modular architecture
- Keep core features separated from optional modules
- Prefer maintainable implementations over flashy hacks
- Avoid root-dependent features
- Avoid assumptions that break modern Android storage rules
- Build Phase 1 and Phase 2 as clean, stable foundations for later layers

---

## Current implementation priority
### Allowed now
- Foundation setup
- Core file browser
- File actions
- Search core
- Recycle Bin
- Media/storage analysis basics
- Rule-based smart views and suggestions

### Forbidden now
- AI classification
- AI search
- semantic search
- OCR
- PDF editing suite
- cloud sync engine
- advanced document suite
- deep enterprise workflows

---

## Done criteria
A task is not done just because code exists.

A task is done only if:
- it builds
- it runs
- the main flow works
- it respects current phase boundaries
- it does not break UX clarity
- it does not introduce obvious performance regressions
- it does not violate product identity

---

## Working style for Codex
Before coding:
1. restate the task in product terms
2. identify the current phase
3. list what is explicitly in scope
4. list what is explicitly out of scope
5. implement only what belongs to the current phase

Never silently expand scope.
Never invent product direction.
Never add “nice-to-have” features from later phases.

When uncertain, choose:
- simpler structure
- safer delete behavior
- cleaner navigation
- more modular code
