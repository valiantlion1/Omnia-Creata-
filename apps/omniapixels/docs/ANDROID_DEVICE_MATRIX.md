# OmniaPixels Android Device Matrix

Date: 2026-04-28

## Goal

OmniaPixels must behave well across Android phones, not only one flagship or one emulator.

## Baseline coverage

- Android 12, 13, 14, 15, and 16.
- Low-memory, mid-range, and high-refresh devices.
- System photo picker path.
- Limited photo permission path.
- Custom album grid fallback path.
- Large libraries: 1k, 10k, and 25k+ images.

## Required smoke per APK

- App launch and splash.
- System picker open and single-photo import.
- Custom gallery open, album switch, and fast scroll.
- Crop ratio preview and export.
- Fast 2x and Enhanced 2x upscale completion.
- Save as new copy.
- Share sheet.
- Settings build match and diagnostics.

## Performance signals

- Settings > Diagnostics frame average and worst frame.
- Gallery load and thumbnail cache count.
- Preview render duration.
- Upscale render duration.
- No operation should look like a mock or silent hang; long work must show the operation name and elapsed time.

## Current truth

- `0.3.5+13` keeps upscale honest as local-only.
- `0.3.6+14` adds Brush/Text/Sticker layers; each device pass should verify preview, undo/redo, and export bake.
- `0.3.7+15` hardens picker, busy states, empty editor state, editor dock spacing, and gallery thumbnail/load-more behavior after emulator smoke exposed broken product feel.
- `0.3.8+16` moves the Android-first app to Flutter `3.41.8`, Dart `3.11.5`, latest resolvable direct package versions, and Java/Kotlin 17 Android build targets.
- `0.3.9+17` adds crop position control so fixed-ratio crop/export no longer always cuts from the center; device passes should verify horizontal/vertical crop sliders, undo/redo, and saved output.
- `0.3.10+18` rebuilds the first-run, gallery empty, editor empty, preview, bottom nav, settings, and diagnostics visual system around a calmer image-first mobile editor surface.
- `0.3.11+19` switches the visual direction to the user-provided gold Omnia Creata script logo, updates the app accent system, splash, empty visual texture, and brand asset path.
- `0.3.12+20` tightens the app toward the supplied gold reference board: compact top bars, Open Gallery first-run action, gallery filter chips, editor icon toolbar, and upscale processing card.
- `0.3.13+21` replaces the weak crop sliders with a handle-based crop editor, more aspect ratios, flip/rotate geometry actions, and normalized crop export baking.
- Real AI model integration stays blocked until APK size, device memory, model license, and real-device inference time are proven.
