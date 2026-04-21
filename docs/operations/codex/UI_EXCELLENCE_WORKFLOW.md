# UI Excellence Workflow

Last updated: 2026-04-21

## Purpose

This document is the stronger default workflow for Codex when the task is visual UI work.

Use it for:

- website redesigns
- landing pages
- product pages
- app surfaces
- shell polish
- layout refactors
- responsive cleanup
- public-facing copy cleanup

This is not a style guide. It is a working method that reduces the chance of weak, generic, developer-ish UI.

## Non-negotiable sequence

For meaningful UI work, do these in order:

1. Screen truth
2. Reference harvest
3. Composition plan
4. Implementation
5. Copy pass
6. Browser proof
7. Accessibility sanity pass

Do not jump straight from prompt to components.

## 1. Screen truth

Write the job of the screen in one sentence.

Examples:

- `The homepage should make Omnia Creata feel like a real software company, not an internal roadmap.`
- `The Studio product page should explain the product clearly and send people into the right next action.`
- `The contact page should reduce hesitation and make the next step obvious.`

If the job is unclear, the design will drift.

## 2. Reference harvest

Before editing layout, gather references.

Minimum:

- 2 current product references
- 1 system or standards reference
- 1 implementation or component reference

Good reference types:

- live product sites
- current app flows
- user-provided screenshots
- Figma files
- system guidelines

Good sources:

- Linear
- Raycast
- Stripe
- Notion
- Vercel
- Figma Dev Mode MCP when available

Do not blindly follow inspiration galleries. They are input, not authority.

For each reference, note:

- what to borrow
- what to avoid
- what emotional or structural role it plays

## 3. Composition plan

Before components, decide:

- what the eye lands on first
- what should feel quiet
- what carries the action
- where the page breathes
- which sections can disappear entirely

Judge the screen in this order:

1. silhouette
2. visual mass
3. spacing rhythm
4. typography hierarchy
5. imagery and crop
6. action placement
7. supporting copy

If the page reads like reusable blocks instead of a composed screen, stop and simplify.

## 4. Implementation

Build with this bias:

- composition first
- primitives second
- decoration last

Default stack:

- behavior and accessibility: React Aria or Base UI
- owned component code: shadcn/ui when useful
- design context: Figma Dev Mode MCP or screenshots

Rules:

- no cards by default
- no developer notes in visible copy
- no MVP / TODO / internal planning language in public UI
- no giant hero unless the page truly earns it
- no decorative motion without a readability or hierarchy job

## 5. Copy pass

Every visible string is end-user copy.

Check each string:

- label
- action
- status
- helper
- legal

Then cut aggressively:

- delete obvious helper text
- rewrite internal wording
- remove strategic commentary from user-facing pages
- shorten paragraphs until the layout explains the screen on its own

Public surfaces must not sound like:

- internal planning docs
- developer handoff notes
- product strategy memos
- MVP disclaimers

## 6. Browser proof

Source code is not visual proof.

For every important route:

- check desktop
- check mobile or narrow viewport
- capture screenshots
- inspect console
- verify the user's actual complaint

Always look for:

- overflow
- broken wrapping
- duplicated controls
- awkward empty space
- dead CTA placement
- card piles
- helper copy walls

## 7. Accessibility sanity pass

Do not stop at "looks nicer now."

Use:

- Playwright for live route proof
- axe-core or `@axe-core/playwright` for automated accessibility checks
- Lighthouse for audit coverage
- Accessibility Insights when deeper manual checks are needed

Standards and references:

- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- ARIA APG: https://www.w3.org/WAI/ARIA/apg/
- Apple HIG Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Material 3: https://m3.material.io/

## Visual anti-pattern blacklist

These are usually wrong unless the product clearly justifies them:

- generic SaaS card farms
- internal/dev/MVP copy on public pages
- fake premium luxury language
- giant empty hero zones
- equal-weight sections fighting each other
- decorative right rails
- gradient and glow used as hierarchy
- motion that exists only to look expensive

## Done criteria

The UI pass is not done until:

- the screen job is obvious
- copy sounds like product copy, not team notes
- desktop and mobile both hold up
- console is clean or issues are reported honestly
- accessibility got at least a basic pass
- the result feels composed, not assembled
