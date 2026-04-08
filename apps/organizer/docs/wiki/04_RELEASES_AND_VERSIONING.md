# Releases And Versioning

## Why this matters
For Organizer, fast phone testing matters more than emulator-heavy loops.

The practical path is:
- build Android artifacts in GitHub
- download APK or AAB from releases or workflow artifacts
- install on real device
- iterate

## Current version source
- Gradle properties are the build source of truth for semantic version parts:
  - `versionMajor`
  - `versionMinor`
  - `versionPatch`
  - optional prerelease fields:
    - `preRelease`
    - `preReleaseNumber`
- Product manifest also exists for repo-level release tracking:
  - [version.json](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/version.json)
- Release history must also be mirrored in:
  - [ORGANIZER_RELEASE_LEDGER.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/docs/operations/ORGANIZER_RELEASE_LEDGER.md)

## Canonical release naming
- Internal shorthand: `OOFM`
- App name: `Omnia Organizer`
- Play Store name: `Omnia Organizer: File Manager`
- Git tag format: `organizer-v<semver>`
- GitHub release title format: `Omnia Organizer <semver>`

## Version policy

### Before first public launch
- `1.0.0-alphaN` for GitHub prerelease testing and direct phone installs
- `1.0.0-betaN` for Play internal or closed testing once core flows feel stable

### First public launch
- `1.0.0`

### After launch
- patch: bug fixes and small improvements
- minor: meaningful user-facing features
- major: only if product contract changes heavily

## Version code rule
Use the Gradle formula that is already implemented in the Android app:
- `major * 1_000_000 + minor * 10_000 + patch * 100 + releaseOrdinal`
- prerelease `releaseOrdinal` = `preReleaseNumber`
- stable `releaseOrdinal` = `99`

Examples:
- `1.0.0-alpha1` -> `1000001`
- `1.0.0-alpha2` -> `1000002`
- `1.0.0` -> `1000099`
- `1.1.0-beta3` -> `1010003`

This rule exists so every Android install is monotonically upgradeable on real devices.

## Required release rules
- Never reuse a released version string.
- Never overwrite an existing Git tag with a different build.
- If a shipped alpha has a bug, ship `alphaN+1` instead of replacing the same release.
- For OOFM, the default delivery mode is continuous prerelease shipping: every meaningful finished implementation pass should become the next GitHub prerelease unless explicitly paused.
- Every meaningful phone-testable build must update [version.json](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/version.json).
- Every GitHub or Play release must add or update an entry in [ORGANIZER_RELEASE_LEDGER.md](/C:/Users/valiantlion/Desktop/OMNIA%20CREATA/apps/organizer/docs/operations/ORGANIZER_RELEASE_LEDGER.md).
- Every release must include short notes:
  - what changed
  - why it shipped
  - known gaps
- `alpha` means:
  - still moving quickly
  - safe to break UX
  - real-device validation is the main goal
- `beta` means:
  - core user flow is already present
  - upgrade path matters
  - Play testing is expected
- stable means:
  - no placeholder product flow
  - permission model explained clearly
  - Browse, Search, Storage, and Recycle Bin are trustworthy on real devices

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

## Current live releases
- [Omnia Organizer 1.0.0-alpha1](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha1)
- [Omnia Organizer 1.0.0-alpha2](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha2)
- [Omnia Organizer 1.0.0-alpha3](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha3)
- [Omnia Organizer 1.0.0-alpha4](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha4)
- [Omnia Organizer 1.0.0-alpha5](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha5)
- [Omnia Organizer 1.0.0-alpha6](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha6)
- [Omnia Organizer 1.0.0-alpha7](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha7)
- [Omnia Organizer 1.0.0-alpha8](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha8)
- [Omnia Organizer 1.0.0-alpha9](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha9)
- [Omnia Organizer 1.0.0-alpha10](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha10)
- [Omnia Organizer 1.0.0-alpha11](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha11)
- [Omnia Organizer 1.0.0-alpha12](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha12)
- [Omnia Organizer 1.0.0-alpha13](https://github.com/valiantlion1/Omnia-Creata-/releases/tag/organizer-v1.0.0-alpha13)

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
