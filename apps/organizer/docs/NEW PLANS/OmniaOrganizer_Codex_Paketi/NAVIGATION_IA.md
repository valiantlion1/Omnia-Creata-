# NAVIGATION_IA.md - Canonical Information Architecture

## Purpose
Lock one canonical mobile information architecture so planning, design, and
code do not drift into different products.

## Guiding rule
OmniaOrganizer is a grounded mobile file manager and personal storage control
system. Navigation must feel native, calm, and task-oriented.

It must not feel like:
- a dashboard circus
- a cloud drive
- a PDF app
- a creative asset browser
- a sci-fi control center

## Canonical Phase 1 IA

### Primary bottom navigation
1. Home
2. Browse
3. Search
4. Storage

### Secondary destinations
- Recycle Bin
- Settings
- File detail / preview
- Sort / filter sheets
- Multi-select action state

### Home
Purpose:
- orient the user
- expose recents/new files
- provide fast entry to Browse, Search, Storage, and Recycle Bin

Must include:
- recent files
- new files
- favorites or pinned entry point
- light storage summary
- shortcut cards

### Browse
Purpose:
- main operational screen

Must include:
- path or breadcrumb
- folder and file list
- sort and filter access
- list/grid toggle
- long press to selection mode

### Search
Purpose:
- fast file finding without folder digging

Must include:
- search field
- filter controls
- results list
- show-in-folder or open behavior

### Storage
Purpose:
- show where space goes
- expose large files and category drill-ins

Must include:
- used/free summary
- category breakdown
- large files entry point

### Recycle Bin
Purpose:
- safe delete recovery

Entry points:
- Home shortcut
- Browse overflow/tool area
- Storage tools area
- Settings if needed

## Phase 2 IA evolution

### Storage remains the main tab
Do not replace the Phase 1 Storage tab with a Cleanup tab before cleanup
logic is real.

Allowed Phase 2 evolution:
- Storage tab gains cleanup cards
- Storage tab may expose a Cleanup subview or segmented section
- Smart Views can appear on Home and Storage

### Recents remain a surface, not a primary tab
Default rule:
- Recents live on Home and inside smart views

Only promote Recents to a primary tab if real user evidence shows that it
beats Browse or Storage for primary navigation.

## Header rules
- show `OmniaOrganizer` as the product name in everyday product headers
- use `Omnia Creata` as parent brand only in splash, welcome, about, or
  subtle settings footer contexts

## Not allowed
- more than 4 primary tabs in Phase 1
- cleanup as a fake primary tab before the engine exists
- recents, cleanup, and storage all competing as top-level tabs at once
- dual navigation models across screens
