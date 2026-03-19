# OmniaOrganizer — Codex İçin Eksik Paket / Repo Özel Çalışma

## Amaç
Bu doküman, monorepo içinde zaten var olan genel kuralların üstüne **OmniaOrganizer’a özel olarak eklenmesi gereken dosyaları, kuralları ve içerikleri** tanımlar.

Bu paket sayesinde Codex:
- ürün yönünü yanlış anlamaz
- faz sınırlarını aşmaz
- modülleri birbirine karıştırmaz
- feature çöplüğüne kaymaz
- OmniaOrganizer’ı sıradan file manager ya da PDF app’e dönüştürmez

---

# 1) Monorepo Genel Kurallar Yetmez, Neden?
Monorepo kuralları genelde:
- genel kod standardı
- branch / commit düzeni
- test / lint / build akışı
- ortak design system
- ortak kalite eşiği

gibi şeyleri çözer.

Ama OmniaOrganizer için ayrıca şunlar gerekiyor:
- ürün kimliği
- faz sınırları
- modül önceliği
- neyin çekirdek neyin uzantı olduğu
- AI’ın neden sona bırakıldığı
- cloud ve belge katmanının neden çekirdek olmadığı
- ekran bazlı yön
- Android depolama mantığına göre teknik sınırlar

Yani:
**genel repo kuralları çatıdır**
**OmniaOrganizer özel kuralları ise ürün beynidir**

---

# 2) Monorepo İçinde OmniaOrganizer İçin Kesin Eklenmesi Gereken Dosyalar

## A. `apps/organizer/AGENTS.md`
### Amaç
Bu dosya OmniaOrganizer klasörü içindeki Codex ajanına doğrudan yön verecek ana anayasa dosyası olacak.

### Bu dosyada kesin olması gerekenler
- ürün tanımı
- ürünün ne olmadığı
- local-first kuralı
- modüler mimari zorunluluğu
- faz dışına çıkmama kuralı
- belge araçlarını çekirdeğe taşımama kuralı
- cloud’u çekirdek yapmama kuralı
- AI’ı erken eklememe kuralı
- UI sadelik kuralı
- performans önceliği
- destructive actions güvenliği
- test / build / lint komutları
- done tanımı
- “önce plan, sonra kod” kuralı

### Not
Bu dosya kısa ama sert olmalı. Çok uzun manifesto gibi değil; ajanı hizaya sokan operasyon anayasası gibi olmalı.

---

## B. `apps/organizer/PRODUCT_BLUEPRINT.md`
### Amaç
Büyük ürün resmi burada durmalı.

### Bu dosyada olması gerekenler
- ürün yönü
- nihai ürün tanımı
- fazlar
- modül hiyerarşisi
- ürün kimliği
- kritik tasarım kuralları
- neye dönüşmeyeceği

### Not
Bu dosya mevcut hazırladığımız blueprint’in temiz repo versiyonu olabilir.

---

## C. `apps/organizer/PLAN_PHASE_0.md`
### Amaç
Foundation / system base için teknik görev planı.

### İçermesi gerekenler
- hedef
- klasör yapısı
- teknoloji seçimi
- temel bağımlılıklar
- tema / design system iskeleti
- local db seçimi
- indexing stratejisi
- background task yaklaşımı
- bu fazın kabul kriterleri
- validation komutları

---

## D. `apps/organizer/PLAN_PHASE_1.md`
### Amaç
Core file system fazı için net yapılacaklar listesi.

### İçermesi gerekenler
- ekranlar
- modüller
- file browser davranışı
- file actions listesi
- recycle bin mantığı
- search core sınırları
- bu fazda kesin olmayacak şeyler
- kabul kriterleri
- test planı
- performance hedefleri

---

## E. `apps/organizer/PLAN_PHASE_2.md`
### Amaç
Media & storage intelligence fazını netleştirmek.

### İçermesi gerekenler
- media layer
- storage analyzer
- cleanup engine
- smart views
- rule-based suggestions
- duplicate detection yaklaşımı
- büyük dosya analizi
- faz hedefleri
- kabul kriterleri

