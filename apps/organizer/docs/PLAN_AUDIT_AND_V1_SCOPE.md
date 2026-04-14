# OmniaOrganizer Plan Audit + Mobile V1 Scope

> Kapsam: Bu analizde **Prompt Vault ile ilgili her sey disarida** tutulmustur.

## 1) Zip + repo birlikte inceleme ozeti

Incelenen iki ana kaynak:
- Archive import: `archive/imports/OmniaOrganizer.zip`
- Repo: `apps/organizer/docs/*` ve `apps/organizer/mobile/android/*`

Sonuc:
- Root zip icindeki 14 adet `omnia_master_plan_bolum*.docx`, repodaki `OrganizerMasterPlan/Sources` altindaki 14 docx ile dosya adi + hash bazinda **birebir ayni**.
- Zip icinde ayrica `OmniaOrganizer/OmniaOrganizer.zip` adinda nested paket var (arsivlenmis kopya).

## 2) Ayni / benzer / sadece zipte olanlar

### Ayni (exact)
- Zipteki 14 bolum docx dosyasi == `apps/organizer/docs/master-plan/OrganizerMasterPlan/Sources/*.docx`.

### Benzer (farkli export)
- `OrganizerMasterPlan/Final` altinda ayni ana plandan uretilmis coklu formatlar var (`.md`, `.txt`, `.html`, `.json`, `.docx`).
- Bilgi buyuk olcude tekrarli, formatlar farkli.

### Sadece zipte olan
- Archive import `archive/imports/OmniaOrganizer.zip`
- Nested `OmniaOrganizer/OmniaOrganizer.zip`

## 3) Tekrar, cakisma, sisme noktaları

### Tekrar / sisme
- `bolum1_2_3_4`, `..._fixed`, `..._clean` iterasyonlari ayni materyalin varyantlari.
- `Final` klasorunde coklu export formatlari plan yonetiminde gurultu olusturuyor.
- `OmniaOrganizer_FullPlan.txt` placeholder; canonical plan metni degil.

### Cakisma
- `BLUEPRINT.md` file-manager yonunu netliyor.
- `Final` altindaki bazi metinler urunu knowledge-OS / desktop-paradigm tarafina cekiyor.
- `Omnia_MVP_Roadmap_8weeks_v1.md` kapsam disina “mobil uygulama” koyuyor; bu mobil hedefle ters.
- Kod tabanindaki mevcut domain (`Item/Task/Tag`) not-gorev omurgasina daha yakin; file-manager domainine hizalanmali.

## 4) Gercek urun plani vs not/deneme ayrimi

## Gercek urun plani (V1 icin esas)
1. `apps/organizer/docs/BLUEPRINT.md`
2. `apps/organizer/docs/PRODUCT.md`
3. `apps/organizer/mobile/android/*`
4. Gelecek iOS surface: `apps/organizer/mobile/ios/*` (plan)

## Not/deneme/tarihsel referans
- `apps/organizer/docs/master-plan/OrganizerMasterPlan/Sources/*`
- `apps/organizer/docs/master-plan/OrganizerMasterPlan/Final/*`
- `apps/organizer/docs/master-plan/OmniaOrganizer_FullPlan.txt`
- Root zip + nested zip arsivleri

## 5) Mobile (Android + iOS) icin gercekci V1 scope

V1 hedefi: **Telefon odakli, policy-uyumlu, AI'siz da degerli akilli file manager**.

### In-scope (V1)
1. Dosya kesfi: Android'de MediaStore+SAF, iOS'ta Document Picker/Files erisimleri.
2. Library: kategori + klasor benzeri gruplama + recents + favorites.
3. Preview: image/video/pdf/text.
4. Temel islemler: rename, move, copy, delete (yalnizca platformun izin verdigi akislar).
5. Search v1: ad/path/mime/date/size metadata aramasi.
6. Storage insights v1: buyuk dosyalar + kategorik ozetler.
7. Settings v1: izinler, gizlilik, guvenlik ve hata durumlari.

### Out-of-scope (V1 disi)
- Bulut hesap/senkron bagimliligi
- LLM tabanli semantic search zorunlulugu
- Desktop/web product hedefi
- Team collaboration ve enterprise katman

## 6) Mobile full-stack baslangic mimarisi onerisi

### Monorepo uyumlu dizilim
- `apps/organizer/mobile/android` (active)
- `apps/organizer/mobile/ios` (planned)
- Ihtiyac olursa ileride `apps/organizer/packages/*` (ortak spec/schema/tooling)

### Android (active)
- `:app`: navigation shell + DI root
- `:core:domain`: file-manager domain kontratlari
- `:core:data`: MediaStore/SAF + Room cache/index
- `:feature:*`: library/search/settings/capture/tasks

### iOS (planned)
- App shell (SwiftUI)
- Feature katmanlari: Library, Search, Settings, Preview, FileOps
- Platform data katmani: Files API + security scoped erişim

### Backend katmani (V1)
- Remote backend zorunlu degil.
- Opsiyonel minimum: crash analytics + release/update kanali.
- V1 icin “on-device first mobile stack” yeterli.

## 7) Gelistirmeye baslama sirasi (uygulanabilir)

1. **Plan hizalama (1-2 gun)**
   - Canonical: `BLUEPRINT + PRODUCT + bu audit`.
   - `master-plan` klasorunu historical/reference olarak etiketle.

2. **Android modul stabilizasyonu (1-2 gun)**
   - `settings.gradle.kts` include'larini mevcut modullerle senkronize et.

3. **Domain donusumu (3-4 gun)**
   - Note/task merkezli modelden file-manager modeline gec.

4. **Data erisim katmani (4-6 gun)**
   - Android: MediaStore + SAF + Room.

5. **Android V1 feature tamamlama (6-10 gun)**
   - Library, Search, Preview, FileOps, Settings.

6. **iOS surface acilisi (2-3 gun)**
   - `mobile/ios` iskeleti + app shell + teknik karar kaydi.

7. **iOS parity sprintleri (8-12 gun)**
   - Library/Search/Preview/FileOps/Settings parity.

Toplam: 6-9 hafta arasi gercekci bir mobile V1 cikisi (Android ilk yayina hazir, iOS hizli takip).

## 8) Kisa karar ozetleri

- Zipten gelen planlar yeni bilgi getirmiyor; repo `Sources` ile ayni.
- Ana celiski mobile file-manager hedefi ile desktop/knowledge-OS metinlerinin birlikte durmasi.
- Tek net yon: **Android + iOS phone odakli, monorepo yapisini bozmayan, policy-safe akilli file manager**.
