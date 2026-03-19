# SEARCH_INDEXING_SPEC.md - Search and Indexing Rules

## Purpose
Define a fast, practical, battery-aware search model for a mobile file manager.

## Search principles
- search must feel immediate
- search is metadata-first in early phases
- index only what the app can justify and maintain
- no semantic search in early phases

## Phase 1 search scope

### Searchable fields
- file name
- folder name where applicable
- extension
- mime/category
- date buckets
- size buckets
- favorite / recent markers

### Filters
- type
- date
- size
- source when useful

### Result actions
- open
- preview
- show in folder
- open source location

## Phase 2 search extensions
- smart views as pre-filtered search surfaces
- storage-intelligence entry points
- richer media grouping

## What is not indexed early
- full document content
- OCR text
- image embeddings
- AI labels
- network or cloud content

## Index creation triggers
- first grant of a stable source
- explicit refresh action
- background maintenance windows
- on-demand indexing for newly discovered folders when justified

## Background rules
- do not full-scan the device at cold start
- schedule work responsibly
- throttle rescans
- prefer incremental updates where platform signals allow

## Freshness rules
- search results should favor recently touched metadata
- stale entries must be removable or revalidated
- deleted or inaccessible content must leave the index promptly enough to
  preserve trust

## Query behavior
- typing should update quickly
- zero-result states should suggest filters, categories, or permission review
- do not build an advanced power-query language in Phase 1

## Reliability rules
- if a source is no longer available, explain that clearly
- if a result cannot be opened, offer show-source or retry behavior when
  possible
- never present placeholder search results
