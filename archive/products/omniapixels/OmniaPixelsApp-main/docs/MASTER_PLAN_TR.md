# OmniaPixels — Konsolide Master Plan

> **Tarih:** 1 Mart 2026  
> Bu dosya, repo genelinde dağınık olan tüm plan dokümanlarını tek çatı altında toplar.  
> **Kaynak dosyalar:** `OmniaPixels_FullStack_Plan_TR.md`, `OmniaPixels_Technical_Architecture_TR.md`, `OmniaPixels_FinalBlueprint_v3.docx`, `OmniaPixels_Audit_v1_SYNC.docx`, `Ek_Ozellikler_Backlog.docx`, `Bolum1-10.docx`

---

## Bölüm 1 – Vizyon & Hedefler

**One-liner:** "Cepte tek dokunuşla profesyonel fotoğraf."

**Elevator Pitch:** OmniaPixels, yapay zekâ destekli mobil fotoğraf düzenleyici. Tek dokunuşla arka plan silme, hızlı iyileştirme, upscaler ve hazır stiller sunar. Hem lokalde ücretsiz çalışabilen, hem de bulut üzerinden premium hız sağlayan hibrit bir yapıya sahiptir.

### Problem & Çözüm
- **Problem:** Mobil fotoğraf uygulamaları ya pahalı, ya yavaş, ya da çok karmaşık.
- **Çözüm:** Tek dokunuş + AI önerileriyle en çok kullanılan işlemleri basit ve güvenli hale getirir. Cihazda ücretsiz yavaş çalışabilir, bulutta hızlı sonuç alabilir.

### Hedef Kitle
| Segment | Yaş | İhtiyaç | OmniaPixels Farkı |
|---------|-----|---------|-------------------|
| Influencer'lar | 16-30 | Trend görseller, hızlı edit | Tek app + AI öneri |
| E-Ticaret Satıcıları | 25-45 | Profesyonel ürün foto | Tek tık arka plan silme |
| Günlük Kullanıcılar | 20-55 | Fotoğraf kurtarma | AI denoise + upscale |
| Freelancer'lar | 23-40 | Batch işlem | Toplu 100+ fotoğraf |
| Sanat Meraklıları | 16-35 | Kreatif efekt | AI style transfer |

### Değer Önerisi
- **Hız & Basitlik** → 3 adım kuralı: aç → düzenle → paylaş
- **Akıllı Sonuçlar** → AI, görsel türüne göre öneri yapar
- **Oyunlaştırma** → başarı kartları, rozetler, reklam izleyerek puan
- **Hibrit Model** → ücretsiz lokal + hızlı bulut (premium/reward ads)
- **Gizlilik** → cihaz içi işlem öncelikli

### MVP Kapsamı
- Tek dokunuş auto enhance
- Arka plan silme
- 2× upscaler (yerel hızlı, bulut premium)
- Opsiyonel 4×/8× (yerel yavaş ama ücretsiz)
- Before/After slider
- Basit preset kaydetme

### Ölçülebilir Hedefler
- 10K indirme (ilk 3-6 ay)
- Rating ≥ 4.5
- D7 tutma ≥ %30, D30 tutma ≥ %20
- Premium dönüşüm %3-5

---

## Bölüm 2 – Kullanıcı Senaryoları

### Kullanıcı Yolculuğu (15 Adım)
1. **Onboarding** → Hoşgeldin ekranı + offline tutorial
2. **İzinler** → Galeri + kamera izni
3. **Profil** → Google / Apple / Mail ile giriş
4. **Ana Ekran** → "Galeriden Seç / Kamerayla Çek / Bulut'tan Al"
5. **AI Tür Tanıma** → Selfie, ürün, belge, sanat analizi
6. **Öneriler** → AI önerileri listelenir
7. **Seçim** → Kullanıcı öneriyi seçer veya manuel düzenleme
8. **Düzenleme** → Filtreler, upscaler, arka plan
9. **Before/After** → Kaydırma ile karşılaştırma
10. **Kaydet** → Cihaza / buluta kayıt
11. **Paylaş** → Instagram, WhatsApp, Drive
12. **Reklam İzi** → Reklam izleyerek kredi kazanma
13. **Premium Prompt** → "Şimdi Pro'ya Geç"
14. **Feedback** → 5 yıldız sorusu
15. **Gamification** → Rozet "10 fotoğraf düzenledin!"

