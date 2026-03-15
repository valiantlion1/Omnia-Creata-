"""
OmniaPixels Android Client (Kotlin, Jetpack Compose)
====================================================

Kurulum:
--------
1. Android Studio ile açın.
2. Gerekli izinler: INTERNET, READ_MEDIA_IMAGES (API 33+), READ_EXTERNAL_STORAGE (API <33)
3. .env veya local.properties ile backend URL’sini tanımlayın.

Demo Akış:
----------
- Dummy görsel ile upload → job → result akışı test edilebilir.
- Tüm Compose ekranları, ViewModel’ler ve Navigation grafiği hazır.
- Ads/Billing servisleri demo ID’lerle entegre.

Bağımlılıklar:
--------------
- Retrofit, OkHttp, Moshi, Coroutines, Hilt, Navigation-Compose, Coil, WorkManager, Firebase analytics/crashlytics, Play Billing, Google Mobile Ads

Paket Yapısı:
-------------
- data: network, dto, repository
- domain: usecase
- presentation: screens, viewmodel, navigation
- di: Hilt modülleri
- monetization: Ads/Billing servisleri

Notlar:
-------
- Gerçek anahtarlar ve backend URL’si TODO ile işaretli.
- Zayıf ağ, polling, caching, error mapping demo olarak hazır.
"""
