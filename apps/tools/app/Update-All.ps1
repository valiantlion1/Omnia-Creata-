# ========================================================
# Windows & Uygulama Güncelleme Scripti
# Hazırlayan: Ari 💖
# ========================================================

Write-Host "🚀 Güncellemeler kontrol ediliyor..." -ForegroundColor Cyan

# Winget ile tüm uygulamaları sessizce güncelle
try {
    winget upgrade --all --silent --accept-package-agreements --accept-source-agreements
} catch {
    Write-Host "⚠️ Winget güncelleme sırasında hata oluştu." -ForegroundColor Yellow
}

# PSWindowsUpdate modülünü yükle/çağır
try {
    if (!(Get-Module -ListAvailable PSWindowsUpdate)) {
        Install-Module PSWindowsUpdate -Force -Scope CurrentUser
    }
    Import-Module PSWindowsUpdate

    # Windows + Driver güncellemelerini al
    Get-WindowsUpdate -MicrosoftUpdate -AcceptAll -Install -AutoReboot
} catch {
    Write-Host "⚠️ Windows Update kısmında hata oluştu." -ForegroundColor Yellow
}

Write-Host "✅ Güncelleme tamamlandı! Bilgisayar gerekirse yeniden başlatılacak." -ForegroundColor Green
Pause
