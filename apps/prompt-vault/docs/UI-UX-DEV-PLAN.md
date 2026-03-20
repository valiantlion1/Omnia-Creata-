# OmniaVault UI/UX Development Plan

> Last updated: 2026-03-20
> Purpose: Define how the product should look, behave, read, and feel across every major screen
> Scope: Product UI, UX, interaction, copy structure, motion, states, and responsiveness
> Tool-agnostic: This document is not written for Stitch specifically. It can be used with any design tool, designer, or implementation workflow.

---

## 1. Purpose Of This Document

This document exists to prevent the UI from drifting into:

- website-like layouts
- generic dashboards
- random visual experiments
- inconsistent interaction rules
- beautiful-but-useless mockups

It should answer:

- what the app should feel like
- what each screen is responsible for
- what belongs on each screen
- what should stay hidden until needed
- how the user should move through the product
- what kind of copy should be written
- how the product should behave on mobile and desktop

This is the UI/UX source of truth for OmniaVault.

---

## 2. Product UI Thesis

OmniaVault should feel like:

- a serious mobile app
- a fast personal thinking system
- a calm place to store and shape ideas
- a lighter alternative to bloated productivity suites

OmniaVault should not feel like:

- an admin panel
- a metrics dashboard
- a crypto interface
- a website pretending to be an app
- a concept art project with weak usability
- a generic note app with dark mode applied on top

The visual system must support the product promise:

1. capture quickly
2. organize later
3. return safely
4. keep building over time

If the user feels confused about what to do first, the UI has failed.

---

## 3. Core UX Principles

### 3.1 Capture is the heart

The product succeeds or fails on how fast and safe capture feels.

Users should be able to:

- open the app
- understand what to do
- type immediately
- save without stress

### 3.2 Content is the hero

The interface exists to frame the user's content, not compete with it.

This means:

- fewer decorative blocks
- less chrome
- fewer dashboard-style containers
- stronger reading and writing surfaces

### 3.3 Complexity must be progressive

The app can be powerful, but power must be layered.

By default the user should see:

- the primary action
- the current content
- the next useful action

Advanced controls should appear only when relevant.

### 3.4 Home must guide, not report

Home is not a reporting dashboard.

Home must answer:

- what should I do now
- what was I working on
- where do I continue

### 3.5 Premium means clear

Premium does not mean louder.

Premium means:

- confident structure
- strong spacing
- deliberate hierarchy
- restrained motion
- polished feedback
- high readability

### 3.6 App-first, not web-first

Even on desktop, the product should still feel like an application.

This means:

- no giant website hero blocks
- no marketing-like panels inside the app
- no random cards filling space
- no fake "enterprise dashboard" density

---

## 4. Visual System Rules

### 4.1 Palette policy

The palette is open.

The product is not locked to black and gold.

Valid directions include:

- dark-first premium
- soft neutral premium
- graphite and stone
- deep forest and brass
- smoked navy and ivory
- warm mineral tones

Whatever palette is chosen must be:

- premium
- calm
- readable
- durable over long sessions
- strong on mobile
- consistent across the whole system

Accent color rules:

- use one primary accent
- use one optional secondary accent at most
- do not scatter many unrelated highlight colors
- use accent for intent, not decoration

### 4.2 Surface system

The product should use layered surfaces rather than heavy borders everywhere.

Rules:

- main background should be quiet and stable
- interactive surfaces must be clearly distinct from the page background
- inputs must feel touchable
- floating elements must look intentional
- contrast should come from layering, not from random outlines

### 4.3 Radius and edge language

The app should use one consistent corner language.

Recommended:

- small radius for chips and utility controls
- medium radius for cards and sheets
- larger radius for major hero surfaces and bottom sheets

Avoid mixing too many corner styles in the same screen.

### 4.4 Iconography

Icons should be:

- clear
- modern
- consistent stroke weight
- secondary to labels, not replacements for labels

Icons should never carry meaning alone when text is needed.

### 4.5 Depth and 3D

3D effects should be subtle and rare.

Allowed:

- small lift on important cards
- gentle tilt on one or two hero surfaces
- soft parallax on splash or premium moments

Not allowed:

- game UI depth
- exaggerated floating cards everywhere
- fake holographic effects
- noisy glow abuse

---

