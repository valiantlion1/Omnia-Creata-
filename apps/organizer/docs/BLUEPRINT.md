# OmniaOrganizer - Product Blueprint

> Son guncelleme: 2026-03-17
> Durum: Android-native source of truth aktif, urunlestirme asamasinda

---

## 1. Urun Kimligi

### Tek Cumle
**OmniaOrganizer** - Android uzerinde dosyalari bulmayi, kategorize etmeyi ve yonetmeyi kolaylastiran akilli file manager urunu.

### Branding
- **Urun adi:** OmniaOrganizer
- **Tagline:** AI-Powered Smart File Explorer for Your Phone
- **Play Store:** "OmniaOrganizer - Smart File Manager & AI Explorer"

### Problem
- Varsayilan dosya yoneticileri arama, ozetleme ve duzen tarafinda zayif kaliyor.
- Kullanici dosyanin adini degil, baglamini hatirliyor.
- Buyuk cihaz arsivlerinde neyin nerde oldugunu takip etmek zor.

### Cozum
Kategoriler, arama, depolama gorunurlugu ve ileride gelecek akilli oneriler ile dosya yonetimini daha anlasilir hale getiren Android-first uygulama.

---

## 2. Repo Gercekligi

Bugun aktif kod tabani `apps/organizer/mobile/android` altindaki Kotlin multi-module Android projesidir.

Orada simdiden bulunanlar:

- `app`
- `core`
- `feature`
- `gradle`
- Compose tabanli navigation ve ekran iskeleti

Bu nedenle Organizer icin aktif plan bir Flutter rewrite degil, mevcut Android tabanini urunlestirmektir.

### Karar

- **Current source of truth:** Kotlin + Android
- **Current delivery target:** Android app
- **Future Flutter evaluation:** yalnizca daha sonra, net bir urun veya ekip ihtiyaci cikarsa

---

## 3. Urun Yonelimi

### Ana karar
Organizer icin aktif yon **mevcut Android koduyla devam** etmektir.

Bu ne anlama gelir:

- Mevcut Kotlin kodu "erken ama gercek temel" olarak kabul edilir.
- Plan, sifirdan baska platforma gecis uzerine kurulmaz.
- MVP once Android policy ve depolama gercegi ile uyumlu hale getirilir.

### Platform prensipleri

- **Android-first**
- **Policy-aware**
- **On-device by default**
- **AI optional, not required for core value**

---

## 4. Storage ve Policy Sinirlari

Bu urun file manager oldugu icin Android storage kurallari urun tasariminin merkezindedir.

### MVP icin kabul edilen sinir

- Kullaniciya ait medyaya ve belgelenmis Android storage API'lerine dayanan akislar
- Kullanici tarafindan izin verilmis klasorler/dizinler
- Media, documents, recents ve kategoriler uzerinden pratik navigasyon

### MVP'de varsayilmayan sey

- Sinirsiz tum cihaz depolamasini arka planda tarayan crawler
- Play policy detaylari cozulmeden "tam cihaz erisimi" vaadi
- Her cihazda ayni yetki modeliyle calisacagi varsayimi

Bu kisitlar urun zayifligi degil, Play uyumlu MVP siniridir.

---

## 5. MVP Kapsami

### Hedef
Android'de guvenilir, policy-uyumlu, hizli bir akilli file manager cikarmak.

### MVP ozellikleri

- Dosya listesi ve temel navigasyon
- Grid/list gorunumu
- Kategori bazli kesif
- Son kullanilanlar ve favoriler
- Resim, video, PDF ve metin onizleme
- Desteklenen konumlarda kopyala, tasi, sil, yeniden adlandir
- Depolama analizi
- Basit arama ve metadata tabanli filtreleme

### MVP'de olmayanlar

- Semantic search zorunlulugu
- Cloud AI bagimli temel akis
- Cross-platform sozu
- Flutter rewrite

---

## 6. Mimari Yon

### Uygulama cekirdegi

- Kotlin
- Android Jetpack / Compose
- Mevcut multi-module yapiyi guclendirme
- Yerel veritabani ve indexleme

### Akilli katman

- Faz 1: metadata, kategori, recents, storage insights
- Faz 2: duplicate heuristics, temizlik onerileri, semantic arama denemeleri
- Faz 2+ AI yardimlari: optional provider kullanimi, acik kota ve maliyet notlariyla

### Dosya erisimi

- Android'in resmi erisim modelleri uzerinden
- Kullanici izinleri ve secilen alanlar etrafinda
- Play policy ile uyusmayan gizli/genel tarama varsayimlari olmadan

---

## 7. Fazlar

### Faz 1: Android file manager MVP

- Mevcut Compose shell'i duzene sok
- Library, search, tasks, settings akislarini urunlestir
- File operations icin desteklenen storage path'lerini netlestir
- Preview ve kategori akislarini tamamla
- Depolama analizi ve favorileri tamamla

### Faz 2: Akilli yardimlar

- Semantic arama
- Duplicate detection
- Temizlik onerileri
- Dokuman ozeti gibi opsiyonel AI destekleri

### Faz 3: Genisleme

- Cloud sync
- Sifreleme
- SMB/FTP gibi ileri seviye baglantilar
- Cross-platform gerekliligi yeniden degerlendirmesi

---

## 8. Kisitlar ve Riskler

- Android storage ve Play policy en buyuk urun kisitidir.
- Tum dosya turlerinde ayni preview/duzenleme deneyimi garanti edilmez.
- AI destekleri varsa bunlar cekirdek dosya yonetiminin yerine gecmez.
- Kotlin temelini korumak kisa vadede hiz kazandirir; platformlar arasi ortaklasma daha sonraki karardir.

---

## 9. Oncelik ve Basari Kriterleri

### Oncelik

Organizer, Vault ve Pixels sonrasinda ele alinacak urunlerden biridir; bu nedenle plan hem gercekci hem de mevcut tabani koruyacak sekilde tutulur.

### MVP basari kriterleri

- Android uygulamasi stabil aciliyor ve ana navigasyon akiyor
- Kullanici dosyalari gorebiliyor, arayabiliyor ve desteklenen islemleri yapabiliyor
- Storage/policy modelinden dolayi urun kendini kilitlemiyor
- Temel file manager degeri AI olmadan da hissediliyor

---

## 10. AI Agent ve Gelistirici Notu

- Bu urun icin aktif source of truth Kotlin Android tabanidir.
- Flutter, mevcut plana gore rewrite hedefi degildir.
- Android storage/policy sinirlari MVP'nin tasarim girdisidir; sonradan cozulur varsayimiyla yazilim plani kurulmaz.
