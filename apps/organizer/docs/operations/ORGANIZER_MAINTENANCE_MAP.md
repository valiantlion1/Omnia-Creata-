# Organizer Maintenance Map

## Current product truth
OmniaOrganizer is a mobile-first Android file manager under active rewrite.

## Safe assumptions
- Product root stays `apps/organizer`.
- Android root stays `apps/organizer/mobile/android`.
- Canonical Phase 1 IA is `Home / Browse / Search / Storage`.
- `Recycle Bin` and `Settings` are secondary surfaces.
- MVP is local-first and Android-first.
- Cloud, AI, OCR, and document-suite features stay out of MVP.

## Current code risks
- `MainActivity.kt` still uses the wrong navigation model:
  `Capture / Library / Search / Tasks / Settings`
- Current domain models are task/item oriented instead of file/source oriented.
- Current Room entities mirror the wrong product identity.
- Current feature modules are placeholders, not real product slices.

## Operational caution
- Do not expand scope before the shell reset is done.
- Do not ship Play Console builds until file browsing, file actions, and Recycle Bin flows are real.
- Do not remove old Organizer docs until the new wiki and release pack are the accepted source of truth.

## Cleanup guidance
- Safe to delete generated Android build output under Organizer when not needed.
- Not safe to blindly delete historical planning docs without confirming they are fully superseded.