---

## F. `apps/organizer/MODULE_SPECS/`
### Amaç
Büyük modülleri tek tek ayırmak.

### Önerilen dosyalar
- `file-browser.md`
- `file-actions.md`
- `search-core.md`
- `recycle-bin.md`
- `media-layer.md`
- `storage-analyzer.md`
- `cleanup-engine.md`
- `smart-views.md`
- `privacy-system.md`
- `network-access.md`
- `cloud-layer.md`
- `document-suite.md`

### Her modül spec içinde olması gerekenler
- modül amacı
- kullanıcı değeri
- sınırlar
- giriş / çıkışlar
- ekran ilişkisi
- veri modeli
- edge case’ler
- kabul kriterleri
- bu modülün ne olmadığı

---

## G. `apps/organizer/SCREEN_SPECS/`
### Amaç
Ekran bazlı ürün davranışını netleştirmek.

### Önerilen dosyalar
- `home.md`
- `browse.md`
- `search.md`
- `storage.md`
- `media.md`
- `cleanup.md`
- `privacy.md`
- `settings.md`

### Her ekran spec içinde olması gerekenler
- ekran amacı
- kullanıcı bu ekrana neden gelir
- üst seviye layout
- ana bileşenler
- boş durum
- hata durumu
- loading durumu
- hızlı aksiyonlar
- bu ekranın diğer ekranlarla ilişkisi

---

## H. `apps/organizer/TECH_CONSTRAINTS.md`
### Amaç
Codex’in teknik olarak saçmalamasını önlemek.

### İçermesi gerekenler
- Android-first
- local-first
- scoped storage / MediaStore / SAF sınırları
- minSdk / targetSdk
- Compose / Room / WorkManager tercihleri
- thumbnail cache yaklaşımı
- indexing sınırları
- background scanning sınırları
- düşük RAM cihaz dikkati
- pil dostu davranış
- cloud’un opsiyonel olduğu
- root’a bağımlı feature yazmama

---

## I. `apps/organizer/FEATURE_MATRIX.md`
### Amaç
Tüm özellikleri tek tabloda toplayıp önceliklendirmek.

### Kolonlar
- feature adı
- kategori
- faz
- öncelik
- çekirdek / modül / ileri modül / gelecek
- local mi / network mü / cloud mu
- risk seviyesi
- not

### Faydası
Codex neyin şimdi yapılacağını, neyin sonra yapılacağını karıştırmaz.

---

## J. `apps/organizer/ACCEPTANCE_CRITERIA.md`
### Amaç
“Bitti” lafının içini doldurmak.

### İçermesi gerekenler
- Faz 0 için done tanımı
- Faz 1 için done tanımı
- Faz 2 için done tanımı
- performans eşiği
- crash eşiği
- UX eşiği
- test geçiş zorunluluğu

---

## K. `apps/organizer/RISK_REGISTER.md`
### Amaç
Ürünün en tehlikeli yerlerini baştan yazmak.

### İçermesi gerekenler
- feature creep
- file loss riski
- recycle bin mantığı
- büyük kütüphane performansı
- battery drain
- cloud senkron çakışmaları
- duplicate detection hataları
- belge araçlarının ürünü ele geçirmesi
- AI’ı erken ekleme riski

---

# 3) AGENTS.md İçin OmniaOrganizer Özel Kurallar

Aşağıdaki kurallar ajan dosyasında kesin bulunmalı:

## Ürün Kimliği
- OmniaOrganizer bir file manager değildir; file manager çekirdeği olan bir dijital kontrol sistemidir.
- Uygulama PDF editor, cloud drive veya gallery app’e dönüşmemelidir.
- Local-first yaklaşım zorunludur.

## Faz Kuralları
- Faz dışına çıkılmaz.
- Sonraki faza ait feature mevcut görevde eklenmez.
- “Madem kolay, bunu da ekleyeyim” mantığı yasaktır.

## Mimari Kurallar
- Modüler yapı zorunludur.
- Her büyük özellik ayrı modül düşünülmelidir.
- Çekirdek ile modüller sıkı bağlanmamalı, kontrollü bağlanmalıdır.

