# OmniaCreata Studio — Frontend UI Improvement Prompt
## Claude Code için · Tarih: 2026-04-05

Aşağıdaki talimatlar, mevcut Vite/React/Tailwind frontend codebase'ini (apps/studio/web/src) iyileştirmeye yöneliktir. Her görev kendi dosyasıyla sınırlıdır. Yeni dependency ekleme. Mevcut tasarım diline (koyu arka plan, rounded-[26-28px], CSS değişkenler --primary / --accent, Inter font, var olan animasyonlar) tamamen sadık kal.

---

## 1. Create (Compose) Sayfası — `pages/Create.tsx`

**Felsefe: Sade ve akıllı. Fazla kontrol görünmez, ama erişilebilir olur.**

### 1a. "Advanced" Collapsible Drawer
State'te zaten `negative_prompt`, `seed`, `steps`, `cfg_scale` mevcut ama UI'da hiç gösterilmiyor. Bunları gizli bir drawer'a taşı:

- Prompt textarea'nın hemen altına, sağa yaslanmış küçük bir `<button>` ekle: ikon olarak `SlidersHorizontal` (lucide), label `"Advanced"`, tıklanınca `showAdvanced` state toggle'ı
- Drawer açıldığında `animate-slide-up` ile yumuşakça aşağı açılır, dışarıdan bakanın gözüne çarpmaz
- Drawer içeriği (compact, 2 kolon grid):
  - **Negative prompt**: küçük textarea, placeholder `"Things to avoid: blurry, low quality..."`, max 3 satır
  - **Seed**: number input, sağında küçük "🎲" butonu rastgele seed atar (`Math.floor(Math.random() * 1_000_000_000)`)
  - **Steps**: range slider 10–50, default 28, yanında anlık değer göstergesi
  - **CFG Scale**: range slider 1–15, default 6.5, yanında anlık değer
- Drawer kapalıyken, eğer `negative_prompt` doluysa veya `seed` değeri default'tan farklıysa drawer butonunda küçük bir dot indicator göster (kullanıcıya "burada aktif ayar var" sinyali)

### 1b. Model Tooltip
Model seçim dropdown'unda her modelin yanına küçük bir bilgi ikonu ekle. Hover/focus'ta `title` attribute ile şu açıklamaları ver:
- FLUX.1 Schnell → "En hızlı model. 4 adımda üretir."
- SDXL Base → "Dengeli kalite ve hız. Geniş stil yelpazeye uygun."
- RealVis XL → "Fotorealistik çıktılar için optimize."
- Juggernaut XL → "Yüksek detay ve derin renk tonları."
- Diğerleri → model label'ını kullan

### 1c. Üretim Sırasında Prompt Textarea Kilidi
Şu an form submit edilince ne olduğu belli değil. Aktif bir generation varken (`pendingToasts` dolu ve hepsi terminal değilse) prompt textarea'ya `disabled` class ekle ve hafif `opacity-50` yap. Bu sayede "işleniyor" hissi net olur.

### 1d. Credit Uyarısı
`creditSummary` mevcut. Eğer kalan kredi 10'un altındaysa, aspect ratio butonlarının hemen üstüne şu uyarıyı göster:
```
⚠ Sadece {kalan} krediniz kaldı. Plan yükseltmek için → /subscription
```
Stil: `text-xs text-amber-400 bg-amber-400/10 rounded-lg px-3 py-1.5`

---

## 2. Chat Sayfası — `pages/Chat.tsx`

**Felsefe: Modlar daha görünür olmalı, ama arayüz yine de temiz kalmalı.**

### 2a. Mode Switcher UI Yenileme
Kodda `composeModes = ['Think', 'Vision', 'Edit']` var ama arayüzde bu modlar net gösterilmiyor. Input alanının üstüne (ya da sağ kenarına) şık bir mode pill grubu ekle:

```
[ Think ]  [ Vision ]  [ Edit ]
```

- Aktif mod: gradient arka plan `(--primary → --accent)`
- İnaktif: `bg-white/[0.04] text-zinc-400`
- Her modun yanına küçük ikon: Think → `Brain`, Vision → `Eye`, Edit → `Wand2` (lucide)
- Tooltip ile kısa açıklama:
  - Think: "Prompt yardımı ve yaratıcı öneri"
  - Vision: "Görsel yükle, analiz et, ilham al"
  - Edit: "Mevcut görsel üzerinde düzenleme yönlendirmesi"

### 2b. "Text-only conversation" Toggle
Şu an bir chip olarak var ama öne çıkmıyor. Mode switcher'ın yanına veya altına taşı, icon olarak `MessageCircle` kullan, aktifse hafif vurgulu göster.