---

## Bölüm 3 – Teknoloji & Mimari

### Sistem Akışı
```
[Kullanıcı] → [Mobil App (Flutter)]
   → [API Katmanı (FastAPI)]
      → [AI Engine] → Local model (light) / Cloud GPU model (heavy)
   → [Database (PostgreSQL)]
   → [Storage (MinIO/S3)]
```

### Teknoloji Yığını
| Katman | Teknoloji |
|--------|-----------|
| Mobil | Flutter/Dart (Android + iOS + Web) |
| Backend | FastAPI (Python 3.11+), async |
| Veritabanı | PostgreSQL (SQLAlchemy/Alembic) |
| Kuyruk | Redis + RQ (worker süreçleri) |
| Depolama | S3-uyumlu (MinIO yerelde, AWS S3 bulutta) |
| AI Motor | ESRGAN/Real-ESRGAN, GFPGAN, Stable Diffusion, RemBG |
| Router | Multi-provider (local → bulut → ZeroCost fallback) |
| CI/CD | GitHub Actions |
| Auth | JWT (HS256/RS256), RBAC (admin/mod/user) |

### AI Motor Modelleri
- **ESRGAN / RealESRGAN** → Upscale (2×, 4×, 8×)
- **GFPGAN / CodeFormer** → Yüz onarımı
- **Stable Diffusion (SDXL/ControlNet)** → Sanat/efekt üretimi
- **Denoise / Deblur CNN** → Gürültü azaltma
- **RemBG** → Arka plan silme
- **Hafif modeller** → mobilde lokal inference
- **Ağır modeller** → bulut GPU üzerinde

### AI Router — Karar Politikası
```python
def choose_provider(ctx):
    if ctx.flags.cost_shield:
        order = ["local_vision", "zero_cost"]
    else:
        order = ["local_vision", "cloud_best", "zero_cost"]

    for p in order:
        if is_healthy(p) and supports(p, ctx.job_type):
            result = try_provider(p, ctx)
            if result.ok:
                return result
    return fallback_zero_cost(ctx)
```

### ZeroCost (Offline) İşlem Zinciri
- **Zincir:** resize → denoise-lite → sharpen-lite → (opsiyonel bg-remove lite)
- **Presetler:** Hızlı / Dengeli / Kalite
- **Telemetri:** `zc_started`, `zc_progress`, `zc_finished`

### Veri Modeli (Tablolar)
| Tablo | Ana Alanlar |
|-------|------------|
| `users` | id, email, password_hash, role, is_pro, credits |
| `jobs` | id, user_id, queue, status, input_key, output_key, params |
| `job_events` | id, job_id, event_type, message, metadata |
| `files` | id, user_id, filename, content_type, size, s3_key |
| `plans` | id, name (FREE/PRO/ENT), price, features |
| `subscriptions` | id, user_id, plan_id, status, stripe_customer_id |
| `feature_flags` | key, value_json, updated_at |
| `api_keys` | id, hashed_key, label, last_used_at, revoked |
| `audit_logs` | id, actor_user_id, action, object_type, meta_json |
| `router_logs` | id, job_id, provider, latency_ms, cost_estimate |
| `quotas` | id, user_id, day, credits_used, credits_limit |

