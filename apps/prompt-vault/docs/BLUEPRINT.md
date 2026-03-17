# OmniaVault (Prompt Vault) - Product Blueprint

> Son guncelleme: 2026-03-17
> Durum: Preview-ready, production launch hazirlik asamasinda

---

## 1. Urun Kimligi

### Tek Cumle
**OmniaVault** - prompt, fikir, workflow ve AI talimatlarini saklamak, duzenlemek ve yeniden kullanmak icin premium bir vault urunu.

### Branding
- **Urun adi:** OmniaVault
- **Tam isim:** OmniaVault by Omnia Creata
- **Repo/path adi:** Prompt Vault (`apps/prompt-vault`)
- **Domain hedefi:** `vault.omniacreata.com`
- **Play Store hedef adi:** "OmniaVault - AI Prompt & Idea Vault"

### Problem
- Kullanici iyi promptlarini ve fikirlerini farkli uygulamalara dagitiyor.
- Versiyon, arama, koleksiyon ve tekrar kullanim deneyimi daginik kaliyor.
- Mevcut araclar ya cok basit not uygulamasi ya da cok dar prompt kataloglari.

### Cozum
Vault mantigiyla kaydet -> organize et -> ara -> yeniden kullan -> paylas akisini saglayan web-first urun.

---

## 2. Mevcut Durum

### Repo'da dogrulanmis olanlar

- Next.js 16 + React 19 uygulamasi
- Public marketing + authenticated app rotalari
- Prompt CRUD ve versioning
- Koleksiyonlar, etiketler, kategoriler, platformlar
- Arama ve filtreleme
- AI assist katmani
- PWA shell ve mobil-uyumlu UX
- Supabase migration tabani
- Product-local `packages/*` yapisi

### Halen tamamlanmayan launch kalemleri

- Supabase live CRUD gecisi
- Production auth akislari
- Profil persistence
- Domain mapping
- Error monitoring
- Public mobile packaging (TWA veya Capacitor)

### Durum yorumu

Urun **feature-rich preview** asamasinda; fakat "production launch tamam" denecek noktada degil.

---

## 3. Launch Posture

### Ana karar

Prompt Vault icin aktif operasyon modeli **commercial-ready budget** varsayimidir.

Bu ne anlama gelir:

- Ucretsiz servisler preview, demo veya kisa sureli dogrulama icin kullanilabilir.
- Public launch, ticari trafik ve guvenilirlik beklentisi ucretsiz tier varsayimiyla planlanmaz.
- Hosting, monitoring, auth ve veri surekliligi production seviyesiyle ele alinir.

### Net ayrim

- **Preview posture:** dusuk maliyetli, hizli deneme, demo veya internal kullanim
- **Production posture:** alan adi, auth, live CRUD, monitoring, backup/ops disiplini ve ticari uyum

Bu belge artik "preview ucretsiz" ile "public launch ucretsiz" durumlarini ayni sey gibi anlatmaz.

---

## 4. Mimari Yon

### Uygulama cekirdegi

- Web-first Next.js uygulamasi
- PWA kabiliyeti
- Supabase tabanli auth/data/storage
- AI provider abstraction
- Product-local packages ile paylasilan tip/validation/config katmani

### Mobil dagitim

- Once production web launch stabilize edilir
- Sonra TWA veya Capacitor wrapper secenegi uygulanir
- Ilk dagitim icin TWA hala makul opsiyon olabilir, ama yalnizca production web zemini tamamlandiktan sonra

### Ticari operasyon notu

- Vercel Hobby/benzeri free planlar preview icin uygun olabilir
- Ticari/public launch icin ucretli hosting/ops incelemesi varsayilir
- AI provider ve Supabase limitleri production davranisinin parcasi olarak izlenir

---

## 5. Current State -> Launch State

| Alan | Simdiki durum | Launch icin gereken |
| --- | --- | --- |
| CRUD | Preview/demo akislari guclu | Live Supabase CRUD |
| Auth | Altyapi hazir | Production auth acik ve test edilmis |
| Domain | Hedef belli | Gercek domain mapping |
| Monitoring | Planlanmis | Error monitoring aktif |
| Mobile packaging | Hazirlik seviyesi var | TWA veya Capacitor release karari |
| Ops budget | Preview'de esnek | Commercial-ready plan |

---

## 6. Fazlar

### Faz 1: Production web launch

- Supabase live CRUD
- Production auth
- Domain mapping
- Monitoring
- Launch checklist ve deploy sertlestirmesi

### Faz 2: Distribution ve retention

- TWA veya Capacitor packaging
- Profil ve ayarlar persistence
- Import pipeline
- Public/private sharing akislarini sertlestirme
- Kullanici analitigi

### Faz 3: Monetization ve marketplace

- Freemium limitleri
- Subscription veya credit modeli
- Marketplace/creator ekonomisi
- Review/rating ve commerce entegrasyonlari

Not: Urun kullaniciya ilk cikista ucretsiz olabilir; bu, altyapinin da ucretsiz olacagi anlamina gelmez.

---

## 7. Maliyet ve Kisitlar

### Preview

- Dusuk maliyetle calisabilir
- Hiz ve iterasyon once gelir

### Production

- Ticari/public launch icin ucretli hosting/ops payi kabul edilir
- AI provider limitleri ve veri katmani limitleri izlenir
- Monitoring ve incident gorunurlugu production'in parcasi sayilir

### Kisitlar

- Multi-provider AI deneyimi kota/rate-limit davranisi ister
- PWA ve mobile wrapper deneyimi ayni degildir
- Domain, auth ve live data acilmadan "launch complete" denmez

---

## 8. Basari Kriterleri

### Production web launch

- Kullanici kayit olup live veride prompt kaydedebiliyor
- Auth, CRUD ve temel app shell production'da stabil
- Domain ve monitoring aktif
- Preview fallback'leri yerine gercek production akislar kullaniliyor

### Sonraki esik

- Mobile wrapper/TWA dagitimi
- Paylasma ve retention akislarinin olgunlasmasi
- Monetization deneylerinin baslamasi

---

## 9. AI Agent ve Gelistirici Notu

- `apps/prompt-vault` repo path'i korunur, urun adi OmniaVault olabilir.
- Product plan preview ile production launch'i ayri kavramlar olarak ele alir.
- "Tamamen $0/ay" veya "free tier ile ticari launch garanti" gibi varsayimlar bu planin parcasi degildir.