## 5. Typography And Copy Structure

### 5.1 Typography behavior

Typography should make the product feel premium and controlled.

Rules:

- one strong display family or one clean unified family
- readable body text above all
- headings must be short and useful
- metadata must be quiet but still readable
- avoid too many font weights on one screen

### 5.2 Copy tone

The app should sound:

- calm
- clear
- trustworthy
- competent
- modern

It should not sound:

- mystical
- cinematic for no reason
- crypto-like
- over-branded
- childish
- like a startup slogan generator

### 5.3 Text hierarchy

Each screen should use four layers at most:

- title
- support copy
- content
- metadata

If there are more than four strong text layers on one screen, it is probably too busy.

### 5.4 Label writing rules

Use plain product language:

- Home
- Library
- Capture
- Projects
- Settings
- Save
- Restore version
- Continue writing

Avoid naming like:

- Vault ritual
- Oracle assistant
- Sanctum
- Nexus
- marketplace-style or creator economy language

---

## 6. Navigation Model

### 6.1 Mobile navigation

Primary nav on mobile:

- Home
- Library
- Capture
- Projects
- Settings

Rules:

- one clear bottom navigation
- active state must be obvious
- capture should feel important, but not clownishly oversized
- no duplicate navigation systems fighting each other

### 6.2 Desktop navigation

Desktop should still feel like an app shell.

Recommended structure:

- compact left rail or elegant side rail
- main content canvas
- optional secondary panel only when truly useful

Desktop should not become:

- a website with sections
- a marketing landing page
- a giant empty grid

### 6.3 Navigation behavior

The user should always know:

- where they are
- how to go back
- what the next primary action is

The active route should be visible with:

- color shift
- shape shift
- indicator
- label emphasis

---

## 7. Screen Inventory

Version one screens that need deliberate design:

- Splash
- Welcome / onboarding
- Sign up
- Sign in
- Forgot password
- Home
- Quick capture
- Full editor
- Entry detail
- Library
- Search results
- Projects list
- Project detail
- Version history
- Version diff
- Settings
- Profile / account
- Sync status
- Conflict resolver
- Release notes
- Offers / upgrade
- Empty states
- Loading states
- Error states

Version one support surfaces:

- tutorial tips
- export/share sheet
- archive/delete confirmation
- save feedback state
- offline warning
- AI suggestion sheet

Version two or later:

- canvas
- drawing
- attachments
- team features
- public sharing system
- marketplace

---

## 8. Screen-Level Design Requirements

## 8.1 Splash

Purpose:

- establish product quality immediately
- make launch feel intentional
- avoid feeling slow

Must contain:

- brand mark or wordmark
- restrained motion
- premium reveal

Must not contain:

- long loading theatrics
- generic spinner-first experience
- clutter

Behavior:

- full version on cold launch
- shorter version on later app returns
- reduce-motion safe variant

## 8.2 Welcome / Onboarding

Purpose:

- explain the product simply
- help new users understand the main value

Must contain:

- what the app is for
- why capture matters
- how projects and revisit flow work
- clear next actions

Should feel:

- concise
- polished
- product-led

Should not feel:

- like marketing slides
- over-explained
- full of feature dumps

## 8.3 Sign Up / Sign In / Forgot Password

Purpose:

- feel safe
- be easy
- not break visual quality

Must contain:

- clear title
- short support text
- input fields with visible states
- primary action
- alternate auth action or recovery path

Rules:

- inputs should feel native and touch-friendly
- screen should not be empty and dead
- auth should feel like part of the product family

## 8.4 Home

Purpose:

- orient the user
- drive the next action
- show where to continue

Must answer in seconds:

- what should I do now
- what was I working on
- where do I continue

Should contain:

- primary capture area or strong capture CTA
- continue where you left off
- active projects preview
- recent or pinned items
- light guidance for newer users

Should not contain:

- large analytics panels
- too many cards
- fake admin dashboard metrics
- giant hero marketing blocks

Layout guidance:

- first section: capture
- second section: continue/resume
- third section: projects
- fourth section: pinned/favorites or recent

## 8.5 Quick Capture

Purpose:

- get ideas into the system with the least friction possible

Must contain:

- optional title
- main body field
- entry type selector
- save action

Optional but secondary:

- project assignment
- tags
- category
- AI suggestions

