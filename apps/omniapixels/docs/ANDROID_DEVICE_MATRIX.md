# OmniaPixels Android Device Matrix

Date: 2026-04-27

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
- Real AI model integration stays blocked until APK size, device memory, model license, and real-device inference time are proven.