### HTTP API Şeması
| Method | Path | Açıklama | Auth |
|--------|------|----------|------|
| GET | `/health` | Liveness | — |
| GET | `/readiness` | DB/Redis/S3 kontrolü | — |
| POST | `/auth/register` | Kayıt | — |
| POST | `/auth/login` | JWT access+refresh | — |
| GET | `/auth/me` | Kullanıcı bilgisi | Bearer |
| POST | `/jobs` | İş sıraya at | Bearer |
| GET | `/jobs` | Listeleme | Bearer |
| GET | `/jobs/{id}` | Durum/çıkış linkleri | Bearer |
| POST | `/jobs/{id}/cancel` | İptal | Bearer |
| POST | `/storage/presigned_put` | Upload URL | Bearer |
| POST | `/storage/presigned_get` | Download URL | Bearer |
| GET | `/admin/flags` | Feature flags | Admin |

### Dağıtım Topolojileri
- **Lokal (0 TL):** Docker Compose → postgres, redis, minio, api, worker
- **AWS Ucuz Demo:** EC2 tek makine + S3 + Route 53
- **AWS Yönetilen:** ECS Fargate + RDS + ElastiCache + ALB + WAF

---

## Bölüm 4 – Fonksiyonlar & Özellikler

### Temel Editör
- Kırpma, Döndürme, Ölçekleme
- Renk Ayarı (parlaklık, kontrast, beyaz dengesi)
- Filtreler & Preset'ler (AI önerili)
- Before/After slider

### AI Güçlü Fonksiyonlar
- **Arka Plan Silme & Değiştirme** → ürün görselleri için tek tık
- **Upscale (2×, 4×, 8×)** → düşük çözünürlüklükleri büyütme
- **Deblur & Denoise** → bulanık/gürültülü görselleri netleştirme
- **AI Colorize** → siyah-beyaz fotoğrafları renklendirme
- **Style Transfer** → sanat modu (Van Gogh, manga vs)
- **Otomatik Tagging** → görsel içeriğine göre etiket

### Batch & Otomasyon
- Toplu İşleme (100+ fotoğraf)
- Akıllı Klasörler (selfie, ürün, belge ayrıştırması)
- Favori Preset'ler
- Otomatik Öneri Akışı

### Entegrasyonlar
- Bulut Senkronizasyon (Google Drive, Dropbox)
- Sosyal Medya Paylaşım (Instagram, TikTok, Facebook)
- E-Ticaret Hazır Export (Trendyol, Amazon, Etsy)

---

## Bölüm 5 – Güvenlik & Uyumluluk

- **Veri İletimi:** HTTPS/TLS, integrity hashing
- **Şifreleme:** Argon2id/bcrypt, AES-256 at-rest
- **Auth:** JWT (access+refresh), OAuth2, 2FA
- **API:** Rate-limit, CORS, güvenli başlıklar (HSTS, X-Frame-Options)
- **GDPR/KVKK:** Verilerimi indir/sil akışları, EXIF kaldırma
- **APK Güvenliği:** Kod obfuscation, server-side premium doğrulama
- **Audit Log:** Admin işlemleri, auth kritikleri, PII maskeleme

---

## Bölüm 6 & 7 – Monetizasyon & Üyelik

### Gelir Modeli (Karma Yapı)
| Katman | Fiyat | Özellikler |
|--------|-------|-----------|
| **Free** | $0 | Günlük 10 kredi, temel AI, reklam izle → +5 kredi |
| **Pro** | $9.99/ay veya $79.99/yıl | Sınırsız, reklamsız, tüm AI modülleri, öncelikli GPU |
| **Enterprise** | Contact Sales | 10 lisans, API erişimi, white-label, SLA |

### Kredi Sistemi (Mikro Ödeme)
- 50 kredi → $2.99 | 200 kredi → $7.99 | 1000 kredi → $19.99
- 1 kredi = 1 premium işlem (upscale 4x, bg silme, batch export)

### FREE Badge
- FREE kullanıcı export'larında DPI-güvenli "OmniaPixels" badge zorunlu
- Sağ altta OmniaCreata logosu + "Created with OmniaPixels · by OmniaCreata"

