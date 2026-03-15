# 🎯 FAZ-1: Monorepo Konsolidasyon & Foundation

## 📋 **Hedef**
Mevcut çalışan akışı BOZMADAN Blueprint'e tam uyumla foundation tamamlamak.

## 🏗️ **FAZ-1 Kapsamı**

### 1. **Monorepo Konsolidasyon**
```
OmniaPixels/
├── backend/           # FastAPI backend (mevcut omnia/ → backend/)
├── mobile/
│   ├── flutter/       # Tek Flutter root (mevcut mobile/omnia_flutter/)
│   └── android/       # Tek Android root (mevcut mobile/omnia_android/)
├── shared/            # Ortak konfigürasyonlar
├── docs/              # Dokümantasyon
├── scripts/           # Deployment & utility scripts
├── tests/             # Integration tests
├── docker-compose.yml # Ana compose file
├── .env.example       # Environment template
└── README.md          # Ana dokümantasyon
```

### 2. **Environment Standardization**
- **Tek .env dosyası** tüm servisler için
- **Environment validation** startup'ta
- **Development/Production** config separation
- **Secrets management** best practices

### 3. **Docker Compose Optimization**
- **Health checks** tüm servislerde
- **Dependency management** (wait-for-it)
- **Volume optimization** development için
- **Network isolation** security için
- **Multi-stage builds** production için

### 4. **Testing Suite**
- **Integration tests** API endpoints
- **Service connectivity** Redis/MinIO/PostgreSQL
- **Mobile app** unit tests
- **End-to-end** workflow tests
- **CI/CD ready** test automation

### 5. **Single Mobile Roots**
- **Flutter primary:** Tek flutter/ klasörü
- **Android secondary:** Tek android/ klasörü
- **Shared configurations** mobile apps arası
- **API client** standardization

## 🔄 **Migration Strategy (Non-Breaking)**

### Adım 1: Backup & Structure
1. Mevcut çalışan kodu backup al
2. Yeni klasör yapısını oluştur
3. Dosyaları taşı (import path'leri güncelle)

### Adım 2: Environment Consolidation
1. Tüm .env dosyalarını birleştir
2. Config validation ekle
3. Docker Compose güncelle

### Adım 3: Testing Integration
1. Mevcut test_system.py'yi genişlet
2. Mobile test suite ekle
3. CI/CD pipeline hazırla

### Adım 4: Documentation
1. README.md güncelle
2. API documentation
3. Mobile setup guides

## ✅ **FAZ-1 Tamamlanma Kriterleri**

- [ ] Monorepo structure implemented
- [ ] Single .env configuration working
- [ ] Docker Compose optimized and tested
- [ ] All services start with health checks
- [ ] Flutter app single root functional
- [ ] Android app single root functional
- [ ] Integration tests passing
- [ ] Documentation complete
- [ ] Mevcut API endpoints çalışmaya devam ediyor
- [ ] Mobile apps önceki gibi çalışıyor

## 🚀 **Implementation Order**

1. **Structure Migration** (1-2 saat)
2. **Environment Setup** (1 saat)
3. **Docker Optimization** (1-2 saat)
4. **Mobile Consolidation** (2-3 saat)
5. **Testing Suite** (2-3 saat)
6. **Documentation** (1 saat)

**Toplam Süre:** ~8-12 saat

## 📝 **PR Checklist**

- [ ] Tüm testler geçiyor
- [ ] Docker Compose çalışıyor
- [ ] API endpoints responsive
- [ ] Mobile apps build oluyor
- [ ] Documentation güncel
- [ ] Environment variables documented
- [ ] Migration guide hazır

## 🎯 **FAZ-2 Hazırlığı**

FAZ-1 tamamlandıktan sonra:
- AI Orchestrator architecture design
- Hybrid Engines UI/telemetry planning
- Performance optimization roadmap
- Production deployment strategy
