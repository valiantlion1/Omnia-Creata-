# OmniaPixels - Product Blueprint

> Son guncelleme: 2026-03-17
> Durum: Migration in progress, incremental cleanup aktif

---

## 1. Urun Kimligi

### Tek Cumle
**OmniaPixels** - telefon galerisi, temel/pro duzenleme araclari ve on-device AI iyilestirme deneyimini tek mobil akista birlestiren urun.

### Branding
- **Urun adi:** OmniaPixels
- **Tagline:** Professional Photo Editing, AI-Powered Upscale - Right on Your Phone
- **Domain:** `pixels.omniacreata.com` (ileride web/marketing yuzeyi icin)
- **Play Store:** "OmniaPixels - AI Photo Editor & Upscaler"

### Problem
- Telefon galerileri hizli ama duzenleme tarafinda yetersiz.
- Profesyonel editorler guclu ama mobilde agir, karmasik veya pahali.
- AI iyilestirme uygulamalarinin buyuk bolumu cloud-first ve maliyet/rate-limit bagimli.
- Kullanici galeriden duzenleme ve iyilestirmeye giden tek bir akisi istiyor.

### Hedef Kitle
- Sosyal medya icerik ureticileri
- Fotograf duzenlemeyi mobilde hizli yapmak isteyen kullanicilar
- E-ticaret gorseli iyilestiren kucuk ekipler
- Dusuk cozunurluklu AI gorsellerini toparlamak isteyen creatorlar

---

## 2. Repo Gercekligi

Bugun repo icinde asagidaki yapilar birlikte bulunuyor:

- `mobile/android`
- `mobile/flutter`
- `mobile/omnia_android`
- `mobile/omnia_flutter`
- `backend`
- `packages`
- `ops`
- `tests`
- `docs/plans`

Bu yuzeylerin tamami ayni anda "canli urun" degil, ama hepsi de cop kabul edilmiyor. Mevcut backend, presetler, modul adlandirmalari, is akislari ve test malzemeleri kisa vadede referans/migration girdisi olarak degerli.

### Aktif migration yorumu

- **MVP uygulama yolu:** `mobile/flutter`
- **Referans/migration yuzeyleri:** `backend`, `packages`, `ops`, `tests`, `docs/plans`
- **Arsiv karari:** ancak yerine gecen yol dogrulaninca verilir

Bu belge urun planidir; repo taxonomy kararlarini override etmez.

---

## 3. Urun Yonelimi

### Ana karar
OmniaPixels icin aktif plan **incremental cleanup** yaklasimidir.

Bu ne anlama gelir:

- Urun sifirdan clean-slate rewrite olarak anlatilmaz.
- `mobile/flutter` MVP icin ana urun yolu olur.
- Mevcut Python backend ve ilgili yuzeyler hemen silinmez veya "artik yok" diye ilan edilmez.
- Cloud bagimliligi MVP'den cikarilir; cloud yardimlari ancak sonraki fazlarda, acik maliyet ve kota notlariyla eklenir.

### Urun prensipleri

- **Local-first:** Temel deger cihaz ustunde calisir.
- **Mobile-first:** Ilk gercek urun yuzeyi mobil uygulamadir.
- **Budget-aware:** MVP, zorunlu cloud inference gerektirmez.
- **Migration-friendly:** Eski yuzeylerden yararli kavramlar tasinabilir.

---

## 4. MVP Kapsami

### Hedef
Play Store'a gidebilecek, tek kullanicili, local-first bir mobil photo workflow cikarmak.

### MVP ozellikleri

- Telefon galerisi goruntuleme
- Album/grid akisi
- Tam ekran onizleme
- Crop, rotate, flip
- Brightness, contrast, saturation, warmth ayarlari
- Kucuk preset/filter seti
- On-device 2x upscale
- Before/after karsilastirma
- Save as new file
- Native share akisi

### MVP mimarisi

- **App shell:** Flutter
- **State:** Riverpod veya esdeger test-edilebilir state yonetimi
- **Media access:** `photo_manager`
- **Image editing:** yerel goruntu isleme pipeline'i
- **Storage:** cihaz dosya sistemi + yerel veritabani/ayar depolama
- **AI:** on-device model veya yerel isleme pipeline'i

