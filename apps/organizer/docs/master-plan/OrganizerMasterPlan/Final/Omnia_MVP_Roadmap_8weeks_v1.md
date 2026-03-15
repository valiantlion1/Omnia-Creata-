# Omnia Organizer – MVP Roadmap (8 Hafta, v1)

İlkeler
- MVP odak: gereksiz özellik yok, değer akışı hızlı.
- Offline-first, gizlilik-öncelikli; kullanıcı onaylı otomasyon.
- Her hafta çalışır bir sürüm, haftalık demo.

Kapsam (in)
- Yakalama (metin, dosya, link), organize (etiket/klasör), arama, görev/hatırlatıcı, içe aktarma/çıktı.
Kapsam (out)
- Gerçek zamanlı ortak çalışma, mobil uygulama, gelişmiş AI yazma.

Milestones
- Alpha (Hafta 4 sonu): çekirdek özellikler çalışır.
- Beta (Hafta 8 sonu): paketlenmiş, onboarding’li, test edilmiş.

Hafta 1 – Temel altyapı
- Proje iskeleti, UI kabuğu, veri modeli (Item, Tag, Folder, Task, Attachment).
- Yerel depolama (SQLite/IndexedDB), dosya sistemi entegrasyonu.
- Yakalama: pano/drag-drop, hızlı ekleme.
- Kabul kriteri: Uygulama açılıyor, öğe oluşturma/okuma mümkün.

Hafta 2 – CRUD ve arama v1
- CRUD akışları, toplu seçim/taşıma, arşiv/çöp.
- Tam metin indeks ve hızlı arama kutusu.
- İçe aktarma: docx/md (metne), temel pdf-metni.
- Kabul: 1000+ öğede arama <200ms ortalama.

Hafta 3 – Görünümler ve filtreler
- Inbox, Kütüphane, Görevler görünümleri.
- Etiket/klasör yönetimi, filtre/sıralama, outline.
- Kısayollar ve hızlı komut paleti.
- Kabul: Tüm görünümler 60 FPS’e yakın, erişilebilirlik temel kontrolleri.

Hafta 4 – Çıktı ve kalite
- Dışa aktarma: Markdown/HTML; yedekleme/geri yükleme.
- Hata raporlama (yerel log), temel ayarlar.
- Alpha tag’ı; kapalı beta listesi hazırlığı.
- Kabul: Export dosyaları doğrulanıyor, smoke testler geçiyor.

Hafta 5 – Otomasyon v1 ve hatırlatıcılar
- Kural motoru (yakalamada etiket/klasör atama, basit dönüşümler).
- Görev hatırlatıcıları ve bildirimler.
- Takvim entegrasyonu (okuma/ekleme temel akış).
- Kabul: 5 örnek kural senaryosu problemsiz çalışıyor.

Hafta 6 – Güvenlik ve dayanıklılık
- Yerel şifreleme (OS keyring ile anahtar), kilitle/aç akışı.
- Yedekleme periyodu ve geri yükleme; veri bütünlüğü testleri.
- (Opsiyonel) Sync prototipi, beta sonrası olgunlaşacak.
- Kabul: Cold start, kilit/aç <3 sn; veri kaybı testi sıfır.

Hafta 7 – Onboarding ve paketleme
- İlk kurulum sihirbazı, örnek veri, ipuçları.
- Telemetri (opt-in), çökme raporları (yerel/anonim).
- Paketler: Windows yükleyici, otomatik güncelleme altyapısı.
- Kabul: Beta RC kurulabilir, ilk 10 dk deneyim akıcı.

Hafta 8 – Beta lansman
- Landing ve dokümantasyon, SSS.
- Fiyatlama sayfası (pasif), waitlist/geri bildirim akışı.
- Hata triage, hotfix planı, v2 backlog’u.
- Kabul: 50 beta kullanıcısı ile sorunsuz paylaşım.

Riskler ve Önlemler
- Sync çatışmaları → prototip/kapalı beta, “local wins” kuralı + el ile çözüm.
- Performans → sanal listeleme, indeks tuning, profil çıkarma.
- Tasarım borcu → UI kit ve design tokens hafta 3’e kadar.
- Güvenlik → tehdit modeli ve kurtarma anahtarı tasarımı.

MVP Çıkış Kriterleri
- Çekirdek akışlar sorunsuz: yakalama, organize, arama, görev, export.
- 1 sayfalık Yönetici Özeti ve mini ürün turu hazır.
- İlk 2 hafta içinde 3 küçük güncelleme planı.