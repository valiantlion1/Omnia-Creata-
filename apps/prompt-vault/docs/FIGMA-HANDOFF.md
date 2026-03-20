# Figma Handoff Rules (OmniaVault)

Bu dokuman, OmniaVault UI/UX iyilestirme surecinde Figma ile kod tarafinin ayni sistemde kalmasi icin referans kurallaridir.

## 1) Tasarim token kaynagi

- Ana token kaynagi: [`apps/web/src/app/globals.css`](C:/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/app/globals.css)
- Tema yapisi: `:root` (light) + `.dark` (dark)
- Kritik semantic tokenlar:
  - `--background`, `--background-elevated`
  - `--surface`, `--surface-strong`, `--surface-muted`
  - `--text-primary`, `--text-secondary`, `--text-tertiary`
  - `--border`, `--border-strong`
  - `--accent`, `--accent-strong`, `--accent-soft`, `--accent-foreground`
  - `--shadow-soft`, `--shadow-panel`, `--shadow-glow`

## 2) Brand ve renk kurali

- OmniaVault icin belirli bir renk paleti zorunlu degildir.
- Secilecek palet su nitelikleri tasimalidir:
  - premium
  - sakin
  - okunakli
  - mobilde guclu
  - app-like
- Accent rengi sadece su alanlarda kullanilir:
  - Primary CTA
  - Active navigation state
  - Selected chips/controls
  - Hover highlight
- Genel yuzeylerde rastgele SaaS aksanlari kullanilmaz.

## 3) Tipografi ve ritim

- Font stack: Geist (urun odakli, kompakt, okunabilir).
- Basliklar editoriyal degil, urun panel ritmine uygun olmalidir.
- Mobil satir yukseklikleri okunabilirlik icin korunur (ozellikle kart/ozet metinleri).

## 4) Component kaynagi ve eslestirme

- Primitive UI katmani: [`apps/web/src/components/ui/primitives.tsx`](C:/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/components/ui/primitives.tsx)
- App shell ve navigation: [`apps/web/src/components/app/app-shell.tsx`](C:/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/components/app/app-shell.tsx)
- Dashboard: [`apps/web/src/components/app/dashboard-view.tsx`](C:/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/components/app/dashboard-view.tsx)
- Library & filters: [`apps/web/src/components/app/library-view.tsx`](C:/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/components/app/library-view.tsx)

Figma component isimlendirmesi onerisi:
- `PV/Button/Primary|Secondary|Ghost`
- `PV/Input/Text|Textarea|Select`
- `PV/Badge/Default|Accent|Warning`
- `PV/Surface/Card|Panel`
- `PV/Nav/SidebarItem|BottomNavItem|QuickDrawerItem`

## 5) Responsive davranis

- Hedef cihaz matrisi:
  - 360w Android
  - 390w iPhone
  - 768w tablet
  - 1366w laptop
  - 1440w+ desktop
- Mobilde thumb-zone uyumlu ana eylem hedefleri min ~44px korunur.
- Bottom nav + quick drawer pattern korunur (IA degistirilmez).

## 6) Motion dili

- Hareket dili: subtle, kisa, performans dostu.
- Hover/press animasyonlari 60fps hedefiyle hafif tutulur.
- Agir blur/3D efekt ve fazla glow kullanimi engellenir.

## 7) PWA / wrapper UI uyumu

- Manifest: [`apps/web/src/app/manifest.ts`](C:/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/app/manifest.ts)
- Standalone safe-area: app shell icinde `env(safe-area-inset-*)` kullanimi
- Service worker shell fallback: [`apps/web/public/sw.js`](C:/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/public/sw.js)

## 8) i18n parity kurali (EN + TR)

- Tum yeni label/metinler i18n anahtari ile tanimlanir.
- Mesaj kaynagi: [`packages/i18n/src/index.ts`](C:/Users/valiantlion/Desktop/Prompt%20Vault/packages/i18n/src/index.ts)
- Placeholder, ham key, yari ceviri kabul edilmez.

