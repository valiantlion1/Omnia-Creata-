# Product And Naming

## Product summary
OmniaOrganizer is a local-first mobile file manager for phones.

It is built for users who:
- lose files in Downloads, Screenshots, PDFs, APKs, videos, and shared media
- want real file control on phone
- need fast search and safe cleanup
- do not want a bloated cloud-first tool

## What the app is
- Android-first file manager
- personal storage control app
- utility-first product with premium but grounded UX

## What the app is not
- cloud drive
- PDF suite
- AI assistant
- desktop file browser forced into mobile
- sci-fi dashboard

## Naming research for Play Store
Quick Play Store-oriented checks on 2026-04-08 show a crowded generic naming field:
- [Files by Google](https://play.google.com/store/apps/details?id=com.google.android.apps.nbu.files)
- [File Manager - XFolder](https://play.google.com/store/apps/details?id=files.fileexplorer.filemanager)
- [File Commander Manager & Vault](https://play.google.com/store/apps/details?id=com.mobisystems.fileman)
- [Omnia Music Player](https://play.google.com/store/apps/details?id=com.rhmsoft.omnia)

Implications:
- `File Manager` alone is too generic.
- `Organizer` alone is too broad and weak for store discovery.
- `Omnia` alone is already used by other Android apps, so it is not a distinctive standalone product anchor.
- Quick search did not surface an obvious exact Play Store listing for `Omnia Organizer`, which is good, but that is not the same as legal clearance.

## Naming decision
Use two layers:

### Internal and repo identity
- `OmniaOrganizer`

### Play Store display strategy
- `Omnia Organizer: File Manager`

Why:
- keeps your Omnia brand root
- tells Play Store users exactly what the app does
- stays closer to search intent than a vague brand-only name

## Secondary naming options
Use only if store testing or branding later demands a change:
1. `Omnia Files`
2. `Omnia File Manager`
3. `Omnia Storage`

## Names to avoid
- `Organizer`
- `Smart Organizer`
- `File Manager`
- `Omnia`
- `Omnia Vault` for MVP

## Current product identity recommendation
- Repo root: `apps/organizer`
- Package name: `com.omnia.organizer`
- Product short name in UI: `OmniaOrganizer`
- Store name at launch: `Omnia Organizer: File Manager`

## ASO direction for MVP
Focus store text around:
- file manager
- file organizer
- phone storage
- downloads
- screenshots
- documents
- search files
- large files
- recycle bin
