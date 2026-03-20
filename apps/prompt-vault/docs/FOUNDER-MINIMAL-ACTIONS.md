# OmniaVault Founder Minimal Actions

> Last updated: 2026-03-20
> Purpose: List the smallest possible set of things the founder must personally do

---

## 1. Why this document exists

The product should not stall because the founder is not technical.

This document exists to separate:

- what the coding agent should handle
- and
- what only the founder can realistically do

If a task is not in this file, the default assumption is that the coding agent should try to handle it.

---

## 2. Things only the founder should do

These are external-world actions that usually cannot be completed safely by the coding agent alone.

### Account logins

- log into Supabase
- log into Vercel
- log into domain/DNS provider
- log into Play Console
- log into app store or ad network dashboards

### Secret creation or approval

- generate or approve API keys
- approve OAuth grants
- rotate compromised secrets if needed

### Brand decisions

- choose the final public product name
- approve subtitle and store naming
- approve domain/subdomain mapping

### Legal and business approvals

- confirm privacy policy wording
- confirm terms wording
- choose payment account owner
- accept store agreements

### Final creative approvals

- approve app icon
- approve splash/logo
- approve store screenshots
- approve listing copy

---

## 3. What the founder should not need to do

The founder should not be asked to:

- write code
- manually refactor components
- debug local TypeScript issues
- write SQL migrations from scratch
- maintain design tokens
- manually move files around
- manually rewire every environment file
- architect the data model alone

If these appear, the coding agent should absorb the work whenever possible.

---

## 4. Current minimum action list

At this stage, the founder only needs to be available for:

### Already completed

- create Supabase project
- provide Supabase URL and publishable key
- save auth URL configuration in Supabase

### Likely next

- use the app with a real account once auth flow is stable
- confirm whether the experience feels correct
- approve the next UI direction

### Later

- provide or approve final domain target
- provide Play Console access when Android beta is ready
- approve final store materials

---

## 5. Emergency fallback rule

If the founder is unavailable, work should continue on:

- documentation
- local debugging
- UI improvements
- sync hardening
- Android packaging
- analytics and observability prep

The only things that must wait are external-dashboard or legal/account actions.

---

## 6. Communication rule

When a founder action is required, it should be requested in the smallest possible form:

- one dashboard
- one exact field
- one exact button
- one exact confirmation

The goal is:

- no long technical explanations unless asked
- no "go figure this out" work pushed to the founder

---

## 7. One-line summary

The founder should only handle identity, approvals, accounts, and final decisions.

Everything else should default to the coding agent.