## 9) Guvenlik siniri (AI katmani)

- AI yardimi UI tarafinda buton/aksiyon olarak sunulur.
- Provider anahtari frontend/PWA'ya asla sizdirilmaz.
- AI cagri noktasi server-side route/proxy'dir (`/api/ai/assist`).

## 10) Figma ile calisma rutini

1. Figma'da ilgili ekran node'u sec.
2. Node -> mevcut component eslesmesini kontrol et.
3. Eger yeni varyant gerekiyorsa once `primitives.tsx` seviyesinde ekle.
4. Sayfa-level override yerine token/primitive uzerinden iyilestir.
5. Son adimda `npm run lint` + `npm run build` zorunlu.

## 11) Prompt Vault UI System dosya yapisi

Figma tarafinda kullanilacak ana dosya yapisi:

- `00 Foundations`
  - Color tokens
  - Typography scale
  - Spacing / radius / shadow tiers
  - Safe-area ve touch target referanslari
- `01 Components`
  - `PV/Button`
  - `PV/Input`
  - `PV/Textarea`
  - `PV/Select`
  - `PV/Badge`
  - `PV/Surface`
  - `PV/PageHeader`
  - `PV/NavItem`
  - `PV/PromptCard`
  - `PV/FilterChip`
  - `PV/MetricCard`
  - `PV/Drawer`
  - `PV/BottomNav`
- `02 App Core`
  - Dashboard
  - Library
  - Editor
  - Detail
  - Collections
  - Settings
- `03 Marketing`
  - Home
  - Features
  - Pricing
  - FAQ
  - How it works
- `04 Responsive`
  - 360w Android
  - 390w iPhone
  - 768w tablet
  - 1366w laptop
  - 1440w+ desktop
- `05 Motion`
  - Hover
  - Press
  - Focus
  - Drawer / bottom sheet transitions
  - PWA standalone edge cases
- `06 QA Notes`
  - Good / weak / redesign-not-needed notlari
  - EN/TR parity kontrolu
  - Device matrix bulgulari

## 12) Kod-Figma mapping onceligi

- Foundation degisikligi varsa once [`apps/web/src/app/globals.css`](C:/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/app/globals.css)
- Primitive degisikligi varsa once [`apps/web/src/components/ui/primitives.tsx`](C:/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/components/ui/primitives.tsx)
- Navigation/shell degisikligi varsa once [`apps/web/src/components/app/app-shell.tsx`](C:/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/components/app/app-shell.tsx)
- Card/list/detail/editor polish'i icin:
  - [`apps/web/src/components/app/prompt-card.tsx`](C:/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/components/app/prompt-card.tsx)
  - [`apps/web/src/components/app/dashboard-view.tsx`](C:/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/components/app/dashboard-view.tsx)
  - [`apps/web/src/components/app/library-view.tsx`](C:/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/components/app/library-view.tsx)
  - [`apps/web/src/components/app/prompt-editor.tsx`](C:/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/components/app/prompt-editor.tsx)
  - [`apps/web/src/components/app/prompt-detail-view.tsx`](C:/Users/valiantlion/Desktop/Prompt%20Vault/apps/web/src/components/app/prompt-detail-view.tsx)

## 13) Figma audit kural seti

- Her ana ekran icin 5 breakpoint zorunlu: `360`, `390`, `768`, `1366`, `1440+`.
- EN ve TR ayni node setinde test edilir; daha uzun TR label'lar erken yakalanir.
- Dashboard "hero" gibi degil, "command center" gibi degerlendirilir.
- Editor "serious creation workspace" kalite kapisindan gecmelidir.
- Library "search operating surface" olarak degerlendirilir; filtreleme yan rol degil ana urun davranisidir.
- Accent vurgu sadece secili, aktif, CTA veya highlight durumlarinda kullanilir.
