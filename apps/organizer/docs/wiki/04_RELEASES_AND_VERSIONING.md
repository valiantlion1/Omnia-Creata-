# Releases And Versioning

## Why this matters
For Organizer, fast phone testing matters more than emulator-heavy loops.

The practical path is:
- build Android artifacts in GitHub
- download APK or AAB from releases or workflow artifacts
- install on real device
- iterate

## Current version source
- Gradle properties already support semantic version parts:
  - `versionMajor`
  - `versionMinor`
  - `versionPatch`
  - optional prerelease fields
- Product manifest now also exists:
  - [version.json](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/version.json)

## Version policy

### Before first public launch
- `1.0.0-alphaN` for internal artifact testing
- `1.0.0-betaN` for closed Play testing

### First public launch
- `1.0.0`

### After launch
- patch: bug fixes and small improvements
- minor: meaningful user-facing features
- major: only if product contract changes heavily

## Version code rule
Use the current Gradle formula:
- `10000 * major + 100 * minor + patch`

Examples:
- `1.0.0` -> `10000`
- `1.1.0` -> `10100`
- `1.2.3` -> `10203`

## Recommended release channels

### GitHub artifact channel
Use for:
- fast internal installs
- real-device checks before Play
- testing unsigned or debug-like builds where appropriate

### Play internal testing
Use for:
- first serious distribution to your own phones
- install/update validation
- early device matrix testing

### Play closed testing
Use for:
- trusted external testers
- first store metadata and listing validation

### Play production
Use only when:
- MVP core flows are stable
- crash risk is acceptable
- permissions and storage edge cases were tested on device

## Artifact strategy

### APK
Use for:
- fast direct install on your phone
- GitHub release download testing

### AAB
Use for:
- Play Console distribution
- real store releases

For now the workflow builds the release AAB as a GitHub asset too.
If Play signing later needs a keystore-based flow, extend the workflow with secrets instead of changing the release process.

## GitHub workflow direction
Organizer now has a dedicated workflow:
- [.github/workflows/organizer-android-release.yml](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/.github/workflows/organizer-android-release.yml)

This workflow:
1. checks out the repo
2. sets up Java and Android SDK
3. builds the `alpha` APK
4. builds the release AAB
5. uploads both as workflow artifacts
6. creates or updates a GitHub Release on `organizer-v*` tags
7. can also create a release from manual dispatch

## Tag rule
Use:
- `organizer-v1.0.0-alpha1`
- `organizer-v1.0.0-beta1`
- `organizer-v1.0.0`

If the workflow runs from a matching tag push, it automatically creates or updates the corresponding GitHub Release.

If the workflow runs manually, set:
- `create_release=true`
- `tag_name=organizer-v...`

## Signing rule
- debug and internal artifact builds can be handled separately from Play release signing
- Play release AAB should only use GitHub secrets after the keystore and store credentials are stable

## Release checklist
Before every meaningful release:
1. bump Gradle version fields
2. update [version.json](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/version.json)
3. add an entry to [ORGANIZER_RELEASE_LEDGER.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/docs/operations/ORGANIZER_RELEASE_LEDGER.md)
4. build and test on a real phone
5. verify permissions, Browse, Search, Storage, and Recycle Bin
6. write short release notes

## Launch sequence
1. GitHub alpha APK
2. Play internal testing
3. Play closed testing
4. public launch
5. frequent updates instead of giant rewrites
