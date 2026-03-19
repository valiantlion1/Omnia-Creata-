# SOURCE_CAPABILITY_MATRIX.md - Source and Capability Rules

## Purpose
Prevent unsafe desktop file-manager assumptions by defining what each source
can actually do on mobile.

## Capability legend
- Browse: can list and traverse
- Search: can appear in indexed search
- Rename: can rename in place
- MoveWithin: can move inside the same source
- MoveAcross: can move to a different source
- Delete: can remove from active storage
- Trash: can support recycle-bin style recovery
- Preview: can preview supported content
- Index: can be metadata-indexed

## Matrix

| Source | Browse | Search | Rename | MoveWithin | MoveAcross | Delete | Trash | Preview | Index | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| MediaStore collections | Yes | Yes | Limited | Limited | Limited | Yes | App-defined fallback | Yes | Yes | Strong for media and common documents, but path semantics vary by Android version |
| SAF tree grant | Yes | Yes | Usually | Usually | Copy then delete | Usually | Source-dependent | Yes | Yes | Best general-purpose user-approved access model |
| SAF single document | No folder browse | Limited | Limited | No | Copy only | Limited | No | Yes | Limited | Treat as isolated file handle, not a browse root |
| SD card via SAF | Yes | Yes | Usually | Usually | Copy then delete | Usually | Source-dependent | Yes | Yes | Performance and reliability vary by device/vendor |
| USB OTG via SAF | Yes | Optional | Limited | Limited | Copy then delete | Limited | No by default | Yes | Limited | Do not assume stable long-lived handles |
| App-private cache/storage | Internal only | No user-facing search | Yes | Yes | Export only | Yes | App policy | Internal | No | Never present as user filesystem |
| Future network source | Later | Later | Later | Later | Later | Later | Later | Later | Later | Phase 3+ only |
| Future cloud source | Later | Later | Later | Later | Later | Later | Provider-specific | Later | Later | Phase 4+ only |

## Canonical policy notes
- If `Trash` is not supported, destructive delete must explicitly say it is
  permanent.
- Cross-source move is not a true move by default. Treat it as copy then
  verified delete.
- Search only indexes sources with stable enough handles and battery-safe
  scan patterns.
- Preview support does not imply edit support.
- Source capability must be queried before showing an action button.

## UI behavior rules
- Disable unsupported actions instead of failing silently.
- When capability is partial, explain the limitation in plain language.
- Never present one generic action sheet for every source if the available
  actions differ materially.