### MVP'de olmayanlar

- Zorunlu cloud upscale fallback
- Zorunlu auth
- Zorunlu sync
- Herkes icin acik web editor
- Sunucuya dayali ana isleme pipeline'i

---

## 5. Mimari ve Klasor Posturu

### Kisa vadeli source of truth

```text
apps/omniapixels/
├── mobile/
│   └── flutter/        Active MVP implementation path
├── backend/            Reference and migration surface
├── packages/           Product-local shared/reference code
├── ops/                Scripts and operational references
├── tests/              Existing validation/reference material
└── docs/
    ├── BLUEPRINT.md
    └── plans/
```

### Temizlik kurali

- `mobile/flutter` disindaki her sey "hemen arsivlenecek" diye yorumlanmayacak.
- Her yuzey icin su soru sorulacak: "Bunun yerine gecen dogrulanmis bir yol var mi?"
- Cevap "hayir" ise o yuzey migration yuzeyi olarak kalir.

### Backend yorumu

Mevcut Python backend:

- MVP runtime'i degildir
- sunucu bagimli oldugu icin aktif urun yolu degildir
- fakat orchestrator, preset, islem isimleri ve hata durumlari icin referans degeri tasir

---

## 6. Fazlar

### Faz 1: Local-first MVP

- Flutter mobil shell'i toparla
- Galeri + duzenleme + save/share akislarini tamamla
- On-device upscale'i urunlestir
- Performans, APK boyutu ve izin yuzeyini kontrol altina al

### Faz 2: Pro editing ve opsiyonel cloud yardimlari

- Background removal
- Face restore
- Batch processing
- History/undo
- Opsiyonel cloud fallback, ancak ancak su kosullarla:
  - metered hizmet olarak planlanir
  - kota/rate-limit dokumante edilir
  - "free ve sinirsiz" diye sunulmaz

### Faz 3: Genisleme

- Web/marketing extension
- Opsiyonel auth/sync
- Gelismis AI araclari
- Monetization denemeleri

---

## 7. Maliyet ve Kisitlar

### MVP maliyet posture'u

- Hedef, **zorunlu aylik cloud inference maliyeti olmadan** MVP cikarmaktir.
- Model indirme, crash reporting veya store hesaplari gibi sinirli operasyon kalemleri yine olabilir.
- "Tamamen ucretsiz ve sinirsiz cloud fallback" varsayimi bu planin parcasi degildir.

### Teknik kisitlar

- Model boyutu ve ilk indirme UX'i
- Eski cihazlarda performans
- Flutter galeri performansi
- Cihaz izinleri ve store review sureci

### Risk notlari

- On-device kalite hedefi gercek cihaz testleriyle dogrulanmali
- Cloud yardimlari eklenirse kota, provider ve ux fallback'leri ayrica planlanmali
- Migration sirasinda ayni kavramin birden fazla klasorde yasamasi gecici olarak kabul edilir

---

## 8. Basari Kriterleri

### MVP launch

- Galeri goruntuleme calisiyor
- Temel duzenleme akisi calisiyor
- On-device upscale kullanilabilir durumda
- Kullanici orijinali bozmadan export/save alabiliyor
- Play Store hazirlik seviyesi olusmus

### Sonraki esik

- Cloud yardimlari eklenirse bunlarin maliyet ve rate-limit davranisi netlesmis
- Migration yuzeylerinden artik gereksiz olanlar dogrulanarak arsive tasinmis

---

## 9. AI Agent ve Gelistirici Notu

- Bu blueprint, OmniaPixels icin guncel urun yonunu anlatir.
- Root repo docs hala taxonomy ve cleanup kurallarinin ust kaynagidir.
- `mobile/flutter` aktif MVP yoludur.
- `backend`, `packages`, `ops`, `tests` varsayilan olarak "cop" degildir; replacement dogrulanana kadar migration/reference yuzeyi olarak kalabilir.
- Cloud fallback, MVP sonrasi ve butce/kota acikligi gerektiren bir karardir.
