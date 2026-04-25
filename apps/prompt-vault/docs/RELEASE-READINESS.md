# OmniaPrompt Release Readiness Plan

Status: active phased release work, 2026-04-25

## Phase 0 - Truth Audit

- Confirm repo scope stays inside `apps/prompt-vault`.
- Confirm current web build path is `next build --webpack`.
- Confirm Android project exists and target SDK is Play-compatible.
- Confirm policy pages, PWA metadata, and Capacitor identity match OmniaPrompt.

## Phase 1 - Identity And Release Contract

- Align `Vault`/`OmniaVault` runtime remnants to `OmniaPrompt`.
- Align Android app name, package id, remote URL, splash color, status/nav bars, and release scripts.
- Make ads, AI, and Pro disabled by default until policy/data safety is updated.
- Update Play Store and deployment docs.

## Phase 2 - Web Product Hardening

- Verify home, capture, library, detail, editor, settings, privacy, and terms on mobile and desktop.
- Fix broken empty, loading, error, offline, and keyboard states.
- Confirm guest/local persistence survives reload and export works.
- Confirm Supabase mode refreshes auth cookies, hydrates `user_vault_state`, and saves signed-in changes.
- Confirm `/api/health` returns `status: "ok"` in the deployed runtime.

## Phase 3 - Android Play Build

- Run Capacitor sync.
- Verify debug build.
- Configure release signing outside Git.
- Build release AAB.
- Test on a real Android device.

## Phase 4 - Submission Pack

- Produce final screenshots from the real app, not generated mockups.
- Prepare Play listing copy, privacy URL, terms URL, content rating, data safety answers, and tester instructions.
- Upload internal test, then closed test.
- If the Play account is a new personal developer account, run 12 opted-in testers for 14 continuous days before requesting production access.

## Non-code blockers

- Play Console account access
- Final public domain mapping
- Supabase production project and auth redirect config
- Release keystore and Play App Signing ownership
- Real Android device QA