### 2c. Konuşma Başlığı
Yeni konuşmada sol üstte "New Chat" veya `titleFromDraft` sonucunu göster. Başlığın yanına küçük bir `Pencil` ikonu koy, tıklanınca inline edit açılsın (basit `contentEditable` veya input ile).

### 2d. Boş Konuşma Empty State
Hiç mesaj yokken ekranın ortasında:
- OmniaCreata logosu (küçük)
- Başlık: `"Ne yaratmak istiyorsun?"`
- Alt açıklama: `"Prompt iste, görsel analiz et, ya da düzenleme planla."`
- 3 adet quick-start chip: `"Bir prompt yaz"` / `"Görsel yükle"` / `"Stil öneri"`
  (Tıklanınca ilgili mode'a geçer ve textarea'ya focus olur)

---

## 3. Explore Sayfası — `pages/Explore.tsx` (veya mevcut Home/Explore component)

**Felsefe: İlham verici, keşifsel.**

### 3a. Görsel Kart Hover Efekti
Her görsel kart üzerine gelince:
- Kartın üzerine yarı-şeffaf koyu bir overlay (`bg-gradient-to-t from-black/70 via-black/20 to-transparent`) slide-up ile açılır
- Overlay içinde: prompt metni (2 satır, `text-sm text-white/90`) ve küçük "❤ Like" butonu
- Transition: `transition-all duration-300`

### 3b. Filtre Chip'leri Animasyonu
"Trending / Newest / Top liked / Styles" chip'leri arasında geçişte aktif chip'in altında küçük bir sliding indicator çiz (absolute positioned `div`, `translate-x` ile animate).

### 3c. Görsel Sayısı Badge
Sağ üst köşede toplam görsel sayısını gösteren küçük bir badge ekle: `"9 showcase images"` gibi. Community içerik gelince otomatik güncellenir.

---

## 4. Library Sayfası — `pages/MediaLibrary.tsx`

**Felsefe: Profesyonel, organize, işlevsel.**

### 4a. Empty State İyileştirme
"No images yet." state'ini zenginleştir:

```
[Görsel placeholder icon - büyük, muted]
Henüz bir görsel yok
Compose'a git ve ilk görselini üret. Otomatik burada görünür.
[→ Compose'a Git] butonu  (href="/create")
```

Stil: `text-zinc-500`, buton gradient, `rounded-2xl`

### 4b. View Mode Persistence
Şu an `grid` / `list` view mode var. Bunu `localStorage`'a kaydet (`oc-lib-view-mode`). Sayfa yenilenince son tercih korunur.

### 4c. Processing Görseller için Shimmer
Library'de `processing` status'lu görseller için gerçek görsel yerine shimmer animation placeholder göster:
```css
/* tailwind: animate-shimmer */
bg-gradient-to-r from-white/[0.03] via-white/[0.07] to-white/[0.03]
```

### 4d. Bulk Select Mode
Görsel listesinde bir "Seç" butonu ekle. Aktifken her kartın sol üst köşesinde checkbox belirir. Seçili görseller için toplu "Koleksiyona Ekle" ve "Sil" aksiyonları footer'da çıkar. Mevcut `selectedIds` state mantığına entegre et.

---

## 5. Elements/Styles Sayfası — `pages/Elements.tsx`

**Felsefe: Yaratıcı araç kutusu, genişleyebilir.**

### 5a. "Create Style" Butonu — Placeholder Modal
"Create style" kartına tıklayınca basit bir modal aç:
- Başlık: `"Yakında"`
- Açıklama: `"Kendi stil presetini oluşturma özelliği Creator planında geliyor."`
- Buton: `"Creator Plana Bak"` → `/subscription`
- Modal: `fixed inset-0 bg-black/60 backdrop-blur-sm` + beyaz/dark card ortada

### 5b. Style Kart İyileştirme
Her style kartına:
- Hover'da üstten gelen overlay: `"Stil uygula →"` metni
- Kartın altına kısa bir description ekle (hardcode):
  - Dramatic Cinema: `"Yüksek kontrast, sinematik ışık"`
  - Soft Editorial: `"Pastel tonlar, yumuşak bokeh"`
  - Product Gloss: `"Parlak yüzey, stüdyo aydınlatması"`
- Tag chip'i: `"Omnia"` → mor gradient badge

### 5c. "My Styles" Sekmesi Empty State
```
[Palette icon]
Henüz özel stilin yok
Creator planında kendi stil presetlerini oluşturabilirsin.
```

---

## 6. Settings Sayfası — `pages/Settings.tsx`

**Felsefe: Temiz, güvenli, bilgilendirici.**

