# OmniaOrganizer - Product Blueprint

> Son guncelleme: 2026-03-17
> Durum: Mobile-first source of truth aktif (Android kod tabani + iOS plani)

---

## 1. Urun Kimligi

### Tek Cumle
**OmniaOrganizer** - Android ve iOS telefonlarda dosyalari bulmayi, kategorize etmeyi ve yonetmeyi kolaylastiran akilli file manager urunu.

### Branding
- **Urun adi:** OmniaOrganizer
- **Tagline:** AI-Powered Smart File Explorer for Your Phone
- **Magaza hedefi:** Google Play + Apple App Store

### Problem
- Varsayilan file explorer uygulamalari arama, kategori ve temizlik onerisi tarafinda zayif kaliyor.
- Kullanici dosyanin adini degil baglamini hatirliyor.
- Mobil cihazlarda zamanla olusan arsiv karmasasi uretkenligi dusuruyor.

### Cozum
Kategoriler, arama, depolama gorunurlugu ve akilli (on-device + opsiyonel AI) oneriler ile file management'i mobilde gercekten kullanisli hale getiren urun.

---

## 2. Repo Gercekligi

Bugun aktif kod tabani `apps/organizer/mobile/android` altindaki Kotlin multi-module Android projesidir.

Orada simdiden bulunanlar:
- `app`
- `core`
- `feature`
- `gradle`
- Compose tabanli navigation ve ekran iskeleti

### Karar
- **Current code source of truth:** Kotlin + Android
- **Current product target:** Mobile (Android + iOS)
- **iOS strategy:** Monorepo'yu bozmadan `apps/organizer/mobile/ios` altinda yeni surface acilacak
- **Rewrite karari:** Toplu rewrite yok; Android temeli urunlesirken iOS parity planli ilerler

---

## 3. Urun Yonelimi

### Ana karar
Organizer icin aktif yon: **telefon odakli mobil urun (Android + iOS)**.

Bu ne anlama gelir:
- Android mevcut temel olarak hizla urunlestirilir.
- iOS paralel planlanir ve Android V1 cekirdegine feature parity hedeflenir.
- Desktop/web odagi bu urun icin aktif plan degildir.

### Platform prensipleri
- **Mobile-first (phone UX once)**
- **Policy-aware (Play + App Store uyumu)**
- **On-device by default**
- **AI optional, not required for core value**
- **Human-in-control (oneri + onay)**

---

## 4. Storage ve Policy Sinirlari

Bu urun file manager oldugu icin platform policy'leri tasarimin merkezindedir.

### Android MVP siniri
- MediaStore + SAF tabanli erisim
- Kullanici izinleriyle acilan dizin/alanlarda operasyon
- Arka planda sinirsiz tum depolamayi tarama varsayimi yok

### iOS MVP siniri
- Files app/Document Picker ile kullanici secimli erisim
- Security-scoped kaynaklarda guvenli operasyon
- iOS sandbox disina izinsiz genis erisim varsayimi yok

Bu kisitlar urun zayifligi degil; magaza uyumlu ve guvenli MVP siniridir.

---

## 5. Mobile V1 Kapsami

### Hedef
Android ve iOS'ta guvenilir, policy-uyumlu, hizli bir akilli file manager MVP cikarmak.

### V1 ozellikleri
- Dosya listesi ve temel navigasyon
- Grid/list gorunumu
- Kategori bazli kesif
- Son kullanilanlar ve favoriler
- Resim, video, PDF ve metin onizleme
- Desteklenen konumlarda kopyala, tasi, sil, yeniden adlandir
- Depolama analizi (platformun izin verdigi olcude)
- Basit arama + metadata tabanli filtreleme

### V1'de olmayanlar
- Cloud AI bagimli cekirdek akis
- Desktop/web product hedefi
- Team collaboration
- Buyuk kapsamli cross-device sync

---

## 6. Mimari Yon

### Uygulama cekirdegi
- Android: Kotlin + Jetpack Compose + mevcut multi-module
- iOS: Swift/SwiftUI + modul bazli feature ayirimi (paralel domain sozlesmesi)
- Ortak urun mantigi: spec-first/domain-contract-first dokumantasyonla hizalanir

### Akilli katman
- Faz 1: metadata, kategori, recents, storage insights
- Faz 2: duplicate heuristics, temizlik onerileri
- Faz 2+: opsiyonel AI yardimlari (kota/maliyet/sunum netligi ile)

### Tasarim girdi modeli
- UI wireframe/flow tarafinda **Google Stitch ciktilari** tasarim girdisi olarak kullanilabilir.
- Kod uygulamasi platform-native component sistemleriyle yapilir.

---

## 7. Fazlar

### Faz 1: Android V1 cekirdegi
- Compose shell'i stabilize et
- Library, search, settings akisini urunlestir
- File operations + preview + kategori + depolama gorunurlugu

### Faz 2: iOS V1 parity
- iOS app shell + navigation
- Android V1 cekirdek feature'larinin parity implementasyonu
- Platform policy farklarina gore UX uyarlamasi

### Faz 3: Akilli yardimlar
- Duplicate detection
- Akilli temizlik onerileri
- Opsiyonel AI destekleri

---

## 8. Kisitlar ve Riskler

- Android storage + Play policy, iOS sandbox + App Store policy en buyuk kisitlar.
- Tum dosya turlerinde ayni duzey preview/duzenleme garanti edilemez.
- AI yardimlari cekirdek file-manager degerinin yerine gecmez.
- Iki platform parity yonetimi iyi backlog disiplinine ihtiyac duyar.

---

## 9. Oncelik ve Basari Kriterleri

### Oncelik
Organizer, mobilde net ve guvenilir bir file-management degeri vermelidir.

### V1 basari kriterleri
- Android app stabil aciliyor ve ana navigasyon akiyor.
- iOS uygulama kabugu + temel akislar parity backlog'u ile acilmis durumda.
- Kullanici desteklenen path'lerde dosya gorup arayip temel islemleri yapabiliyor.
- AI olmadan da urun degeri net hissediliyor.

---

## 10. AI Agent ve Gelistirici Notu

- Bu urunun aktif gelisim odağı mobil uygulamadir.
- Plan kararlarinda masaustu/web yonlendirmesi degil, Android+iOS phone deneyimi esas alinmalidir.
