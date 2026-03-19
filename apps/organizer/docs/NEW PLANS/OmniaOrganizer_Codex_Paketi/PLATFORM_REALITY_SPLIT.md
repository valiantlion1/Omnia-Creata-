# PLATFORM_REALITY_SPLIT.md - Android and iOS Reality Split

## Purpose
Keep mobile-first planning grounded in platform reality instead of assuming
Android and iOS can ship the same file-manager behavior at the same time.

## Canonical release rule
- Android is the implementation-first platform
- iOS is a planned parity surface
- parity means aligned user value, not identical filesystem power

## Android reality

### Strengths
- MediaStore for common media/content categories
- SAF for user-granted folder and document access
- more flexible local file workflows
- better fit for power-user file operations

### Constraints
- scoped storage rules
- vendor inconsistencies
- no assumption of unrestricted raw filesystem access
- URI-based workflows must be respected

### Canonical Android Phase 1
- real Browse
- real file actions on supported sources
- real Search core
- Recycle Bin model
- Storage summary

## iOS reality

### Strengths
- polished Files-like browse patterns
- strong preview and document handling
- security-scoped access model
- good recents/favorites mental model

### Constraints
- sandbox-first model
- no Android-style broad filesystem traversal
- folder and document access depend on user-granted providers and handles
- limited background indexing expectations

### Canonical iOS Phase 1 parity target
- recents and favorites
- document picker / Files provider entry
- preview and safe actions on granted files
- basic search across granted/known items
- lightweight storage-facing guidance where platform allows

### Not expected in early iOS parity
- Android-level broad browse power
- identical storage analytics depth
- aggressive background indexing

## Cross-platform parity rules
- same product identity
- same safety rules
- same grounded utility tone
- different capability surfaces where platform rules differ

## Planning rule
Do not block Android Phase 1 waiting for perfect iOS parity.
Do not promise iOS features that require unsupported filesystem reach.
