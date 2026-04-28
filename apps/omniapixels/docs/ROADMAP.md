# OmniaPixels Roadmap

Date: 2026-04-26

## Product target

OmniaPixels will become a polished local-first Android photo editor and upscaler. The first serious public path is not "full AI suite"; it is a fast, reliable, good-looking editor that can handle a real phone gallery, save clean copies, and improve over versioned releases.

## Development loop

Every release-test APK must follow the same loop:

1. Pick one product-quality theme.
2. Implement the smallest complete slice.
3. Run `flutter analyze`, `flutter test`, and `flutter build apk --release`.
4. Install the APK on the local Android emulator.
5. Verify at least splash, gallery, settings, and the changed surface by screenshot.
6. Upload a GitHub prerelease APK only after the emulator-visible build label matches the intended version.
7. Update release notes and the Obsidian OmniaPixels wiki.

## Version waves

### 0.3.x - performance and editor hardening

- Keep gallery access, thumbnail loading, editor sliders, crop/rotate preview, export, and share stable.
- Make Diagnostics useful enough to compare versions on a real phone.
- Do not add a real AI model until the basic editor is visibly smooth.

### 0.4.x - Android product readiness

- Permission flows must feel native and honest on Android 13+ and Android 14+.
- Export must be reliable across emulator and real device.
- Add privacy copy, signing discipline, and Play internal-test preparation.
- Add crash/error capture that stays local unless a later product decision changes that.

### 0.5.x - creator-grade editor depth

- Add manual crop handles, straighten, sharpen/noise/detail polish, history review, and stronger preset management.
- Keep all live slider changes paint/GPU-first where possible.
- Avoid heavy CPU render while dragging.

### 0.6.x - AI upscale prototype

- Add a real local model only after license, APK size, speed, and device proof are acceptable.
- Keep the current fast local 2x path as fallback.
- Never claim final AI quality until real device output proves it.

### 1.0.0 - Play Store candidate

- App opens, imports, edits, compares, exports, saves, and shares reliably.
- No placeholder roadmap copy in product UI.
- Store listing, privacy, signing, and real-device smoke are complete.

## Current next priority

After `0.3.6+14`, test the new Brush, Text, and Sticker editor tools on emulator and real Android devices. The next implementation wave should improve direct manipulation: drag/scale text, manual crop handles, brush opacity/eraser, and gallery/editor performance proof through Settings > Diagnostics.
