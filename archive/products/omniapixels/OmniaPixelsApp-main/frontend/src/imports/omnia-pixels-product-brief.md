Use the attached MASTER_PLAN_TR document as the single source of truth for product scope, user flows, feature hierarchy, monetization, branding, security expectations, and UX priorities.

Design OmniaPixels as a flagship mobile-first AI photo editing product inside the OmniaCreata ecosystem.

This is NOT a generic concept app.
This is a production-grade premium commercial product UI for a real app that will later be implemented in Flutter.

PRODUCT CORE
OmniaPixels is a high-end AI-powered mobile image editing ecosystem built for speed, simplicity, visual polish, and trust.
Its promise is:
“Professional photo editing in one touch.”

The product must feel like:
- premium
- cinematic
- modern
- high-end
- globally launchable
- commercially viable
- implementation-friendly
- elegant but not fragile
- powerful but easy for non-experts

The app should feel like a refined fusion of:
- premium mobile creative software
- modern AI-assisted editing tools
- polished subscription product UX
But it must still have its own identity and must not look derivative or generic.

BRAND SPIRIT
The soul of the product must match both OmniaPixels and OmniaCreata:
- OmniaPixels = cinematic AI image enhancement, editing, transformation, before/after magic, creator empowerment
- OmniaCreata = premium ecosystem, elegant innovation, artistic intelligence, flagship brand quality
- The UI must feel expensive, memorable, and emotionally attractive
- It should create “wow” immediately without becoming cluttered, playful, or visually noisy

VISUAL DIRECTION
Create a luxury mobile UI system with:
- dark premium default theme
- support for Light / Dark / AMOLED variants
- gold-accented OmniaCreata signature branding
- true black or near-black foundations where appropriate
- elegant gradients, soft cinematic glow, subtle depth
- refined glass/frosted layering only when useful, never excessive
- premium cards, strong spacing discipline, clean hierarchy
- smooth micro-interactions
- Rive/Lottie-ready motion language
- 60fps-feeling transitions
- lightweight-feeling UI, never heavy or laggy
- reduce motion compatibility should be possible later

DESIGN PRINCIPLES
- Mobile-first
- Designed to be realistically implementable in Flutter
- Built as reusable product UI, not dribbble-only eye candy
- Strong visual hierarchy
- Clear touch targets
- Multilingual-ready layout for EN / TR / JP / DE
- Accessibility-aware sizing, spacing, contrast, and large text support
- Must feel trustworthy during AI processing
- Must visually communicate performance, safety, premium quality, and polish

PRODUCT PRIORITIES
The product must communicate these truths clearly:
- open → edit → share in 3-step spirit
- AI suggestions make complex editing simple
- local/private processing is respected
- cloud processing is premium and fast
- queue and progress are transparent and trustworthy
- free users can still do meaningful work
- pro users get speed, quality, and freedom
- enterprise exists but should not dominate the consumer UX

USER FLOW TO REFLECT
Design the app around this realistic flow:
1. Splash / branded startup
2. Onboarding
3. Permissions / privacy trust cues
4. Login / register / social sign-in / optional local-only skip
5. Home dashboard
6. Import image(s)
7. AI type detection / smart suggestions
8. Editor Hub
9. Queue / processing progress
10. Gallery / compare
11. Export / share
12. Settings / account / plan management

REQUIRED SCREENS — FIRST PASS
Create polished, flagship-quality mobile screens for:
1. Design system / style foundation
2. Splash screen
3. Onboarding flow (3 screens)
4. Login / Register / Social sign-in
5. Home dashboard
6. Import flow
7. Editor Hub
8. Queue / Processing
9. Gallery
10. Before / After Compare
11. Export / Share
12. Profile / Settings
13. Pricing / Subscription / Credits
14. Empty / Loading / Error / Permission states

SPLASH SCREEN
Design a premium startup experience:
- OmniaPixels logo centered
- ambient cinematic glow
- subtle animation-ready composition
- premium black/luxury tone
- should feel like a flagship creative app opening, not a basic loader

ONBOARDING
Create a 3-screen onboarding flow that visually explains:
- cinematic AI enhancement
- private/local ZeroCost processing
- premium cloud speed and advanced features

Onboarding must feel:
- elegant
- inspiring
- premium
- easy to understand
- emotionally strong

Use large iconography or visual hero shapes, strong typography, subtle glow, and product-grade CTA hierarchy.
The user should immediately understand that OmniaPixels is powerful, fast, intelligent, and premium.

