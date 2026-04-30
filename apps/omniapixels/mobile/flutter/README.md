# OmniaPixels Flutter

Android-first Flutter app for OmniaPixels, a local-first photo editor and upscaler by Omnia Creata.

## Current version

`0.3.13+21`

## Active surface

- Active platform: Android / Play Store path.
- Active source: `lib/`, `android/`, `assets/brand/`, and `test/`.
- Removed scaffold surfaces: Flutter `ios/`, `macos/`, `linux/`, `windows`, and `web/` folders are intentionally absent until a real product decision reopens those platforms.
- Local outputs such as `.dart_tool/`, `.metadata`, `.idea/`, `.gradle/`, and `build/` are not source.

## Verify

```powershell
flutter analyze
flutter test
flutter build apk --release
```

Use release builds for phone responsiveness checks. Debug APKs are useful for development, but they are not representative for FPS or gallery/edit latency.
