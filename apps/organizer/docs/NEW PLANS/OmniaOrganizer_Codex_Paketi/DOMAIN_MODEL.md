# DOMAIN_MODEL.md - Core Product Model

## Purpose
Define the canonical product entities so the app stops inheriting task/note
assumptions and becomes clearly file-centric.

## Modeling rules
- physical filesystem nodes and virtual product collections are different
- every destructive operation must know its source capabilities
- phase 1 models stay metadata-first
- content understanding stays out until later phases

## Core entities

### StorageSource
Represents where content comes from.

Examples:
- MediaStore collection
- SAF tree
- SAF single document
- SD card via SAF
- USB OTG via SAF
- future network source
- future cloud connector

Key fields:
- `sourceId`
- `sourceType`
- `displayName`
- `capabilities`
- `accessState`
- `isPrimary`

### AccessGrant
Represents the permission or persisted handle needed to use a source.

Key fields:
- `grantId`
- `sourceId`
- `grantType`
- `persisted`
- `grantedAt`
- `expiresAt`

### FolderNode
Represents a browsable folder-like container.

Key fields:
- `nodeId`
- `sourceId`
- `uri`
- `displayName`
- `parentNodeId`
- `isVirtual`
- `childCount`

### FileNode
Represents a file the app can list, preview, act on, or index.

Key fields:
- `nodeId`
- `sourceId`
- `uri`
- `displayName`
- `extension`
- `mimeType`
- `sizeBytes`
- `modifiedAt`
- `createdAt` when known
- `category`
- `previewKind`

### IndexEntry
Represents cached searchable metadata for a file or folder.

Key fields:
- `entryId`
- `nodeId`
- `sourceId`
- `normalizedName`
- `tokens`
- `category`
- `sizeBucket`
- `modifiedAt`
- `indexedAt`

### RecentEntry
Represents recently opened, shared, moved, or otherwise surfaced content.

Key fields:
- `nodeId`
- `reason`
- `timestamp`

### FavoriteEntry
Represents pinned files or folders.

Key fields:
- `nodeId`
- `kind`
- `createdAt`

### TrashEntry
Represents a file moved into an app-managed or source-managed trash state.

Key fields:
- `trashId`
- `originalNodeId`
- `sourceId`
- `trashedAt`
- `restoreTarget`
- `expiresAt`
- `deleteMode`

### StorageCategory
Represents the user-facing content grouping.

Examples:
- images
- videos
- audio
- documents
- archives
- downloads
- screenshots
- others

### CleanupSuggestion
Phase 2 entity for rule-based intelligence.

Key fields:
- `suggestionId`
- `suggestionType`
- `reason`
- `candidateNodeIds`
- `estimatedSavingsBytes`
- `confidence`

### OperationRecord
Represents user-visible history for sensitive actions.

Key fields:
- `operationId`
- `operationType`
- `sourceId`
- `targetNodeIds`
- `startedAt`
- `completedAt`
- `status`
- `reversible`

## Virtual collections vs physical nodes

### Virtual collections
- Recents
- Favorites
- Large Files
- Downloads
- Screenshots
- Cleanup Review

These are product views built from indexed metadata or rules.

### Physical nodes
- real folders
- real files
- real sources

These map to platform-backed storage locations.

## Phase boundaries

### Phase 1 models
- StorageSource
- AccessGrant
- FolderNode
- FileNode
- IndexEntry
- RecentEntry
- FavoriteEntry
- TrashEntry
- StorageCategory
- OperationRecord

### Phase 2 additions
- CleanupSuggestion
- richer media groupings
- low-activity or stale-content views

### Forbidden early
- semantic content embeddings
- AI classification labels
- OCR-driven extracted text
