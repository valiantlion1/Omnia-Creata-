# MVP And Sprints

## MVP definition
The MVP is a serious Android phone file manager.

The MVP must let a user:
- browse local files and folders
- search files by name with useful filters
- multi-select files
- move, copy, rename, share, and delete files
- restore deleted files from Recycle Bin
- understand basic storage usage

## MVP screens
- Home
- Browse
- Search
- Storage
- Recycle Bin
- Settings

## MVP must-have capabilities
- Android-first local file access
- MediaStore + SAF aware behavior
- list and grid browsing
- breadcrumb or visible current path
- multi-select action mode
- basic file detail
- recent files
- new files
- large files entry point
- empty, loading, error, and permission states

## MVP explicitly out
- AI
- OCR
- semantic search
- cloud sync
- backup
- PDF editing
- NAS / SMB / FTP / SFTP
- privacy vault
- biometric lock
- advanced duplicate detection
- web app
- desktop app

## Sprint plan

### Sprint 0 - Reset the product base
Goal:
- remove old capture/task DNA
- lock Phase 1 navigation and domain

Deliver:
- `Home / Browse / Search / Storage` shell
- secondary `Recycle Bin / Settings`
- file-centric module map
- design system baseline

### Sprint 1 - Real local browsing
Goal:
- make Browse real

Deliver:
- folder traversal
- file/folder rows and grid
- sort/filter sheet
- path display
- basic file detail
- safe permission flow

### Sprint 2 - Core actions and trust
Goal:
- make the app operational

Deliver:
- multi-select
- move
- copy
- rename
- share
- delete to Recycle Bin
- restore and permanent delete

### Sprint 3 - Search and storage summary
Goal:
- make the app useful without folder digging

Deliver:
- file name search
- type/date/size filters
- recent files
- storage breakdown
- large files entry point

### Sprint 4 - Alpha shipping pass
Goal:
- produce the first installable build worth testing on device

Deliver:
- polished empty/loading/error states
- permissions edge cases
- release notes draft
- GitHub artifact build flow
- internal testing checklist

## Phase roadmap after MVP

### Phase 2
- media previews
- cleanup review
- smart views
- rule-based storage intelligence

### Phase 3
- privacy layer
- SD / USB refinement
- broader source support
- possible iOS planning once Android truth is stable

## Release mindset
Do not wait for a perfect giant launch.

Ship like this:
1. internal artifact
2. internal Play track
3. closed testing
4. first public launch
5. update-driven growth
