# Vault Play Store Readiness

## Current package identity
- App name: `Vault`
- Android application ID: `com.omniacreata.vault`
- Brand: `Omnia Creata`
- Primary hosted runtime URL: `https://vault.omniacreata.com`

## Repo-side work completed
- Capacitor dependencies installed in `web/package.json`
- Android bootstrap scripts added to root and web workspaces
- Capacitor config updated for the current dark-first runtime, status bar, splash, keyboard resize, and server allowlist
- Privacy and terms public pages added for store listing support
- Manifest theme/background currently set to a dark background and portrait orientation

## Commands
- Install deps: `npm install`
- Create Android project: `npm run android:add`
- Sync web shell into Android project: `npm run android:sync`
- Open Android Studio project: `npm run android:open`
- Build debug APK after Android project exists: `npm run android:build:debug`

## Play Store checklist
- Generate the Android project and commit the `web/android` folder once the bootstrap succeeds
- Replace placeholder app icons and splash assets with final store branding
- Add signing config for release builds in Android Studio / Gradle
- Verify privacy policy URL uses the deployed `/privacy` page
- Verify terms URL uses the deployed `/terms` page
- Fill Play Console listing text, screenshots, category, contact email, and content rating
- Complete the Data safety form based on actual enabled runtime flags
- Test guest mode, offline capture, app relaunch, deep links, and install prompt behavior on a real Android device

## Data safety guidance for beta
- Core user content: entries, projects, preferences, version history
- Local-first beta: content may remain on-device if the user stays in guest mode
- AI is disabled by default in beta
- Ads may be enabled later; update the Data safety form before turning on a real ad network
- Sync and account collection depend on Supabase runtime configuration

## Store-risk warnings
- A thin web-wrapper experience can still be rejected even with Capacitor; UI must continue to feel native and app-like
- Ads must never interrupt capture/editor flows
- Privacy and terms pages should be deployed publicly before submission
- Final release should use real app icons, screenshots, feature graphic, and store copy rather than beta placeholders
