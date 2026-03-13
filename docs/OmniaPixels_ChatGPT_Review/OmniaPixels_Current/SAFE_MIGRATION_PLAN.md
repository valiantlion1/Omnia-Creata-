# 🛡️ Güvenli FAZ-1 Migration Planı

## ⚠️ **Öğrenilen Ders**
Çalışan sistemi kopyalarken import path'leri bozuldu. **Daha güvenli yaklaşım gerekli.**

## 🎯 **Revize Strateji: Incremental Migration**

### Adım 1: Environment Consolidation (Güvenli)
1. **Ana .env dosyası oluştur** (mevcut sistemi bozmadan)
2. **Shared config** ekle
3. **Test et** - API çalışmaya devam etsin

### Adım 2: Docker Optimization (Güvenli)
1. **Health checks** ekle
2. **Wait-for-it** scripts
3. **Volume optimization**
4. **Test et** - compose up çalışsın

### Adım 3: Mobile Consolidation (Güvenli)
1. **Flutter:** Mevcut `mobile/omnia_flutter/` → `mobile/flutter/` (symlink)
2. **Android:** Mevcut `mobile/omnia_android/` → `mobile/android/` (symlink)
3. **Test et** - build'ler çalışsın

### Adım 4: Testing Suite (Güvenli)
1. **Integration tests** genişlet
2. **CI/CD pipeline** hazırla
3. **Automated validation**

### Adım 5: Documentation (Güvenli)
1. **README.md** güncelle
2. **API docs** tamamla
3. **Setup guides**

## 🔄 **Migration Yaklaşımı**

**Prensip:** Mevcut çalışan sistemi ASLA bozma
**Metod:** Incremental changes + validation
**Rollback:** Her adımda geri dönüş planı

## ✅ **Şu Anda Yapılacaklar**

1. **Environment consolidation** (risk: düşük)
2. **Docker health checks** (risk: düşük)  
3. **Mobile symlinks** (risk: düşük)
4. **Testing expansion** (risk: yok)
5. **Documentation** (risk: yok)

**Backend migration'ı şimdilik SKIP - çalışan sistemi koruyoruz.**
