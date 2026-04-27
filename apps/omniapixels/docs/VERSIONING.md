# OmniaPixels Versioning

## Current version

`0.3.3+11`

## Scheme

OmniaPixels uses Flutter's `versionName+versionCode` pattern:

- `versionName`: public semantic version, for example `0.1.0`
- `versionCode`: monotonically increasing Android build number, for example `1`

## Release lanes

- `0.1.x`: foundation, navigation, design system, local mock workflow
- `0.2.x`: real gallery/import, local edit pipeline, save-as-copy
- `0.3.x`: on-device upscale prototype and before/after compare
- `0.4.x`: Android hardening, privacy, permissions, Play internal test
- `1.0.0`: first public Play Store candidate

## Rules

- Every build that leaves the machine increments `versionCode`.
- Every Play Console upload gets a release note under `docs/releases/`.
- Public claims must match the app behavior in that exact build.
- Generated UI concepts are references only; production uses real app code and the real Omnia Creata logo asset.