### 6a. Kredi Göstergesi Görselleştirme
"30 credits remaining" metninin altına ince bir progress bar ekle:
- Free plan: 60 kredi max
- Pro: 1200 max
- Bar rengi: `< 20%` → kırmızı, `20-50%` → sarı, `> 50%` → gradient
- Animasyonlu: `transition-[width] duration-700`

### 6b. Provider Status Kartları İyileştirme
`system diagnostics` bölümündeki provider status'ları (fal, runware, huggingface vb.) için:
- `healthy` → yeşil dot + `"Çalışıyor"`
- `not_configured` → sarı dot + `"Yapılandırılmamış"`
- `unhealthy` / error → kırmızı dot + `"Hata"`
- Her provider için küçük kart yapısı, sadece bir `div` ile

### 6c. Tema Seçici Grid
Tema seçimi şu an liste gibi duruyor. 2×4 veya 4×2 grid yap, her tema için gerçek renk swatch göster (`THEME_OPTIONS[].colors` zaten var). Aktif tema etrafına border-2 + ring animasyonu ekle.

### 6d. Danger Zone
"Delete Account" butonunu ayrı bir `"Tehlikeli İşlemler"` section'a taşı, üstüne `<hr>` ve kırmızı eyebrow `"DANGER ZONE"` etiketi koy. Böylece sayfanın altında net bir görsel ayrım olur.

---

## 7. Global / StudioShell — `components/StudioShell.tsx`

### 7a. Sidebar Aktif Sayfa Highlight
Mevcut `isActive` mantığı varsa kontrol et — sidebar'daki aktif nav item için sadece renk değil, ince bir `border-l-2` accent çizgisi ekle (sol kenarda ince dikey çizgi).

### 7b. Kredi Sayacı Sidebar'da
Sidebar'ın en altına (logout butonunun üstüne) küçük bir kredi widget'ı ekle:
```
[Zap icon] 30 kredı  [→ Yükselt]
```
- 10'un altındaysa metin rengi `text-amber-400` olur
- `/subscription` sayfasına link

### 7c. Keyboard Shortcut Tooltipleri
Ctrl+Enter (generate) zaten var. Tüm önemli aksiyonlara `title` attribute ile kısayol bilgisi ekle. Ayrıca `?` tuşuna basınca küçük bir shortcuts overlay açılsın:
```
Ctrl + Enter   → Görsel üret
Shift + Enter  → Yeni satır (Chat)
Escape         → Modal kapat
```

---

## 8. Landing Sayfası — `pages/Splash.tsx` (veya Landing component)

Çok az değişiklik — sadece şunlar:

### 8a. "v0.5.1-alpha" Badge
Hero section'da veya nav'da versiyon badge'ini daha görünür yap: küçük pill `"alpha"` label, renk `bg-amber-400/15 text-amber-400 ring-1 ring-amber-400/30`

### 8b. CTA Butonu Mikro-animasyonu
"Open Studio" butonuna `hover:scale-[1.03] active:scale-[0.98]` transition ekle.

---

## Teknik Notlar

- **Hiçbir yeni npm paketi ekleme.** Tüm animasyonlar mevcut Tailwind class'ları veya inline CSS ile.
- **Mevcut CSS değişkenleri** (`--primary`, `--accent`, `--primary-light`) kullan, hardcode renk yazma.
- **Responsive**: Her değişiklik mobile-first olmalı. `md:` breakpoint'leri koru.
- **Erişilebilirlik**: Yeni butonlara `aria-label`, modallara `role="dialog"` ve `aria-modal="true"`.
- **TypeScript strict**: Type assertion (`as any`) kullanma. Tüm yeni state'ler typed olsun.
- **Dosya başına odaklan**: Her görev yalnızca belirtilen dosyayı değiştirir. Cross-file refactor yapma.

---

## Öncelik Sırası (Hangisini Önce Yapmalısın)

1. 🔴 **Create.tsx** — Advanced drawer (1a) + Credit uyarısı (1d)
2. 🔴 **Chat.tsx** — Mode switcher UI (2a) + Empty state (2d)
3. 🟡 **StudioShell.tsx** — Sidebar kredi widget (7b) + Active highlight (7a)
4. 🟡 **MediaLibrary.tsx** — Empty state (4a) + Processing shimmer (4c)
5. 🟡 **Elements.tsx** — Create style modal (5a) + Kart iyileştirme (5b)
6. 🟢 **Settings.tsx** — Kredi progress bar (6a) + Tema grid (6c)
7. 🟢 **Explore.tsx** — Hover overlay (3a)
8. 🟢 **Splash.tsx** — Mikro dokunuşlar (8a, 8b)
