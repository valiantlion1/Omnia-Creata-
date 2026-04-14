# Omnia UI Guardrails

Last updated: 2026-04-13

## Purpose

This document is the shared UI rulebook for Codex work across the Omnia Creata repo.

Use it to prevent drift into:

- generic SaaS dashboard UI
- over-styled concept work with weak usability
- product surfaces that read like websites
- random palette, spacing, motion, and copy choices

This is a repo-level baseline, not a replacement for product-local docs.
When a product has stronger local direction, the local product docs win.

## Source docs

This guardrail is synthesized from:

- `apps/studio/docs/reference/STUDIO_DIRECTION_LOCK_2026-03-25.md`
- `apps/prompt-vault/docs/UI-UX-DEV-PLAN.md`
- `apps/organizer/docs/NEW PLANS/OmniaOrganizer_Codex_Paketi/DESIGN_PRINCIPLES.md`
- `apps/internal/control-center/docs/wiki/03_CONTROL_SURFACES_AND_DASHBOARDS.md`

## Shared Omnia UI Baseline

Across Omnia products, UI should feel:

- calm
- premium
- grounded
- readable
- useful before flashy
- modern without trend-chasing
- structured without looking corporate

Across Omnia products, UI should not feel like:

- a crypto interface
- a cyber dashboard
- a generic admin panel
- a chart museum
- a marketing website pretending to be an app
- a concept art mockup with weak interaction logic

## Core Rules

### 1. App-first over web-first

- Internal product surfaces are work surfaces, not landing pages.
- Do not drop hero sections, campaign copy, logo clouds, or marketing panels into app UI unless the product doc explicitly asks for them.
- Default to a clear application shell with obvious navigation, a primary working area, and secondary context only when needed.

### 2. Content and action over decoration

- The user's content, workflow, and next action should dominate.
- Decorative containers, filler metrics, and visual tricks are not substitutes for hierarchy.
- If a block does not help orient, explain, prove, recommend, or act, remove it.

### 3. Premium means clarity

Premium UI in Omnia means:

- strong spacing
- deliberate hierarchy
- readable typography
- quiet confidence
- polished interaction feedback

It does not mean:

- louder gradients
- oversized rounding everywhere
- floating glass shells
- fake luxury copy
- ornamental motion

### 4. Calm surfaces, low noise

- Prefer layered surfaces over heavy borders everywhere.
- Keep backgrounds quiet and stable.
- Use contrast to clarify structure, not to constantly demand attention.
- Shrink visual noise in separators, hover states, outlines, and metadata.

### 5. One accent, intentional use

- Use one primary accent by default.
- A secondary accent is allowed only when there is a real system reason.
- Accent colors should signal action, state, or emphasis, not fill empty space.
- Avoid multi-accent "AI generated" color scatter.

### 6. Motion must help understanding

- Motion should support orientation, confidence, or feedback.
- Keep it restrained and fast.
- Respect reduce-motion.
- Avoid decorative float, wobble, tilt, glow, and hype motion.

### 7. Copy must stay grounded

UI copy should be:

- calm
- clear
- competent
- trustworthy
- product-specific

UI copy should not be:

- mystical
- startup-slogan heavy
- cinematic for no reason
- over-branded
- dashboard-theater language

### 8. Progressive complexity

- Show the primary action, current context, and next useful action first.
- Hide advanced controls until relevant.
- Do not front-load power-user density when the product promise is clarity.

### 9. Accessibility is required

- Keyboard access and visible focus states are mandatory.
- Meaning cannot depend on color alone.
- Motion needs a reduce-motion safe path.
- Contrast and target sizes must hold up in real use, not only in mockups.

### 10. Responsive means re-composed, not stacked blindly

- Mobile should feel intentional, not like the desktop layout collapsed into one long column.
- Re-prioritize surfaces for smaller screens.
- Keep primary actions and current context close to the thumb path on mobile-first products.

## Visual System Defaults

Use these defaults unless a product-local doc says otherwise.

### Layout