### Büyüme Stratejileri
- **Referral Program** → Davet eden + davet edilen 50 kredi hediye
- **Gamification** → Rozetler, level sistemi, günlük görevler
- **Promosyonlar** → Black Friday, yaz kampanyaları
- **Marketplace** (ileri faz) → Kullanıcıların preset/filtre satışı (%70-%30 paylaşım)

### Gelir Projeksiyonu
- **1. Yıl:** 50K indirme, %5 premium → ~$25K/ay
- **2. Yıl:** 100K+ kullanıcı → gelir 2-3x

---

## Bölüm 8 – Ekosistem & Ortaklıklar

### Omnia Ekosistemi
- **OmniaPixels ↔ OmniaOrganizer** → Dosya yönetimi + görsel işleme entegrasyonu
- **OmniaPixels ↔ OmniaCreata** → AI üretim stüdyosu entegrasyonu
- **Omnia ID** → Tek hesap, çok uygulama
- **Omnia All Access Pass** (Pixels + Organizer + Creata)

### Stratejik Ortaklıklar
- Bulut: Google Drive, Dropbox, OneDrive
- Sosyal: Instagram, TikTok, YouTube upload API
- E-Ticaret: Shopify, Etsy, Trendyol preset'leri
- OEM: Xiaomi/Samsung uygulama mağazası promosyonları

### API & Developer Ekosistemi
- OmniaPixels API → 3rd party "AI Edit" butonu
- Flutter & React Native SDK paketleri
- Developer Portal + test kredisi

---

## Bölüm 9 – Riskler & Önlemler

| Risk | Olasılık | Etki | Öncelik | Önlem |
|------|----------|------|---------|-------|
| GPU maliyeti patlar | Yüksek | Orta | P1 | Cost Shield + Pro/Kredi bariyeri |
| API kesintisi | Orta | Orta | P1 | Fallback + multi-provider |
| APK crack girişimi | Orta | Yüksek | P1 | Obfuscation + server doğrulama |
| Kullanıcı kaybı (churn) | Orta | Orta | P2 | Gamification + referral |
| Regülasyon (GDPR) | Düşük | Yüksek | P2 | Hukuki şablonlar |

### Cost Shield Stratejisi
- `COST_SHIELD=true` → ağır işlemleri blokla
- Lokal-only mod: 2× upscale + temel filtreler cihazda
- Pro/Kredi bariyeri: 4×/8× ve batch sadece ödeme sonrası
- Multi-provider: Replicate/RunPod/HF sırayla fallback

### Nakit Akışı Koruması
- v1: Sadece lokal + reklam → GPU yok, sabit maliyet sıfır
- Gelir birikince → Pro/Kredi + bulut GPU özelliklerini aç
- Kullandıkça-öde platformlar (RunPod/Replicate/HF)

---

## Bölüm 10 – Yol Haritası & Sprint Planı

### Fazlar
| Faz | Süre | İçerik |
|-----|------|--------|
| **Faz 1 – MVP** | 0-3 ay | AI Upscale, Deblur, BG silme, galeri, reklam, kredi, Play Store |
| **Faz 2 – Growth** | 3-9 ay | Batch, cloud processing, Premium plan, EXIF, analytics |
| **Faz 3 – Ekosistem** | 9-18 ay | Marketplace, Omnia entegrasyonu, social features, çoklu dil |
| **Faz 4 – Global** | 18+ ay | Enterprise, partnerlik, server optimizasyonu, offline mode |

### Sprint Planı
| Sprint | Süre | Görevler |
|--------|------|---------|
| **Sprint 1** | 2-3 hafta | Login, onboarding, ana UI, 2× upscale, Before/After, AdMob |
| **Sprint 2** | 2-3 hafta | 4× upscale, deblur, BG remover, galeri, kredi sistemi, feedback |
| **Sprint 3** | 3-4 hafta | Batch (20 foto), profil, rozet sistemi, social share, premium |
| **Sprint 4** | 4-6 hafta | Style transfer, marketplace MVP, community, analytics, growth |