Rules:

- body field must dominate the screen
- advanced controls start hidden or collapsed
- the screen should feel fast and quiet
- the user should never feel like they are filling a form

## 8.6 Full Editor

Purpose:

- let users deepen and refine an entry

Must contain:

- clear title field
- large content area
- save state
- version access
- secondary organization controls

Should feel:

- stable
- premium
- serious
- non-destructive

Must avoid:

- metadata overload at the top
- chat-like AI takeover
- card clutter inside the writing area

## 8.7 Entry Detail

Purpose:

- reading-first experience
- safe access to actions

Must contain:

- title
- body content
- key metadata
- related project or tags
- version access
- actions like edit, duplicate, archive, favorite

Rules:

- content is the hero
- metadata is secondary
- actions should be visible but not noisy

## 8.8 Library

Purpose:

- find existing work fast
- browse comfortably
- filter without confusion

Must contain:

- search
- type filters
- project/category filters
- clear result list

Should feel:

- list-first
- readable
- efficient
- scannable

Must avoid:

- card overload
- too many visible filters at once
- weak hierarchy between title and metadata

## 8.9 Search Results

Purpose:

- confirm quickly whether the needed item exists

Must contain:

- active query
- result count
- strong item hierarchy
- way to clear/refine search

Should show:

- title first
- useful snippet second
- supporting metadata third

## 8.10 Projects List

Purpose:

- make projects feel useful, not complicated

Must contain:

- list of active projects
- quick add project
- project summaries
- last activity

Should avoid:

- turning into a workspace operating system
- too many management controls on the first screen

## 8.11 Project Detail

Purpose:

- hold connected work together
- make a project feel alive

Must contain:

- project title
- summary
- related entries
- recent updates
- quick add to project

Rules:

- keep structure visible
- keep the page light enough for repeated use
- avoid dense dashboards

## 8.12 Version History

Purpose:

- create trust
- make change history understandable

Must contain:

- chronological list
- version number or label
- timestamp
- source
- restore action

Should feel:

- safe
- premium
- clear

Must avoid:

- looking like a dev tool panel
- burying restore behavior

## 8.13 Version Diff

Purpose:

- explain what changed

Must contain:

- previous version
- current version
- clear highlights
- restore or compare action

Rules:

- readability matters more than visual cleverness
- the user must understand change without mental strain

## 8.14 Settings

Purpose:

- account control
- sync visibility
- product preferences
- release notes

Must contain:

- account
- theme
- language
- sync state
- release notes
- export/backup readiness
- plan/offer surface if needed

Should feel:

- utility-first
- trustworthy
- calm

Must avoid:

- becoming a feature graveyard
- too many cards shouting for attention

## 8.15 Sync Status

Purpose:

- reassure the user
- explain what is happening

Must contain:

- current sync state
- latest sync timing
- pending local changes if any
- simple explanation

Must avoid:

- technical overload
- false certainty when state is unknown

## 8.16 Conflict Resolver

Purpose:

- resolve ambiguity safely

Must contain:

- what changed
- where conflict happened
- preserved options
- merge or keep-both paths

The tone must feel:

- safe
- understandable
- non-destructive

## 8.17 Release Notes

Purpose:

- show that the app evolves intentionally

Must contain:

- current version
- date
- concise change list
- previous notes

Should feel:

- clean
- simple
- useful

## 8.18 Offers / Upgrade

Purpose:

- explain value without ruining trust

Must contain:

- free tier reality
- what extra value paid access brings
- no fake urgency

Must avoid:

- aggressive sales tactics
- ad-like gimmicks
- fake enterprise promises

## 8.19 Empty States

Purpose:

- keep the product feeling alive even with no data

Every major screen needs an empty state.

Empty states should:

- explain what belongs here
- point to the next action
- feel visually finished

## 8.20 Loading And Error States

Loading states should:

- feel like the real layout
- use skeletons where useful
- avoid generic spinner-only patterns

Error states should:

- explain what failed
- give a useful next step
- not feel catastrophic unless data risk is real

---

## 9. Component System Requirements

Core components that must be designed systematically:

- app shell
- page header
- bottom navigation
- side rail
- buttons
- chips
- text input
- textarea
- dropdown/select
- list item
- card
- project card
- entry row
- search bar
- filter bar
- bottom sheet
- modal
- confirmation dialog
- toast / success feedback
- sync state badge
- version row
- diff block
- empty state module
- loading skeleton

