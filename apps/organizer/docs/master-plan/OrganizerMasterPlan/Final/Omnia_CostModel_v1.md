# Omnia Cost Model – Zero-Cost First, Pay‑as‑You‑Grow (v1)

Amaç
- Şu an için sıfır maliyetle ilerlemek; ürün kendini kanıtlayana kadar parasal yük oluşturmamak.
- Mimaride “kapalı” (flag’lerle devre dışı) maliyet kalemleri; ihtiyaç ve gelir oluşunca aşamalı açmak.

Temel İlkeler
- Offline‑first: tüm çekirdek özellikler cihazda, sunucu gerektirmeden çalışır.
- Opsiyonel senkron: varsayılan kapalı; ileride Pro/Team planlarına bağlanır.
- Telemetri/LLM/3. parti servisler: varsayılan kapalı (opt‑in ve plan bazlı açılır).
- Ücretsiz/serbest alternatifler: ücretsiz katmanlar veya tamamen yerel çözümler.

Şu Anki Sıfır Maliyet Yığını (MVP‑Öncesi/Beta‑Öncesi)
- Dağıtım: APK/AAB’yi sınırlı test grubuna doğrudan paylaş (GitHub Releases veya dosya paylaşımı). Play Store ücreti (tek seferlik ~25$) ertelenir.
- Landing/Website: GitHub Pages (ücretsiz) veya hiç olmadan da başlanabilir.
- Bekleme Listesi: Google Forms + Google Sheets (ücretsiz).
- Destek/Dokümantasyon: GitHub Wiki/Issues (ücretsiz).
- Telemetri/Crash: kapalı. Yerel log topla; “Debug paketini paylaş” akışı ile manuel.
- Kimlik/Ödeme: yok. Uygulama yerel çalışır, hesap/abonelik yok.
- Senkron/Depolama/DB: yok (varsayılan kapalı). Tüm veriler cihazda (Room/FTS).

Maliyet Oluşturabilen Özellikler ve Varsayılan Bayraklar
- sync_enabled = false (UI’de gri/“yakında” mesajı)
- cloud_ai_enabled = false (sadece yerel kurallar ve basit otomasyon)
- telemetry_enabled = false (opt‑in ekranı; default off)
- import_formats = [md, txt] (docx/pdf tam işleme sonraya)
- attachment_limits = yerel uygun sınırlar (cihaz depolama içinde kalır)

Ne Zaman (ve Nasıl) Para Harcamaya Başlamalıyız?
- Play Store yayını: Ürün akışı olgunlaştığında ve kapalı betadan genişlemeye geçerken. Maliyet: ~25$ tek seferlik.
- Senkronizasyon talebi: Örn. 200+ test kullanıcısı aktif talep ederse.
  - Aşama 1: Free tier (kota içinde kalındıkça maliyet 0$) – obje depolama/DB/kimlik için ücretsiz katmanlı servis tercihleri.
  - Aşama 2: Düşük ücretli plan – kullanım arttıkça (1k+ aktif kullanıcı, dosya yoğunluğu) küçük aylık maliyetleri açarız.
- E‑posta/Topluluk: İlk aşamada Google Forms; talep artınca ücretsiz katmanlı e‑posta listesi aracına geçilir.

Yaklaşık Bütçe Öngörüleri (yön gösterici, gerektikçe açılır)
- Senkron kapalı Beta: 0–20$/ay (domain/landing tercihe bağlı, gerekirse 0$ kalır).
- Senkron açık, 1k aktif: 50–200$/ay bandı (depolama + DB + egress + izleme). Kullanıma göre değişir; düşükten başlar, kontrollü ölçeklenir.

Fiyatlandırma (yeri geldiğinde; şimdi değil)
- Pro: 5–10$/ay aralığında konumlandırma düşünülebilir (senkron, gelişmiş arama/otomasyon).
- Team: kollektif alanlar ve rol/izinler ile kişi başı.
- Not: Fiyatlandırma, maliyet gerçekleşmelerine ve kullanıcı değer algısına göre test edilerek netleşecek.

Operasyonel Notlar (sıfır maliyette kalmak için)
- Telemetri/analitik yok; kullanılabilirlik için aralıklı kullanıcı görüşmeleri.
- Crash/bug raporları e‑posta veya Issue üzerinden, yerel log ek’i ile.
- Dağıtım: GitHub Releases üzerinden sürüm numaralı paketler; değişiklik kayıtları.
- Hukuki belgeler (ToS/Privacy) ve marka başvuruları kamuya açılma aşamasında ele alınır.

Kısa Vadeli Aksiyonlar
- “Senkron/AI/Telemetri” feature flag’lerini projenin çekirdeğine yerleştir.
- İç dağıtım paketi (APK/AAB) üret; 10–50 kişilik test grubu ile elden paylaş.
- İlerleme göstergesi: Haftalık aktif test kullanıcı sayısı, elde tutma ve manuel geri bildirim.