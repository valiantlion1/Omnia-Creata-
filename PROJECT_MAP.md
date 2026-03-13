# OMNIACREATA PRODUCT ECOSYSTEM

Bu dosya, OMNIACREATA altındaki tüm bağımsız uygulamaların listesini ve haritasını içermektedir.

## A. Ana Yapı
- **website/omniacreata.com**: Ana marka web sitesi.
- **apps/**: Tüm bağımsız ürünlerin bulunduğu ana klasör.
- **prototypes/**: İlk prototipler, erken sürümler ve test yapıları.
- **research/**: Büyük pipeline denemeleri, agent testleri (örn. AGENT_SYSTEM_PROMPT.py) ve araştırma kodları.
- **assets/**: Genel tasarımlar, figma dosyaları, medya ve veri dosyaları.
- **docs/**: Genel mimari, incelemeler, planlar ve spec dosyaları.
- **backups/**: Yedek klasörleri ve derlenmiş .zip arşivleri.
- **temp/**: Henüz tam ayrıştırılmamış dosyalar, kalıntılar ve test çıktıları.

## B. Bağımsız Uygulamalar (Apps)

Her bir uygulama kendi özel kapsül alanında (`app`, `docs`, `assets`, `config`, `builds`, `archive`) bağımsız bir ürün olarak barındırılmaktadır.

### 1. Core Products (Ana Ürünler)
- **apps/studio**: `OmniaCreata Studio` - Gelişmiş AI içerik üretim ve kreatif stüdyo platformu.
- **apps/pixels**: `OmniaPixels` - Görsel yapay zeka (Stable AI, vb.) üretim odaklı ana mobil/web ürün, image pipeline'ları içerir.
- **apps/companion**: `OmniaCompanion` (ör. VIRTUAL BELLA) - Sanal AI asistan ve gelişmiş companion deneyimi.
- **apps/organizer**: `Omni Organizer` - Kapsamlı ajanda, planlama ve üretkenlik yönetim uygulaması.
- **apps/gamehub**: `OmniaGameHub` - Oyunlar ve interaktif deneyimler için merkezi oyun hub uygulaması.
- **apps/bench**: `OmniaBench` - Modeller için performans değerlendirme ve benchmark aracı.

### 2. Araçlar ve Yardımcılar (Tools & Utilities)
- **apps/tools**: `OmniaTools` - Sistem yardımcı komutları, metin normalize edici (text_normalizer.py), bakım betikleri (SystemCare vb.)
- **apps/utilities/Pomodoro Timer**: `Pomodoro Timer` - Pomodoro tekniği ile zaman yönetimi aracı.
- **apps/utilities/QR Master**: `QR Master` - QR kod hazırlama ve okuma yardımcı aracı.
- **apps/utilities/SifreApp**: `ŞifreApp` - Güvenli şifre saklama/yönetim uygulaması.
- **apps/utilities/Voice Fun**: `Voice Fun` - Ses manipülasyonu ve sesli eğlence aracı.

### 3. Yönetim Düzeyi (Internal)
- **apps/internal/control-center**: `OmniaCreata Control Center` - Sadece yöneticiye özel (public olmayan) iç sistemler, yönetim gösterge paneli.

---
*Not: Sistemdeki hiçbir dosya silinmemiş olup; yeni ürün hiyerarşisine uymayan veya "dağınık" durumda bulunan bütün ögeler güvenlik sebebiyle `temp` ve `backups` alanlarında korumaya alınmıştır.*