### Full-Stack Görev Hattı (G0→G10)
| Görev | Açıklama | Durum |
|-------|---------|-------|
| G0 | Repo + standartlar + envanter | ✅ Tamamlandı |
| G1 | Backend çekirdek (auth, jobs, MinIO, RQ, docker) | 🟡 %80 |
| G2 | Mobil iskelet (9 ekran, tema, routing) | ✅ Tamamlandı |
| G3 | Backend↔Mobil bağlama | ✅ Tamamlandı |
| G4 | ZeroCost offline zincir | ✅ Tamamlandı |
| G5 | AI Router | ❌ %0 |
| G6 | Push + E-posta | ❌ %0 |
| G7 | Ödeme/Stripe sandbox | 🟡 %60 |
| G8 | Admin/Flags | ❌ %5 |
| G9 | CI/CD + Yedek | ❌ %10 |
| G10 | Release Candidate + final_proof.zip | 🟡 %40 |

---

## Ek: Backlog (Beta'ya Girmeden Olmazsa Olmaz)

### Kritik
- Push Bildirimleri (işlem bitti / ödeme / uyarı)
- Geri Bildirim & Günlük E-posta Özeti
- Crash & Analytics (Sentry/Crashlytics)
- Abonelik/Quota Uyarıları + Yumuşak Kilit
- Biometric Login (Android)

### Growth
- Referral / Davet Sistemi
- In-App Announcements / Remote Config
- Çok dilli arayüz (en→tr)
- Promosyon Kodları / Kampanya

### Güvenlik & Uyum
- Rate Limiting + IP throttling
- GDPR Delete / Export
- Audit Log

### UI/UX Ekranları (Flutter)
- Notifications izin ekranı + push handler
- Feedback & Destek (metin + screenshot)
- İstatistikler (kartlar + grafik)
- Referral (kod, paylaş, durum)
- Duyurular listesi

---

## Ek: Audit Kontrol Listesi (14 Başlık)

1. ☐ API & Sağlık (/health, JWT, RBAC, rate-limit)
2. ☐ Veritabanı & Depolama (migration, Redis, MinIO)
3. ☐ AI Router (multi-cloud, policy, admin panel)
4. ☐ ZeroCost Module (offline fallback, iptal, telemetri)
5. ☐ Mobil UX (onboarding→export akışı, çoklu dil, temalar)
6. ☐ FREE Badge & Tier kuralları
7. ☐ Bildirimler & E-posta (push, quiet hours, unsubscribe)
8. ☐ Ödeme & Abonelik (Stripe/Apple/Google Pay)
9. ☐ Admin Panel (key vault, flags, analytics)
10. ☐ Güvenlik & Gizlilik (GDPR, audit log)
11. ☐ Telemetri & Analitik
12. ☐ Marketplace & Community (flag ile)
13. ☐ Creator Studio (flag ile)
14. ☐ CI/CD, Test & Operasyon

---

## Ek: Kanıt (Proof) Dosyaları

```
proof/backend/health.json
proof/backend/openapi.json
proof/backend/pytest.txt
proof/backend/coverage.xml
proof/backend/rq_lifecycle.log
proof/backend/minio_presigned.log
proof/mobile_flows/*.png / job_flow.mp4 / free_badge_export.png
proof/ai_router/router_log.jsonl
proof/messaging/push_demo.mp4
proof/messaging/email_unsubscribe.png
proof/payments/stripe_webhook.log
proof/admin/*.mp4 + logs
proof/ops/backup_restore.txt
proof/ci_green.png
proof/final_proof.zip
```

---

## Ek: Marka & Sahiplik

- **Sahiplik:** Ali Erdinç Yiğitaslan
- **Markalar:** OmniaPixels (uygulama), OmniaCreata (şirket/ecosystem)
- **Domain:** omniacreata.com (Google Workspace)
- **Admin:** ghostsofter12@gmail.com (doğrulama maili)
- **Vizyon:** "AI Photoshop + Canva + VSCO birleşimi bir süper-app"
