# RISK_REGISTER.md - Key Product and Delivery Risks

## Purpose
Name the main risks early so planning does not confuse ambition with control.

## Risk list

### 1. Product identity drift
Risk:
- the app becomes half file manager, half PDF app, half cloud drive

Mitigation:
- enforce phase boundaries
- use the feature matrix
- reject unrelated "nice to have" additions

### 2. File loss or unsafe delete
Risk:
- user trust collapses if destructive flows are unclear or irreversible

Mitigation:
- recycle bin first
- explicit permanent-delete confirmation
- operation summaries and partial-success feedback

### 3. Android storage reality mismatch
Risk:
- product promises desktop-like control that scoped storage cannot safely
  guarantee

Mitigation:
- source capability matrix
- MediaStore + SAF-first design
- clear per-source action availability

### 4. Performance collapse on large libraries
Risk:
- the app works on demos but fails on real devices with large content sets

Mitigation:
- performance budget
- indexed metadata strategy
- lazy thumbnail loading
- battery-aware background work

### 5. Navigation drift
Risk:
- designs, docs, and code adopt different primary navigation models

Mitigation:
- lock canonical IA
- do not promote speculative tabs early

### 6. Cloud or document creep
Risk:
- later-phase modules enter early implementation and bloat the product

Mitigation:
- Phase 1 and Phase 2 plans remain explicit
- cloud and document tooling stay later by default

### 7. Fake feature completion
Risk:
- placeholders or happy-path demos get treated as finished product work

Mitigation:
- acceptance criteria
- no fake placeholder rule
- real-source validation

### 8. iOS parity confusion
Risk:
- planning assumes Android and iOS storage reach are equivalent

Mitigation:
- platform reality split
- Android-first delivery
- parity defined by user value, not identical power
