# OmniaPrompt Play Store Readiness

Status: Phase 1 release alignment, 2026-04-25

## Current package identity

- App name: `OmniaPrompt`
- Android application ID: `com.omniacreata.omniaprompt`
- Parent brand: `OmniaCreata`
- Primary hosted runtime URL: `https://prompt.omniacreata.com`
- Privacy URL: `https://prompt.omniacreata.com/en/privacy`
- Terms URL: `https://prompt.omniacreata.com/en/terms`

If `com.omniacreata.vault` has already been uploaded to a Play Console app, do not silently switch package identity for that existing listing. Google Play package names are effectively permanent after upload. For a fresh OmniaPrompt listing, use `com.omniacreata.omniaprompt`.

## Current repo-side state

- Capacitor Android project exists under `web/android`.
- Android target SDK is `36`, which satisfies the current Google Play new app/update target API requirement of Android 15 / API 35 or higher.
- Only required Android permission is `INTERNET`.
- Runtime defaults are conservative for public release prep:
  - `NEXT_PUBLIC_ENABLE_ADS=false`
  - `NEXT_PUBLIC_ENABLE_AI=false`
  - `NEXT_PUBLIC_ENABLE_PRO=false`
- The Android shell points at `https://prompt.omniacreata.com` by default.
- Splash/status/navigation colors are aligned to the warm OmniaPrompt theme instead of the old black Vault shell.

## Commands

Run from `apps/prompt-vault` unless noted:

```bash
npm run lint
npm run typecheck
npm run build
npm run android:sync
npm run android:build:debug
npm run android:build:aab
```

`android:build:aab` creates the Play-uploadable bundle path once release signing is configured:

```text
web/android/app/build/outputs/bundle/release/app-release.aab
```

## Release signing

Do not commit keystores, passwords, or Play App Signing exports.

Before Play upload:

1. Create or reuse the release keystore outside the repo.
2. Configure Android Studio or local `gradle.properties` with signing values.
3. Build `bundleRelease`.
4. Upload the AAB to an internal or closed testing track first.
5. Store keystore recovery details in the founder password manager, not in Git.

## Play Console checklist

- App name: `OmniaPrompt`
- Short description: `Save, organize, and reuse your AI prompts, notes, and ideas.`
- Full description should say the app is local-first, mobile-friendly, and optional-cloud-sync, without claiming AI/chat/billing features unless enabled.
- Category: `Productivity`
- Contact email: `hello@omniacreata.com`
- Privacy policy URL points to the deployed privacy page.
- Terms URL points to the deployed terms page.
- Upload phone screenshots from real mobile web/Android proof, not generated device mockups.
- Complete content rating.
- Complete Data safety based on the actual runtime flags for the submitted build.
- Declare that only `INTERNET` permission is used unless future plugins add permissions.

## Data safety baseline for current beta build

Use the final submitted runtime, not local assumptions:

- Guest mode stores user content locally on device.
- Signed-in mode can sync user-generated content to Supabase if Supabase env is configured.
- User-created content includes prompts, notes, projects, tags, drafts, preferences, and version history.
- AI assistance is off unless `NEXT_PUBLIC_ENABLE_AI=true` and provider secrets are configured.
- Ads are off unless `NEXT_PUBLIC_ENABLE_ADS=true`.
- Billing is off unless `NEXT_PUBLIC_ENABLE_PRO=true` and a billing provider is integrated.

If any of AI, ads, analytics, billing, crash reporting, or support SDKs are added, update this page, `/privacy`, and Play Data safety before submitting.

## New personal developer account testing

For a newly created personal Play Console developer account, production access requires a closed test with at least 12 opted-in testers for 14 continuous days. Start with internal testing, then closed testing, then production access.

## Store-risk warnings

- A thin web-wrapper experience can still be rejected if it feels like a website in a shell. Keep the Android experience app-like, fast, and useful offline where possible.
- Public policy pages must be deployed and reachable before submission.
- The first release should not enable ads, paid claims, or third-party AI unless the data safety form and policy pages are updated.
- Verify app relaunch, keyboard behavior, deep links, offline capture, export, and account/no-account behavior on at least one real Android device.