## UX Kuralları
- UI sade ama zeki hissettirmelidir.
- Fazla araç yığını görüntüsü yasaktır.
- Kullanıcıyı boğan ayar ekranları istenmez.
- Google Files kadar anlaşılır, ama ondan daha güçlü bir deneyim hedeflenir.

## Güvenlik Kuralları
- Destructive actions her zaman güvenlik katmanıyla çalışır.
- Recycle bin olmadan kalıcı silme mantığı kurulmaz.
- Büyük toplu işlemlerde geri alma mantığı düşünülmeden iş tamam sayılmaz.

## Cloud Kuralları
- Cloud çekirdek değildir.
- Cloud entegrasyonları opsiyonel uzantı olarak tasarlanır.
- Yerel deneyimi bozan hiçbir cloud-first karar alınmaz.

## Belge Modülü Kuralları
- Belge araçları güçlü olabilir ama çekirdeği ezemez.
- OmniaOrganizer bir PDF uygulamasına dönüşmeyecek.

## AI Kuralları
- AI erken fazlarda yasaktır.
- Önce rule-based intelligence kurulacak.
- AI ancak çekirdek sistem ve storage intelligence oturduktan sonra düşünülecek.

---

# 4) PLAN Dosyalarında Eksik Bırakılmaması Gereken Şeyler

## Her faz planında şu başlıklar zorunlu olsun:
- Faz amacı
- Bu fazın kullanıcıya etkisi
- Repo içinde açılacak klasörler
- Modüller
- Ekranlar
- Yapılmayacaklar
- Testler
- Validation komutları
- Done tanımı
- Sonraki faza bağımlılık

## Aksi hâlde ne olur?
Codex:
- fazı genişletir
- scope’u bozar
- bir modülü başka modüle karıştırır
- bitmeyen iş üretir

---

# 5) OmniaOrganizer Özel “Done” Mantığı

Bir modül veya faz yalnızca kod yazıldığı için tamam sayılmamalı.

## Done sayılması için:
- tasarlanan ekran çalışmalı
- ana akış bozulmadan ilerlemeli
- crash vermemeli
- test / lint / build geçmeli
- modül sınırları korunmalı
- UX dağınık görünmemeli
- performans kabul edilebilir olmalı

---

# 6) Codex’in En Çok Saçmalayacağı Yerler
Bunları repo belgelerinde baştan yazmak lazım:

## 1. Feature creep
“Hazır buradayken PDF edit de ekledim”
→ yasak

## 2. Toolbox tasarımı
“Her aracı menüye basalım”
→ yanlış

## 3. Cloud’u merkeze koyma
→ yanlış

## 4. File Commander tarzı şişkinlik
→ yanlış

## 5. Çok teknik UI
→ yanlış

## 6. AI’ı erken getirme
→ yanlış

## 7. Modül yerine tek parça dev ekran yazma
→ yanlış

---

# 7) Repo İçin En Doğru Paket Sırası

## İlk eklenecek dosyalar
1. `PRODUCT_BLUEPRINT.md`
2. `AGENTS.md`
3. `TECH_CONSTRAINTS.md`
4. `FEATURE_MATRIX.md`
5. `PLAN_PHASE_0.md`
6. `PLAN_PHASE_1.md`

## Sonra eklenecekler
7. `MODULE_SPECS/`
8. `SCREEN_SPECS/`
9. `ACCEPTANCE_CRITERIA.md`
10. `RISK_REGISTER.md`

---

# 8) En Net Sonuç

Monorepo genel kuralları tek başına yeterli değil.

OmniaOrganizer için ayrıca:
- ürün kimliğini
- faz sınırlarını
- modül mantığını
- teknik limitleri
- done tanımını
- riskleri

ayrı dosyalarla netleştirmek şart.

## Nihai karar
Codex’e sadece blueprint verirsen iyi işler çıkarır.
Ama:
**blueprint + AGENTS + faz planları + teknik sınırlar + modül spec’leri**
verirsen çok daha kontrollü, tutarlı ve doğru işler çıkarır.
