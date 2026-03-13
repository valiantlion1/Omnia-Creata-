# Monetizasyon Konfigürasyonu (Android)

## Reklam
- Google Mobile Ads SDK
- Test Banner ID: ca-app-pub-3940256099942544/6300978111
- Test Interstitial ID: ca-app-pub-3940256099942544/1033173712
- Test Rewarded ID: ca-app-pub-3940256099942544/5224354917
- Frequency cap ve reklam etkinliği için Firebase Remote Config anahtarları kullanın.

## Ücretli
- Google Play Billing/IAP
- Pro abonelik/IAP ürün ID örnekleri: pro_monthly, pro_yearly, upscale_4x, batch_10, lut_pack
- Paywall guard: client tarafında özellik bayrağı, server tarafında JWT stub ile doğrulama (şimdilik no-op)

## Privacy
- Privacy Policy URL: https://yourdomain.com/privacy
- Telemetry opt-out seçeneği sunulmalı
- Limit ad tracking uyumu kontrol edilmeli

## Release Notları
- Test reklam ID’leri ile test edin, release’da gerçek ID’leri kullanın.
- Play Console’da ürünleri ve reklamları doğru tanımlayın.
