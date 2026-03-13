"""
OmniaPixels Backend (M0 Stage)
=============================

Bu backend, FastAPI tabanlı bir API, RQ/Redis ile arka plan işleme ve MinIO S3 uyumlu dosya depolama sunar.

Başlatma:
---------
1. Docker Desktop kurulu olmalı.
2. Terminalde aşağıdaki komutları çalıştırın:
	cd omnia/infra
	docker-compose up --build

API Testleri (cURL):
--------------------
# Sağlık kontrolü
curl http://localhost:8000/v1/health

# Versiyon kontrolü
curl http://localhost:8000/v1/version

# Job oluşturma
curl -X POST http://localhost:8000/v1/jobs

# Job durumu sorgulama
curl http://localhost:8000/v1/jobs/1

# Presigned upload URL alma
curl "http://localhost:8000/v1/storage/presigned_put?filename=test.jpg"

# Modelleri listele
curl http://localhost:8000/v1/models

# Presetleri listele
curl http://localhost:8000/v1/presets

Modeller/Presetler Kullanımı:
-----------------------------
- /v1/models ile desteklenen modelleri görebilirsiniz.
- /v1/presets ile hazır parametre setlerini görebilirsiniz.
- Job oluştururken model/preset seçimi ileride eklenecek.

Bilinen Sorunlar:
-----------------
- Docker olmadan başlatılamaz.
- MinIO bucket lifecycle yönetimi eksik (TODO).
- Rate limit ve JWT stub modda.
- Dosya boyutu limiti ve format doğrulama test edilmeli.

Özellikler:
- FastAPI app, CORS, health/version endpointleri
- SQLAlchemy modelleri
- Postgres bağlantısı
- Redis+RQ job queue
- MinIO S3 storage
- API: job, storage presign, modeller, presetler
- Worker: arka plan işleme
- Docker Compose
- .env.example

Assumptions:
- Tüm servisler Docker Compose ile lokal çalışır
- Ortam değişkenleri .env'den yüklenir
- Workspace'de sadece izinli dosya tipleri
- Aşamalar: M0 (infra, API, modeller, queue, storage, worker, test)

Next Steps:
 - e2e test: job lifecycle, upload, boyut limiti
 - DOD PASS/FAIL tablosu
 - Eksik kalanlar düzeltilecek

Monetizasyon Entegrasyonu:
-------------------------
 - Reklam: Google Mobile Ads SDK (test/release ID’leri, frequency cap, remote config anahtarları)
 - Ücretli: Google Play Billing/IAP (pro abonelik, ek özellikler, paywall guard)
 - Paywall guard: client tarafı özellik bayrağı, server JWT stub doğrulama
 - Privacy: Privacy Policy URL, telemetry opt-out, limit ad tracking uyumu
 - Test ID’leri ile test edin, release’da gerçek ID’leri kullanın
 - Detaylar için ilgili istemci klasörlerindeki monetization_config.md dosyasına bakın
"""