- Clear shell with predictable regions
- Strong primary workspace
- Secondary panels only when they earn their weight
- Avoid dashboard-card mosaics as the default first move

### Spacing

- Favor deliberate whitespace over dense visual clutter
- Avoid oversized padding that makes the product feel vague or slow
- Keep a consistent spacing scale across the screen

### Corners

- Use one coherent corner language per product
- Avoid mixing several unrelated radius styles
- Do not default every surface into oversized soft rounding

### Borders and depth

- Prefer subtle separation
- Use depth sparingly
- Avoid glow abuse and dramatic box shadows

### Typography

- Typography should support reading and action first
- Headlines should be short and useful
- Metadata should stay quiet but readable
- Avoid too many weights and style shifts on one screen

### Icons

- Icons support labels; they do not replace clear language
- Keep icon style consistent across the product

## Strong Anti-Patterns

These patterns are likely wrong unless a product doc explicitly justifies them:

- giant hero blocks inside app UI
- fake KPI grids with no operational meaning
- enterprise dashboard density for consumer or utility products
- card-on-card-on-card mosaic layouts
- decorative right rails with weak information value
- random charts used as filler
- gradient-heavy premium-dark styling
- purple SaaS default identity
- cyber control-room aesthetics
- glassmorphism as the default system
- over-branded luxury wording
- website sections embedded in app surfaces
- excessive empty space created to look expensive

## Product Overrides

### Studio

Studio should feel:

- premium
- modern
- beautiful
- intuitive
- powerful without intimidation

Studio-specific notes:

- preserve strong layout and interaction quality
- do not fall back to generic purple SaaS brand identity
- use cleaner premium contrast with cream, soft white, mist blue, graphite, slate, or charcoal support tones
- chat is a flagship surface, not a side panel
- create and chat must stay clearly distinct because they serve different intents

### Prompt Vault

Prompt Vault should feel:

- like a serious app
- fast
- calm
- content-first
- lighter than bloated productivity suites

Prompt Vault-specific notes:

- home guides rather than reports
- content is the hero
- reduce decorative blocks and dashboard containers
- keep capture fast and obvious
- avoid fake admin or enterprise density

### Organizer

Organizer should feel:

- mobile-native
- grounded
- trustworthy
- capable
- simple and visual

Organizer-specific notes:

- no sci-fi control center energy
- no cloud-drive clone styling
- no PDF workstation vibes taking over the whole app
- thumb-friendly layouts matter
- bottom navigation should stay consistent
- destructive actions need strong safety patterns

### Control Center

Control Center should feel:

- operational
- readable
- hierarchical
- action-oriented

Control Center-specific notes:

- the primary dashboard must privilege situation, recommended action, live queue, services, and escalations
- do not let it degrade into a card mosaic, chart museum, or executive vanity dashboard
- charts must answer operational questions, not perform data richness

## Codex Workflow For UI Tasks

When Codex is asked to design, refactor, or polish UI in this repo:

1. Read this guardrail file.
2. Read the nearest product docs before editing.
3. Identify the screen's job in one sentence.
4. Define the primary action, current context, and next useful action.
5. Reuse existing components, tokens, and patterns before inventing new ones.
6. Design required states, not only the happy path.
7. Verify desktop and mobile behavior.
8. Check copy for grounded product language.
9. Remove decorative noise before adding new chrome.

## Required State Coverage

For meaningful UI work, account for the relevant states:

- default
- hover
- focus
- active/selected
- loading
- empty
- success
- error
- destructive confirmation when applicable
- reduced-motion safe path when motion matters

## Review Questions

Before calling a UI change done, ask:

- Does this look like an Omnia product or like generic internet app UI?
- Is the screen helping the user act, or only looking styled?
- Did we add decoration where structure would have solved the problem better?
- Would the mobile version still feel intentional?
- Is the copy grounded and useful?
- Did we preserve accessibility and responsiveness?

## Working Rule

If a UI decision feels visually louder than the product meaning it carries, it is probably wrong.
