# ACCEPTANCE_CRITERIA.md — OmniaOrganizer

## Global principle
A phase is complete only when:
- main user flows work
- the product identity remains intact
- scope boundaries are respected
- the build is stable enough to hand off

---

## Phase 0 acceptance
- project structure exists
- core architecture choices are applied
- design system basics exist
- navigation foundation is ready
- app builds successfully

---

## Phase 1 acceptance
### Functional
- Home works
- Browse works
- Search works
- Storage works
- Recycle Bin works
- core file actions work

### UX
- navigation is coherent
- no screen feels obviously cluttered
- selection mode is usable
- delete flows are understandable

### Stability
- no obvious crash on main file flows
- no fake placeholder presented as real feature
- no forbidden features from later phases included

---

## Phase 2 acceptance
- media layer works
- storage analyzer produces useful output
- cleanup logic is rule-based and understandable
- smart views are useful and not gimmicky
- still no AI leakage

---

## Failure conditions
A phase is not accepted if:
- product identity drifts
- scope expands without permission
- UI becomes cluttered
- destructive behavior feels unsafe
- a later-phase feature appears prematurely