Each component should define:

- default state
- hover state
- focus state
- pressed state
- selected state if relevant
- disabled state if relevant

---

## 10. Interaction Rules

### 10.1 Save behavior

The user must always understand whether work is saved.

Required feedback:

- saving
- saved
- unsaved draft
- sync pending
- sync failed

### 10.2 Favorite and pin behavior

These actions should feel light and immediate.

They need:

- visible state change
- optional micro-animation
- no modal interruption

### 10.3 Archive and delete behavior

Archive should feel reversible.

Delete should require stronger confirmation than archive.

### 10.4 Restore behavior

Restore must always feel safe.

The interface must make clear that history is not destroyed.

### 10.5 AI behavior

AI should be offered as a helper, not forced into the core writing flow.

AI must:

- preview suggestions
- allow apply or dismiss
- never silently overwrite content

---

## 11. Motion System

Motion should support confidence and clarity.

Allowed motion:

- splash reveal
- route transitions
- bottom sheet rise
- subtle card lift
- button press compression
- selected state transitions
- save success pulse
- gentle focus shifts

Motion should be:

- short
- smooth
- low amplitude
- device-friendly
- reduce-motion compatible

Motion should not be:

- flashy
- theatrical
- long
- used on every element

---

## 12. Writing Rules For UI Copy

Screen copy should be:

- short
- actionable
- human
- product-like

Good examples:

- Capture something
- Continue where you left off
- Save entry
- Restore version
- Open project
- Search your library
- Sync pending

Bad examples:

- Enter the vault ritual
- Unlock your inner genius
- Forge your destiny
- Navigate the nexus

Metadata style:

- plain
- short
- quiet

Examples:

- Updated 2 hours ago
- Version 4
- Sync pending
- Saved locally

---

## 13. Responsive Behavior

### Mobile

Primary target.

Rules:

- one-handed reach matters
- primary actions stay thumb-friendly
- bottom navigation remains clear
- inputs must not break with keyboard open

### Tablet

Should feel more spacious, not radically different.

Rules:

- more breathing room
- optional two-panel moments where useful
- keep app identity intact

### Desktop

Should still feel like the same app.

Rules:

- no giant website hero sections
- no stretched content with weak hierarchy
- use width intentionally
- allow stronger layout structure where helpful

---

## 14. Accessibility Requirements

The design must support:

- readable contrast
- clear focus states
- 44px minimum touch targets for primary interactions
- support for keyboard navigation where relevant
- reduce-motion support
- understandable labels
- no essential meaning conveyed by color alone

Accessibility is not optional polish.

It is part of premium quality.

---

## 15. PWA And Android Considerations

The app is web-first but app-intended.

This means the UI must work well in:

- browser
- installed PWA
- Android shell via Capacitor

Design implications:

- safe-area awareness
- status bar awareness
- bottom navigation spacing
- splash compatibility
- installable-app feel
- no website hero sections inside the app shell

---

## 16. What Must Be Explicitly Avoided

Do not design OmniaVault as:

- a dashboard template
- a SaaS analytics panel
- a crypto or trading UI
- a creator marketplace
- a prompt-selling platform
- a fantasy or sci-fi ritual product
- a bloated workspace suite
- a generic dark note app

Also avoid:

- too many cards
- too many visible filters
- too many simultaneous accents
- oversize metrics
- oversized empty decorative panels
- random gradients with no structural purpose

---

## 17. Acceptance Criteria For A Good Redesign

The redesign is successful when:

- Home clearly guides the user
- Capture becomes the strongest screen
- Library becomes easier to scan than the current app
- Editor feels premium and stable
- Version history feels like a trust feature
- Settings feel calm and useful
- Navigation feels obvious
- The app no longer feels like a website
- The product can support long-term daily use without visual fatigue

---

## 18. Final Instruction For Any Design Tool Or Designer

Design OmniaVault as a real premium mobile application for capturing and evolving ideas over time.

Do not optimize for visual drama alone.

Optimize for:

- clarity
- interaction quality
- safe writing
- retrieval speed
- long-term usability
- emotional trust

Every screen should feel like part of the same high-quality installed product.
