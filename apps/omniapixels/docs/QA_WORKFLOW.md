# OmniaPixels QA Workflow

Date: 2026-04-26

## Local Android proof

Use the local Android emulator before every GitHub APK upload.

Default emulator:

```powershell
flutter emulators --launch Codex_Pixel_6_API_36
flutter devices
```

Install a release APK:

```powershell
flutter build apk --release
flutter install --release -d emulator-5554
adb -s emulator-5554 shell am force-stop com.omniacreata.omniapixels
adb -s emulator-5554 shell monkey -p com.omniacreata.omniapixels -c android.intent.category.LAUNCHER 1
```

## Required checks

- Splash opens and uses the real Omnia Creata logo.
- Continue without access opens Gallery.
- Gallery empty state and bottom navigation render correctly.
- Settings shows the intended build label.
- Settings shows matching `UI build`, `APK build`, and `Build check` values.
- Settings diagnostics show frame and operation metrics.
- Changed surface has at least one screenshot saved under local build output.

## Release-test rule

If the emulator `UI build` and `APK build` values do not match each other and the intended version, stop and rebuild from clean:

```powershell
flutter clean
flutter pub get
flutter analyze
flutter test
flutter build apk --release
```

Only upload the APK after the emulator-visible build label is correct.

## Phone smoke

For the Poco X6 Pro pass, record these observations:

- Gallery open time.
- Fast scroll behavior in a 25k+ photo library.
- Album switching.
- Photo selection time.
- Slider drag smoothness.
- Crop/rotate preview time.
- Save/share result.
- Settings > Diagnostics values after the run.
