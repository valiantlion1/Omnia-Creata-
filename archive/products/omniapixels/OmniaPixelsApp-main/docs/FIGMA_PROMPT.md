# OmniaPixels — Figma Make AI Prompt

Aşağıdaki prompt'u Figma Make'e yapıştırarak mobil uygulama arayüzünü tasarlatabilirsin.

---

## 🎨 PROMPT (Kopyala-Yapıştır)

```
Design a premium mobile app UI for "OmniaPixels" — an AI-powered photo editing & enhancement app.

BRAND:
- App Name: OmniaPixels
- Company: OmniaCreata
- Tagline: "Tap. Enhance. Share."
- Logo style: Minimalist, elegant gold/green sparkle icon

DESIGN SYSTEM:
- Theme: AMOLED Dark Mode (true black #000000 background)
- Primary color: Vibrant green (#4ADE80 → #22C55E gradient)
- Accent color: Warm amber/gold (#F59E0B)
- Secondary: Teal (#14B8A6)
- Surface cards: White 3-5% opacity with frosted glass (glassmorphism)
- Borders: White 8% opacity, rounded 24-32px
- Typography: Inter or SF Pro, bold headings, light body text
- Icons: Lucide style, outlined
- Spacing: Generous padding (16-24px)
- Animations hint: Subtle glow effects behind key elements

SCREENS TO DESIGN (in order):

1. SPLASH SCREEN
   - True black background
   - Centered OmniaPixels logo with ambient glow circle behind it
   - Subtle fade-in animation indicator

2. ONBOARDING (3 pages, swipeable)
   - Page 1: ✨ "OmniaPixels" — "Transform your photos with cinematic AI enhancement"
   - Page 2: ⚡ "ZeroCost Local" — "Process images privately using your own device. No internet needed."
   - Page 3: ☁️ "Premium Cloud" — "Unlock lightning speed with Pro cloud servers"
   - Each page: Large gradient circle icon (160px), bold title, subtitle
   - Bottom: Dot indicator + "Next"/"Get Started" gradient button + "Skip" link
   - Ambient blurred color glows in corners

3. LOGIN / REGISTER SCREEN
   - Hero: App logo (small, 80px) + "Welcome to OmniaPixels"
   - Subtitle: "Log in to unlock infinite AI generations"
   - Glassmorphism card containing:
     - Email input field (rounded, dark fill)
     - Password input field (with show/hide toggle)
     - "Forgot Password?" link
     - "Log In" gradient button (green-to-yellow, full width)
     - Divider: "or continue with"
     - Apple + Google social login buttons (side by side)
   - Below card: "Skip for now (Local only) →" text button
   - Background: Slow-moving colored glow orbs

4. MAIN SCREEN (Bottom Navigation — 3 tabs)
   Tab bar: Frosted glass, icons + labels
   - Tab 1: Editor (photo icon)
   - Tab 2: Gallery (grid icon)
   - Tab 3: Profile (person icon)

5. EDITOR HUB (Tab 1 — Home/Main screen)
   - Top bar: "OmniaPixels" gradient text (left) + "⚡ 10 Credits" badge (right, pill shape)
   - Center: Giant glassmorphism touch card (350px tall, rounded 40px)
     - Gradient circle with camera/photo icon (64px)
     - "Tap to Edit Photo"
     - "AI Enhancement & Upscaling"
   - Tapping opens a BOTTOM SHEET with AI tools:
     - 🎬 "4x Cinema Upscale" — Uses 1 Credit
     - ✨ "AI Deblur" — Uses 1 Credit
     - 🖼️ "AI Denoise" — Uses 1 Credit
     - 👤 "Remove Background" — Uses 1 Credit
     - 🎨 "Style Transfer" — Uses 2 Credits
     - Each item: Icon circle (colored) + title + subtitle + chevron

6. GALLERY SCREEN (Tab 2)
   - Header: "My Gallery" gradient text
   - 2-column masonry grid of processed photos
   - Each card: Rounded 24px, subtle shadow, bottom label ("4x Upscaled", "BG Removed")
   - Empty state: Illustration + "No edits yet. Tap Editor to start!"

7. PROFILE / SETTINGS (Tab 3)
   - Gradient circle avatar (initials or photo)
   - Username + email below
   - Setting tiles (rounded cards):
     - 👤 Account Details
     - 💎 Subscription — "Free Plan (10 Credits)" → chevron
     - 🎨 Appearance — "Dark Mode"
     - 🌐 Language — "English"
     - 📊 Usage Stats
   - "Logout" red text button at bottom

8. PAYWALL / SUBSCRIPTION SCREEN
   - Animated gradient background (radial, slow rotation hint)
   - Crown/diamond icon (64px)
   - "OmniaPixels+" gradient title (large)
   - "Unlock the full power of AI"
   - Two plan cards:
     - FREE: $0/mo — 10 Credits/day, Standard Queue, Ads, Basic Upscale
     - PRO: $9.99/mo — Unlimited, Priority GPUs, No Ads, All Tools, ZeroCost
       → "BEST VALUE" badge
   - "Upgrade to Pro Now" gradient CTA button
   - "Cancel anytime. Terms apply." fine print

9. QUEUE / PROCESSING SCREEN
   - Header: "Processing Queue"
   - List of job cards:
     - Job title + status badge (Processing 45% / Completed)
     - Progress bar (gradient green or amber)
     - Subtitle ("Applying 4x Upscale..." or "Ready to download")
     - Download button for completed jobs
   - Empty state: "No active jobs"

10. BEFORE/AFTER COMPARISON (overlay or separate screen)
    - Split-view slider (drag left/right)
    - "Before" label left, "After" label right
    - Bottom: "Save" + "Share" + "Discard" action buttons

MOBILE CONSTRAINTS:
- Design for iPhone 15 Pro frame (393 x 852 points)
- All touch targets minimum 44px
- Bottom navigation bar height: 83px (including safe area)
- Status bar: 54px top safe area
- Use iOS-style safe areas

STYLE REFERENCE:
- Think: Lensa AI + Remini + VSCO premium dark mode
- Premium, luxurious feel — NOT flat/basic
- Glassmorphism + gradient accents + ambient glows
- Every screen should feel "alive" with subtle depth

OUTPUT:
- Provide all 10 screens as separate frames
- Include a component library frame with: buttons, input fields, cards, badges, icons
- Name layers properly for developer handoff
```

---

## 💡 Kullanım İpuçları

1. **Figma Make'e yapıştır** — Yukarıdaki prompt'u olduğu gibi kopyala
2. **Ekranları tek tek de yaptırabilirsin** — Çok uzun gelirse parçala
3. **Sonra export et** — Frame'leri PNG olarak export edip repo'ya koy (`docs/figma_screens/`)
4. **Bana ver** — Ben Flutter koduna dönüştürürüm
