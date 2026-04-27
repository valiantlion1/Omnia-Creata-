# OmniaPixels Product Lock

## Status

OmniaPixels was reset on 2026-04-26. Previous backend, archive, migration, and legacy implementation material was removed from the active product path. The new source of truth is this clean product root.

## One sentence

OmniaPixels is a local-first mobile photo editor and upscaler for selecting a photo, improving it on-device, comparing before/after, and exporting a clean copy.

## Non-negotiables

- Mobile-first Flutter app.
- Local-first editing and upscale posture.
- Real Omnia Creata logo asset from `design/brand`, not generated or redrawn.
- No inherited backend-first pipeline.
- No cloud dependency in the first publishable version.
- No auth, sync, credits, pricing, or AI platform copy until a later product decision explicitly adds it.

## First app surfaces

- Splash
- First-run photo access
- Gallery
- Editor
- Upscale compare
- Export/share
- Settings

## Done for first publishable candidate

- App opens cleanly on Android.
- Gallery/import flow exists.
- Manual edit controls work.
- 2x upscale path is honest and usable.
- Before/after comparison works.
- Export saves as a new file without damaging the original.
- Settings explains local processing and version.
- Release build, signing, privacy copy, Play Store listing, and device smoke are complete.
