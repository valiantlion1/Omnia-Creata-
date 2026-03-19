# FILE_OPERATION_SAFETY.md - Safe File Operations

## Purpose
Make trust a built-in product behavior, not a later polish pass.

## Safety principles
- destructive actions must be understandable
- delete should prefer trash over permanent removal
- cross-source operations must report partial failure clearly
- the UI must never imply success before the platform confirms it

## Operation rules

### Rename
- validate target name before commit
- preserve extension unless the user explicitly changes it
- if name collision exists, present clear options:
  - replace if safe and explicit
  - keep both with generated suffix
  - cancel

### Copy
- copy is non-destructive
- show progress for long operations
- verify destination write success before reporting completion
- if partial copy occurs in a multi-select action, report item-level results

### Move
- same-source move may use native move semantics
- cross-source move is treated as:
  1. copy
  2. verify destination
  3. remove source if allowed
- if delete fails after copy, surface the result as "copied, source still
  remains"

### Delete
- default delete path goes to Recycle Bin when supported
- if the source cannot support trash-like recovery, require explicit
  permanent-delete confirmation
- bulk delete must summarize count, total size when available, and destination
  of deleted items

### Restore
- restore should return the item to its original location when still valid
- if the original location is unavailable, ask the user to choose a new target

### Permanent delete
- only available from Recycle Bin or explicit unsupported-trash flows
- must use strong confirmation wording
- do not hide this behind ambiguous icons alone

## Undo rules
- lightweight undo is allowed for recent local actions where feasible
- undo must never pretend to work if the source cannot reliably support it
- when undo is not reliable, prefer explicit Recycle Bin and restore flows

## Confirmation rules
- single-item delete to trash: lightweight confirmation allowed
- permanent delete: explicit confirmation required
- multi-item destructive action: explicit confirmation required
- delete of externally granted or limited-access content: explicit confirmation
  required

## History and feedback
- show clear success, partial success, or failure feedback
- use snackbars/toasts for short confirmations
- use operation summary screens or sheets for long-running or partial actions
- keep recent operation history where it helps recovery or trust

## Not allowed
- silent permanent delete
- claiming restore support where none exists
- destructive UI copy that hides the real outcome
