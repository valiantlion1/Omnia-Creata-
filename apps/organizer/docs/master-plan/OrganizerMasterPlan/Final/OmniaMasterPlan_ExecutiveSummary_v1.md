# Omnia Organizer – Yönetici Özeti (v1)

1) Problem
- Bilgi çalışanları ve üreticiler; notlar, belgeler, bağlantılar, görseller ve görevler onlarca uygulamaya dağınık durumda.
- Arama, ilişkilendirme ve geri dönüş zor; tekrar eden işler zaman kaybettiriyor; gizlilik ve veri sahipliği endişesi yüksek.

2) Çözüm
- Omnia Organizer, kişisel bilgi işletim sistemi: tek yerde yakala, organize et, bul, harekete geçir.
- Multimodal yakalama (metin, dosya, link, görsel), akıllı sınıflandırma, insan-onay döngüsü, güçlü arama ve otomasyonlar.

3) Vizyon ve Hedef
- Bireyin dijital zekâ asistanı; beynin uzantısı.
- Hedef kitle: bilgi çalışanları, girişimciler, yaratıcılar/öğrenciler.
- Amaç: “tek güvenilir kaynak” ve 10x üretkenlik artışı.

4) Ayırt Edici Özellikler
- İnsan-onaylı otomasyon: model önerir, kullanıcı onaylar; yanlış pozitifler azalır.
- Gizlilik-odaklı mimari: offline-first, opsiyonel bulut eşitleme, E2E şifreleme.
- Kişiselleşme: bağlamsal öneriler, esnek şema (etiket/dosya/koleksiyon).
- Modülerlik ve genişletilebilirlik: eklenti/entegrasyon mimarisi.

5) MVP Kapsamı (çekirdek)
- Yakalama: hızlı ekleme, pano/drag-drop, dosya ekleri, temel içe aktarma (docx/md/pdf-metni).
- Organize: klasör + etiket, kutucuk/kart görünümü, arşiv/çöp.
- Arama: hızlı arama + tam metin indeks; filtreleme.
- Görevler: basit görev ve hatırlatıcılar.
- Çapraz platform masaüstü (Windows öncelikli).

6) Mimari Özeti
- Hibrit: yerel veritabanı (örn. SQLite/IndexedDB) + opsiyonel bulut senkronizasyonu.
- Bileşenler: Yakalama boru hatları, Depolama/İndeks, Arama, Otomasyon Motoru, UI.
- Güvenlik: E2E şifreleme, anahtar yönetimi, minimum telemetri (opt-in).

7) Gelir Modeli
- Free: yerel kullanım, temel özellikler.
- Pro: bulut eşitleme, gelişmiş arama/otomasyon, depolama kotaları.
- Team: paylaşımlı alanlar, rol/izinler.

8) GTM (Go-To-Market)
- Waitlist + kapalı beta; topluluk ve içerik pazarlaması.
- Üretkenlik içerik ortaklıkları, Product Hunt lansmanı.
- Fiyat testleri ve indirme sonrası onboarding akışı optimizasyonu.

9) Ölçüm (KPI)
- Aktivasyon (D1 tamamlanan ilk yakalama oranı), 7/30 gün elde tutma.
- WAU/MAU, arama kullanımı, görev/tetikleyici sayısı, NPS, churn.

10) Yol Haritası (özet)
- 0–2 hf: çekirdek veri modeli, yakalama, temel arama.
- 3–4 hf: görünümler/filtreler, içe aktarma/çıktı.
- 5–6 hf: otomasyon v1, takvim/hatırlatıcı, güvenlik.
- 7–8 hf: paketleme, onboarding, beta lansman.

11) Riskler ve Önlemler
- Senkronizasyon çatışmaları → kademeli rollout, çatışma çözümü.
- Aşırı kapsam → MVP kapsam sözleşmesi, kill-listeler.
- Güvenlik/anahtar kaybı → yedekleme/geri yükleme, kurtarma anahtarları.
- Gelir gecikmesi → freemium akışı, erken Pro teklifleri.

12) Çağrı
- FINAL dokümanı v1 donduruldu. MVP’yi 8 haftada kapalı beta ile teslim edip geri bildirimle v2’ye geçelim.