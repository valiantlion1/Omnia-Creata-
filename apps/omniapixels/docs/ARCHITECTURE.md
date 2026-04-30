# OmniaPixels Architecture

Date: 2026-04-28

## Current stance

OmniaPixels is an Android-first Flutter product inside the Omnia Creata monorepo. The active app source is intentionally narrow:

- `mobile/flutter/lib` for Dart application code.
- `mobile/flutter/lib/editor` for editor values, markup models, diagnostics, rendering, and upscale engine boundaries.
- `mobile/flutter/android` for the Play Store Android shell.
- `mobile/flutter/assets/brand` for the real Omnia Creata logo asset.
- `mobile/flutter/test` for widget and behavior coverage.

## Pruned surfaces

The default Flutter `ios`, `macos`, `linux`, `windows`, and `web` scaffolds were removed because they were not active product surfaces. They carried template code, placeholder comments, and platform assets that made the app look broader than the actual release path.

If OmniaPixels later needs another platform, recreate that platform intentionally with a product owner, QA path, release checklist, and platform-specific privacy/signing work.

## Ecosystem boundaries

- Root `packages/` should only receive code that is genuinely shared by at least two active products.
- OmniaPixels can reuse Omnia Creata brand assets, release discipline, documentation structure, and future shared contracts.
- OmniaPixels must not silently import Studio, OCOS, Prompt Vault, or website assumptions such as auth, credits, cloud AI, pricing, backend sessions, or dashboard copy.

## Technology posture

- Stay on stable Flutter/Dart and modern Android Gradle/Kotlin tooling.
- Keep editor interactions local-first and responsive; heavy work belongs behind explicit progress states.
- Prefer Android system picker and MediaStore-compatible save/share paths over custom permission-heavy gallery flows unless a measured need proves otherwise.
- Treat generated output, build folders, IDE files, local Gradle state, APKs, and caches as non-source.

## Current technology check

- Local SDK observed after upgrade on 2026-04-28: Flutter `3.41.8`, Dart `3.11.5`.
- Official Flutter docs observed current documentation for Flutter `3.41.5`, and `flutter upgrade --verify-only` reported stable `3.41.8` as available. Reference: <https://docs.flutter.dev/release/whats-new>
- Android release work should follow Flutter's Play Store release guidance. Reference: <https://docs.flutter.dev/deployment/android>
- `package_info_plus` is now `^10.1.0` and `share_plus` is now `^13.1.0`.
