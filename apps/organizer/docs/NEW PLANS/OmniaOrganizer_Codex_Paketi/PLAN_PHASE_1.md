# PLAN_PHASE_1.md — Core File System

## Phase name
Phase 1 — Core File System

## Goal
Build the first real usable version of OmniaOrganizer as a powerful but understandable local file system app.

This phase must prove:
- the app can browse local storage clearly
- the user can safely perform core file actions
- search is useful and fast
- the app already feels more trustworthy than a basic file manager

---

## Product outcome
At the end of Phase 1, the user should be able to:
- open the app
- browse local folders and files
- switch between key file views
- select one or many items
- copy / move / rename / delete / share files
- see recent files and new files
- search files by name and filter by basic properties
- restore deleted files from Recycle Bin

This phase should feel stable, clear, and strong.
It should **not** try to be smart, cloud-heavy, or document-heavy yet.

---

## Core screens in this phase
1. Home
2. Browse
3. Search
4. Storage
5. Recycle Bin
6. Basic Settings

---

## In scope modules

### 1. File Browser
- folder navigation
- list/grid toggle
- breadcrumb/path display
- sort options
- filter options
- folder creation

### 2. File Actions
- select single item
- multi-select
- copy
- move
- rename
- delete to Recycle Bin
- share
- basic file details

### 3. Search Core
- file/folder name search
- real-time filtering
- type filters
- date filter
- size filter

### 4. Safety Layer
- Recycle Bin
- restore from Recycle Bin
- permanent delete from Recycle Bin
- undo-friendly flows where practical

### 5. Home Summary (basic)
- recent files
- new files
- pinned/favorite entry points
- shortcuts to key areas

### 6. Storage Summary (basic)
- total usage overview
- type-based breakdown (images, video, audio, docs, archives, others)
- top large files entry point

---

## Explicitly out of scope
The following are **not** part of Phase 1:
- AI of any kind
- OCR
- semantic search
- cloud connectors
- backup/sync
- PDF editing
- document annotation
- network/NAS/FTP/SFTP access
- advanced duplicate detection
- privacy vault
- biometric locking
- advanced media organizer features
- converter tools

---

## UX requirements

### Home
Should feel like a calm control panel, not a dashboard circus.
Must show:
- recent files
- new files
- quick links to Browse, Search, Storage, Recycle Bin

### Browse
Must be the strongest screen in this phase.
Must support:
- clear folder traversal
- stable multi-select
- visible current path
- action bar for file actions

### Search
Must be practical, not “smart”.
Must let the user:
- type and narrow quickly
- filter by type/date/size
- jump to result location

### Storage
Must be simple and visual.
The goal is not deep intelligence yet.
The goal is:
- show where space goes
- offer entry points into large files and major categories

### Recycle Bin
Must be easy to understand.
No hidden destructive behavior.

---

## Technical expectations
- local-first only
- respect modern Android storage constraints
- modular architecture
- no fake placeholders pretending to work
- stable Room/database model for index/cache where needed
- background work should be minimal and battery-aware

---

## Acceptance criteria

### Functional
- user can browse local files and folders
- user can perform file actions safely
- search returns valid results
- deleted items go to Recycle Bin
- Recycle Bin supports restore and permanent delete
- Storage screen shows meaningful local summary

### UX
- navigation is coherent
- no screen feels overcrowded
- multi-select is reliable
- dangerous actions are understandable
- empty and loading states exist

### Stability
- app builds cleanly
- no obvious crash in main flows
- no broken navigation loops
- no phase-2 or later features leaking in

---

## Definition of done
Phase 1 is done only when:
- all 6 core screens exist and work
- file actions work in real flows
- search works on actual local content
- Recycle Bin works safely
- Storage summary works
- UX is clean enough to show as a serious prototype / early app foundation

---

## Handoff note
After Phase 1, the next allowed move is Phase 2:
Media + Storage Intelligence.

Do not skip directly to:
- cloud
- PDF suite
- AI
- enterprise tools
