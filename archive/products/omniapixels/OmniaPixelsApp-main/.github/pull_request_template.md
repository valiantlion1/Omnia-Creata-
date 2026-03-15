# Pull Request Checklist

## Genel Kontroller
- [ ] **Branch adı** doğru format: `feat/a*-*` veya `chore/a*-*`
- [ ] **Commit mesajları** açıklayıcı ve tutarlı
- [ ] **Kod değişiklikleri** mevcut kodu bozmadan ekleme yapmış

## Test & Kalite
- [ ] **Lint temiz**: Kod stil kurallarına uygun
- [ ] **Unit testler**: En az 3 adet unit test eklendi/güncellendi
- [ ] **E2E test**: En az 1 adet end-to-end test çalışıyor
- [ ] **Test coverage**: Yeni kod %80+ kapsama sahip

## Kanıt Dosyaları (proof/**)
- [ ] **Backend kanıtları**: health.json, openapi.json, pytest.txt varsa
- [ ] **RQ lifecycle**: rq_lifecycle.log worker yaşam döngüsü
- [ ] **MinIO testleri**: minio_presigned.log presigned URL testleri
- [ ] **Migration logs**: migration.log DB şema değişiklikleri
- [ ] **Mobile flows**: screenshot/video kanıtları varsa

## Dokümantasyon
- [ ] **docs/NE_YAPTIM.md**: 3-5 maddelik özet eklendi
- [ ] **README güncellemeleri**: Kurulum/çalıştırma talimatları
- [ ] **API dokümantasyonu**: OpenAPI spec güncel

## Güvenlik & Konfigürasyon
- [ ] **Sır bilgiler**: .env.example'da, kodda hard-code yok
- [ ] **Port standardı**: 8000 kullanılıyor
- [ ] **API_BASE_URL**: ENV'den okunuyor
- [ ] **Cost Shield**: COST_SHIELD=true ücretli çağrıları engelliyor

## Deployment Hazırlığı
- [ ] **Docker**: Konteyner build başarılı
- [ ] **Compose**: docker-compose up çalışıyor
- [ ] **Smoke test**: Temel akış end-to-end çalışıyor

## PR Açıklaması
**Ne yapıldı?** (3-5 madde)
- 
- 
- 

**Proof dosyaları:**
- proof/backend/
- proof/mobile_flows/
- proof/ops/

**Test sonuçları:**
- Unit: X/X geçti
- E2E: X/X geçti
- Coverage: %XX
