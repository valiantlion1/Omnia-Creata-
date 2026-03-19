# SCREEN_BEHAVIOR.md — Phase 1

## Navigation structure
Recommended main navigation for Phase 1:
- Home
- Browse
- Search
- Storage

Secondary access:
- Recycle Bin
- Settings

Recycle Bin can live inside Home shortcut, Browse overflow, or Storage tools area.
It does not need to be in main bottom navigation if that makes the nav heavy.

---

## 1. Home

### Purpose
The user lands here to understand the current state of their storage and quickly jump into useful areas.

### Must show
- recent files
- new files
- quick shortcuts:
  - Browse
  - Search
  - Storage
  - Recycle Bin
- optional light storage summary card

### Must not become
- a noisy dashboard
- a widget graveyard
- a fake AI screen

### Interaction
- tapping a recent file opens or previews it
- tapping a shortcut navigates instantly
- long press is not the primary interaction here

---

## 2. Browse

### Purpose
The main operational screen for navigating and managing files.

### Must show
- current path / breadcrumb
- file and folder list
- sort/filter access
- list/grid option
- selection state when active

### Core interactions
- tap folder -> open folder
- tap file -> open/preview or show supported action
- long press item -> enter selection mode
- multi-select available
- top/bottom action bar for selected items

### Selection mode actions
- copy
- move
- rename
- delete
- share
- details

### Must not become
- overloaded utility panel
- cloud-first browser
- advanced media/gallery screen

---

## 3. Search

### Purpose
The user comes here to find files fast without digging through folders.

### Must show
- search input
- recent searches (optional if simple)
- filters:
  - type
  - date
  - size
- results list

### Core interactions
- typing updates results quickly
- tapping result opens item or location
- optional action: “show in folder”

### Must not become
- semantic search
- AI assistant
- full advanced query builder in Phase 1

---

## 4. Storage

### Purpose
Show where the device storage is going in a simple, useful way.

### Must show
- total used/free space
- category breakdown
- entry points:
  - images
  - videos
  - audio
  - documents
  - archives
  - others
- large files shortcut

### Core interactions
- tapping category drills into filtered file list
- tapping large files opens large-file view/list

### Must not become
- deep cleanup intelligence page yet
- settings page in disguise
- overwhelming analytics wall

---

## 5. Recycle Bin

### Purpose
Make deletion safe and reversible.

### Must show
- deleted items
- deleted date if available
- restore action
- permanent delete action
- optional empty-bin action with clear warning

### Core interactions
- select items
- restore selected
- permanently delete selected
- confirm destructive actions

### Must not become
- hidden system area
- permanently destructive by default

---

## 6. Settings (basic)

### Purpose
Only basic controls needed in Phase 1.

### May include
- default view mode
- sort preferences
- basic storage scan behavior
- theme if available
- help/about

### Must not include
- giant expert settings wall
- cloud account settings
- AI options
- document suite options

---

## Global interaction rules

### Long press
- enters selection mode in list-based file contexts

### Swipe
- optional, but avoid if it complicates clarity
- not required in Phase 1

### FAB
- avoid unless there is a very clear reason
- Phase 1 can work without FAB

### Bottom sheet
Use sparingly for:
- item actions
- sort/filter options
- details preview
Do not hide critical flows behind too many sheets.

### Confirmation logic
- delete -> goes to Recycle Bin
- permanent delete -> explicit confirmation
- large multi-item destructive actions -> always clear confirmation

### Empty states
Every major screen should have a designed empty state:
- no recent files
- empty folder
- no search results
- empty recycle bin

### Loading states
Keep lightweight:
- skeletons or simple loading indicators
- avoid heavy, theatrical loading screens

---

## Design tone
The app should feel:
- clean
- quiet
- capable
- trustworthy

It should not feel:
- toy-like
- cluttered
- enterprise-heavy
- over-designed
