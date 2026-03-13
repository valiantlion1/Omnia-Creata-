# Omnia Organizer – Play Release Playbook (v1)

Purpose: Repeatable, low-risk release process for Google Play.

1) Versioning
- Increase versionCode by +1 for every release (1, 2, 3, …)
- Use semantic versionName: 1.0.0 → 1.0.1 (patch) → 1.1.0 (minor) → 2.0.0 (major)

2) Build
- Generate a signed Release AAB (Android App Bundle)
- Use Play App Signing (recommended). Keep your upload key safe.

3) Testing Flow
- Internal testing: upload AAB, distribute to testers (minutes)
- Optional: Closed testing (alpha) or Open testing (beta)

4) Production Release
- What’s new: short, clear notes (user-facing)
- Staged rollout: 5% → monitor → 50% → 100%
- If issues: halt rollout, publish hotfix (new versionCode)

5) Store Assets Checklist
- App name, short description, full description
- 512×512 icon, 1024×500 feature graphic
- Phone screenshots (≥3)
- Category, contact email (omnia.organizer.app@gmail.com)
- Privacy Policy URL (GitHub Pages or public link to the policy file)
- Data Safety form: declare “no data collected/shared”
- Content rating questionnaire
- Target API Level 35, Min SDK 26

6) Quality Gates (Definition of Done)
- App starts and basic flows work (Inbox/Library/Search/Tasks shell)
- No crashes on startup, no ANR in smoke tests
- DB migrations (Room) written and tested (no data loss)
- Battery/network usage sane (offline-first)

7) Monitoring and Post-Release
- Watch Play Console: Crashes/ANRs, ratings, reviews
- If a severe issue appears: pause rollout, prepare hotfix
- Update CHANGELOG and Final folder artifacts

8) Changelog Template
- [Added]
- [Changed]
- [Fixed]
- [Security]

This playbook keeps risk low, cost zero, and speed high. Iterate weekly with sprint cadence.