LOGIN / AUTH
Design login/register/social auth with:
- email/password
- Google sign-in
- Apple-style sign-in if visually appropriate
- optional “skip for now / local only” path
- premium but trustworthy card composition
- strong privacy/confidence cues
- should feel secure, modern, and clean

HOME DASHBOARD
Create a home screen that feels like a flagship AI editing app dashboard:
- module grid or action hub
- favorites / quick actions
- smart suggestions
- visible credits or plan badge
- clear entry point into editing
- elegant navigation
- premium top area branding
- lightweight but powerful

EDITOR HUB
This is the emotional core of the product.
It must feel like the main hero experience.

Requirements:
- layered editing feel
- AI suggestions
- crop / filter / LUT / enhancement access
- undo / redo
- compare access
- visual sense of premium creative control
- easy for non-experts, but still powerful
- should not feel cluttered or technical
- should feel more like a cinematic AI studio than a basic filter app

QUEUE / PROCESSING
This screen must feel especially trustworthy and polished.
Requirements:
- live progress percentages
- active job cards
- processing states
- cancel / retry actions
- finished / failed / waiting states
- system confidence, not confusion
- visual clarity that the app is intelligently doing real work
- should feel premium, reliable, and smooth

GALLERY
The gallery must feel more like a premium creative results library than a simple photo grid.
Include:
- collection feel
- timeline or smart grouping feel
- processed result cards
- elegant masonry or grid layout
- clear empty state
- labels for edit types if helpful

COMPARE
Design a strong before/after experience:
- split slider
- zoom-friendly layout
- clean metadata area if appropriate
- save / share / discard controls
- dramatic but tasteful visual impact

EXPORT / SHARE
This screen must clearly communicate:
- export presets
- quality options
- format choices
- social/share readiness
- free vs pro behavior
- free branded export logic
- watermark / badge rules
- user confidence that the output is premium and controlled

FREE / PRO / ENTERPRISE DIFFERENTIATION
Reflect real product tier logic visually:
- Free: useful but limited, slower queue, branding on exports, ads/rewards possible
- Pro: faster, cleaner, no watermark, premium AI tools, better queue priority
- Enterprise: advanced/power-user/white-label oriented, but not visually dominant in the main app

The pricing/premium screen must:
- feel aspirational, not spammy
- look premium and conversion-ready
- highlight value clearly
- integrate naturally into the OmniaPixels visual language

FREE BADGE RULE
Free tier outputs must visibly support OmniaPixels / OmniaCreata branded badge logic.
This should be reflected in export-related UI and premium upsell states.

THEMES
Support visual logic for:
- Dark
- Light
- AMOLED

The product should look especially stunning in dark mode, but still polished in light mode.

MULTILINGUAL + ACCESSIBILITY
Design layout components so they can scale well for:
- English
- Turkish
- Japanese
- German

Also account for:
- large text
- strong contrast
- clear iconography
- comfortable spacing
- readable controls
- accessibility-aware hierarchy

STATES TO INCLUDE
Do not only show happy-path mockups.
Also design polished product states for:
- empty home
- empty gallery
- no jobs in queue
- first-time editor
- loading skeletons
- shimmer states
- offline / no internet
- local-only mode
- quota reached
- reward-ad unlock
- processing failed
- retry flow
- permissions needed
- export success
- account upsell
- plan comparison state

MOTION LANGUAGE
The design must feel animation-ready:
- subtle transitions
- shimmer/skeleton logic
- premium micro-interactions
- shared transitions between Home → Editor, Import → Queue, Editor → Compare
- no cheap exaggerated effects
- motion should support delight, trust, and product quality

IMPORTANT IMPLEMENTATION MINDSET
This design must be:
- realistic for a real Flutter production app
- component-based
- scalable
- reusable
- commercially viable
- not a shallow visual mockup

Avoid:
- generic startup SaaS look
- cheap neon cyberpunk style
- childish or playful aesthetic
- overdone glassmorphism
- cluttered editing panels
- unrealistic impossible layouts
- empty “pretty but useless” screens

FINAL QUALITY BAR
The result must feel like a launch-ready flagship mobile AI creative app:
- premium
- cinematic
- modern
- desirable
- believable
- implementation-friendly
- visually strong enough that the user immediately says “this looks like a real top-tier product”

Follow the attached MASTER_PLAN_TR document exactly for product structure and meaning, but improve the visual execution to flagship quality.
Prioritize real product UX and premium execution over decorative experimentation.